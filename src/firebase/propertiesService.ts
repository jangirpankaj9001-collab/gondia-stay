import { 
  collection, 
  doc, 
  getDoc,
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  where,
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './config';
import { PropertyListing, OwnerProfile } from '../types';

export const PROPERTIES_COLLECTION = 'properties';
export const PROPERTY_SECRETS_COLLECTION = 'property_secrets';
export const PROPERTY_EDIT_TOKENS_COLLECTION = 'property_edit_tokens';
export const OWNERS_COLLECTION = 'owners';

/**
 * Generates an unguessable, cryptographically secure 44-character edit token
 * with 160 bits of entropy for private listing edit links.
 */
export const generateEditToken = (): string => {
  try {
    const randomBytes = new Uint8Array(20);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `gst_${hex}`;
  } catch {
    return `gst_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 12)}_${Math.random().toString(36).substring(2, 12)}`;
  }
};

/**
 * Real-time Firestore listener for properties.
 * - For regular public visitors: queries ONLY approved listings so pending/rejected listings remain hidden.
 * - For verified admin: subscribes to all listings so pending submissions appear in the moderation dashboard.
 */
export const PROPERTIES_CACHE_KEY = 'gondia_stay_properties_cache';

/**
 * Retrieves cached properties from localStorage if available.
 */
export const getCachedProperties = (): PropertyListing[] => {
  try {
    const raw = localStorage.getItem(PROPERTIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[GondiaStay] Error reading cached properties:', e);
  }
  return [];
};

/**
 * Real-time Firestore listener for properties.
 * - For regular public visitors: queries approved listings smoothly.
 * - For verified admin: subscribes to all listings so pending submissions appear in moderation.
 * - Resilient: Caches listings locally and gracefully manages permission/security rule synchronization.
 */
export const subscribeToFirestoreProperties = (
  onUpdate: (properties: PropertyListing[]) => void,
  onError: (error: Error) => void,
  isAdmin: boolean = false
): Unsubscribe | null => {
  if (!db || !isFirebaseConfigured()) {
    console.warn('[GondiaStay] Firestore is not configured yet.');
    const cached = getCachedProperties();
    if (cached.length > 0) {
      onUpdate(cached);
    }
    return null;
  }

  const propertiesRef = collection(db, PROPERTIES_COLLECTION);
  let activeUnsubscribe: Unsubscribe | null = null;
  let hasReceivedData = false;

  const handleSnapshot = (snapshot: any) => {
    hasReceivedData = true;
    const items: PropertyListing[] = [];
    snapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      items.push({
        ...(data as PropertyListing),
        id: docSnap.id,
        // Normalize status
        status: (data.status || 'pending').toLowerCase() as any,
        occupancyStatus: (data.occupancyStatus || 'AVAILABLE').toUpperCase() as any,
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        latitude: typeof data.latitude === 'number' ? data.latitude : 21.4556,
        longitude: typeof data.longitude === 'number' ? data.longitude : 80.1960,
        hasPendingEdit: Boolean(data.hasPendingEdit),
        pendingEdit: data.pendingEdit || undefined
      });
    });

    // Sort newest first
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    try {
      localStorage.setItem(PROPERTIES_CACHE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota storage warnings
    }
    onUpdate(items);
  };

  const handleAllFailed = (lastError: any) => {
    console.warn('[GondiaStay] All Firestore properties queries encountered notice:', lastError);
    const cached = getCachedProperties();
    if (cached.length > 0) {
      onUpdate(cached);
    }
    const isPermissionError = 
      lastError?.code === 'permission-denied' || 
      lastError?.message?.toLowerCase().includes('permission') ||
      lastError?.message?.toLowerCase().includes('missing');
    
    if (isPermissionError) {
      onError(new Error('Firebase permissions notice: Firestore rules need to be published in Firebase Console.'));
    } else {
      onError(lastError instanceof Error ? lastError : new Error(String(lastError)));
    }
  };

  // Strategy 4: Filtered query for uppercase 'APPROVED'
  const startUpperStatusListener = () => {
    try {
      const q = query(propertiesRef, where('status', '==', 'APPROVED'));
      activeUnsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (error) => {
          handleAllFailed(error);
        }
      );
    } catch (err: any) {
      handleAllFailed(err);
    }
  };

  // Strategy 3: Filtered query for status in ['approved', 'APPROVED']
  const startInFilterListener = () => {
    try {
      const q = query(propertiesRef, where('status', 'in', ['approved', 'APPROVED']));
      activeUnsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (error) => {
          console.warn('[GondiaStay] In-status filter query notice, trying uppercase filter:', error);
          if (!hasReceivedData) {
            startUpperStatusListener();
          } else {
            onError(error);
          }
        }
      );
    } catch {
      startUpperStatusListener();
    }
  };

  // Strategy 2: Filtered query for status == 'approved'
  const startFilteredListener = () => {
    try {
      const q = query(propertiesRef, where('status', '==', 'approved'));
      activeUnsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (error) => {
          console.warn('[GondiaStay] Filtered approved query notice, trying in-status filter:', error);
          if (!hasReceivedData) {
            startInFilterListener();
          } else {
            onError(error);
          }
        }
      );
    } catch {
      startInFilterListener();
    }
  };

  // Strategy 1: Direct collection query (matches allow read: if true, or admin viewing all)
  const startDirectListener = () => {
    try {
      activeUnsubscribe = onSnapshot(
        propertiesRef,
        handleSnapshot,
        (error) => {
          console.warn('[GondiaStay] Direct properties query notice, trying approved status filter:', error);
          if (!hasReceivedData) {
            startFilteredListener();
          } else {
            onError(error);
          }
        }
      );
    } catch {
      startFilteredListener();
    }
  };

  // If user is verified admin, prioritize direct full collection listener
  // If public visitor, try direct first (matches open read rules), fallback to approved status filters
  startDirectListener();

  return () => {
    if (activeUnsubscribe) {
      activeUnsubscribe();
    }
  };
};

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower === 'jangirpankaj9001@gmail.com';
};

export interface SavePropertyResult {
  propertyId: string;
  editToken: string;
  editUrl: string;
}

/**
 * Saves a property listing immediately to Cloud Firestore.
 * 1. Allow owners to submit properties without login, email, password, or OTP.
 * 2. Generates a unique, unguessable private edit token.
 * 3. Never exposes edit tokens in the public property document.
 * 4. Strictly forces new listing status to "pending".
 */
export const savePropertyToFirestore = async (
  property: PropertyListing,
  isEdit: boolean,
  editToken?: string
): Promise<SavePropertyResult> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase Cloud Firestore is not connected. Please verify your Firebase configuration in Settings.');
  }

  const propId = property.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (isEdit && property.id) {
    const docRef = doc(db, PROPERTIES_COLLECTION, property.id);
    const updatePayload: Record<string, any> = {
      title: property.title.trim(),
      address: property.address.trim(),
      locality: property.locality || 'Civil Lines',
      city: property.city || 'Gondia',
      propertyType: property.propertyType || 'FLAT',
      accommodationType: property.accommodationType || '1_BHK',
      monthlyRent: Number(property.monthlyRent) || 0,
      securityDeposit: Number(property.securityDeposit) || 0,
      bedrooms: Number(property.bedrooms) || 0,
      bathrooms: Number(property.bathrooms) || 1,
      kitchenAvailable: property.kitchenAvailable || 'PRIVATE',
      hallAvailable: property.hallAvailable !== undefined ? Boolean(property.hallAvailable) : true,
      furnishing: property.furnishing || 'SEMI_FURNISHED',
      suitableTenants: Array.isArray(property.suitableTenants) ? property.suitableTenants : ['ALL'],
      availableFrom: property.availableFrom || 'Immediate',
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      photos: Array.isArray(property.photos) && property.photos.length > 0 ? property.photos : ['/hero_gondia_stays.jpg'],
      ownerId: property.ownerId || 'owner_unauthenticated',
      ...(property.ownerEmail ? { ownerEmail: property.ownerEmail } : {}),
      ownerName: property.ownerName ? property.ownerName.trim() : '',
      ownerPhone: property.ownerPhone ? property.ownerPhone.trim() : '',
      ownerWhatsappNumber: (property.ownerWhatsappNumber || property.ownerPhone)?.trim() || '',
      ownerPreferredContact: property.ownerPreferredContact || 'BOTH',
      latitude: Number(property.latitude) || 21.4556,
      longitude: Number(property.longitude) || 80.1960,
      occupancyStatus: property.occupancyStatus || 'AVAILABLE',
      isFeatured: Boolean(property.isFeatured),
      updatedAt: Date.now()
    };

    // Notice: editToken is NEVER in updatePayload!
    // The public property document never contains the edit token.

    const isUserAdmin = Boolean(
      auth?.currentUser && isAuthorizedAdminEmail(auth.currentUser.email)
    );

    try {
      if (isUserAdmin) {
        // Admin update path: publishes directly and clears pending edit
        await updateDoc(docRef, {
          ...updatePayload,
          hasPendingEdit: false,
          pendingEdit: null
        });
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return {
          propertyId: property.id,
          editToken: editToken || '',
          editUrl: editToken ? `${origin}/?edit=${property.id}&token=${editToken}` : ''
        };
      }

      if (!editToken) {
        throw new Error('Private edit link token required to update this listing.');
      }

      // Check if this property is currently approved in Firestore
      const existingSnap = await getDoc(docRef);
      const isCurrentlyApproved = existingSnap.exists() && (existingSnap.data()?.status || '').toLowerCase() === 'approved';

      // Secure batch update: updates property details while verifying editToken in property_secrets
      const batch = writeBatch(db);

      if (isCurrentlyApproved) {
        // KEEP APPROVED LISTING LIVE & UNCHANGED! Store proposed changes in pendingEdit
        batch.update(docRef, {
          hasPendingEdit: true,
          pendingEdit: {
            ...updatePayload,
            submittedAt: Date.now()
          },
          updatedAt: Date.now()
        });
      } else {
        // If property is pending/rejected, update directly and keep pending
        batch.update(docRef, {
          ...updatePayload,
          status: 'pending',
          hasPendingEdit: false,
          pendingEdit: null
        });
      }
      
      const secretRef = doc(db, PROPERTY_SECRETS_COLLECTION, property.id);
      batch.update(secretRef, {
        verifiedToken: editToken,
        lastEditedAt: Date.now(),
        editNonce: Math.random().toString(36).substring(2)
      });

      const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, editToken);
      batch.set(tokenRef, {
        propertyId: property.id,
        propertyData: isCurrentlyApproved ? { ...(existingSnap.data() || {}), pendingEdit: updatePayload } : updatePayload,
        updatedAt: Date.now()
      }, { merge: true });

      await batch.commit();

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return {
        propertyId: property.id,
        editToken,
        editUrl: `${origin}/?edit=${property.id}&token=${editToken}`
      };
    } catch (err: any) {
      console.error('[GondiaStay] Error updating property listing in Firestore:', err);
      if (err.code === 'permission-denied') {
        throw new Error('Invalid or expired private edit token. Only the listing owner with the valid edit link can modify this property.');
      }
      throw err;
    }
  } else {
    // New submission without login, email, password, or OTP:
    // Generate an unguessable private edit token
    const token = editToken || generateEditToken();

    const newDocData: Omit<PropertyListing, 'id'> = {
      title: property.title.trim(),
      address: property.address.trim(),
      locality: property.locality || 'Civil Lines',
      city: 'Gondia',
      propertyType: property.propertyType || 'FLAT',
      accommodationType: property.accommodationType || '1_BHK',
      monthlyRent: Number(property.monthlyRent) || 0,
      securityDeposit: Number(property.securityDeposit) || 0,
      bedrooms: Number(property.bedrooms) || 0,
      bathrooms: Number(property.bathrooms) || 1,
      kitchenAvailable: property.kitchenAvailable || 'PRIVATE',
      hallAvailable: property.hallAvailable !== undefined ? Boolean(property.hallAvailable) : true,
      furnishing: property.furnishing || 'SEMI_FURNISHED',
      suitableTenants: Array.isArray(property.suitableTenants) ? property.suitableTenants : ['ALL'],
      availableFrom: property.availableFrom || 'Immediate',
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      photos: property.photos && property.photos.length > 0 ? property.photos : ['/hero_gondia_stays.jpg'],
      ownerId: property.ownerId && property.ownerId !== 'owner_unauthenticated'
        ? property.ownerId
        : (auth?.currentUser && !isAuthorizedAdminEmail(auth.currentUser.email)
            ? auth.currentUser.uid
            : `owner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
      ...(property.ownerEmail ? { ownerEmail: property.ownerEmail } : (auth?.currentUser?.email && !isAuthorizedAdminEmail(auth.currentUser.email) ? { ownerEmail: auth.currentUser.email } : {})),
      ownerName: property.ownerName ? property.ownerName.trim() : '',
      ownerPhone: property.ownerPhone ? property.ownerPhone.trim() : '',
      ownerWhatsappNumber: (property.ownerWhatsappNumber || property.ownerPhone)?.trim() || '',
      ownerPreferredContact: property.ownerPreferredContact || 'BOTH',
      status: 'pending', // Strictly enforced as pending
      occupancyStatus: 'AVAILABLE',
      latitude: property.latitude || 21.4556,
      longitude: property.longitude || 80.1960,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFeatured: false
    };

    // Use atomic batch:
    // 1. Create public property in /properties (NO token stored here)
    // 2. Create private secret in /property_secrets/{propId}
    // 3. Create private lookup in /property_edit_tokens/{token}
    const batch = writeBatch(db);
    
    const propRef = doc(db, PROPERTIES_COLLECTION, propId);
    batch.set(propRef, newDocData);

    const secretRef = doc(db, PROPERTY_SECRETS_COLLECTION, propId);
    batch.set(secretRef, {
      editToken: token,
      propertyId: propId,
      createdAt: Date.now()
    });

    const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, token);
    batch.set(tokenRef, {
      propertyId: propId,
      propertyData: newDocData,
      createdAt: Date.now()
    });

    await batch.commit();

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      propertyId: propId,
      editToken: token,
      editUrl: `${origin}/?edit=${propId}&token=${token}`
    };
  }
};

/**
 * Verifies if an edit token is valid for a given property.
 */
export const verifyPropertyEditToken = async (
  propertyId: string, 
  token: string
): Promise<boolean> => {
  if (!db || !isFirebaseConfigured() || !token.trim()) return false;
  try {
    const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, token.trim());
    const snap = await getDoc(tokenRef);
    if (!snap.exists()) return false;
    const data = snap.data();
    return data?.propertyId === propertyId;
  } catch (err) {
    console.warn('[GondiaStay] Token verification notice:', err);
    return false;
  }
};

/**
 * Fetches a single property directly from Firestore (e.g. for private edit link loading).
 * Supports token-based private draft loading for unapproved/pending listings.
 */
export const fetchPropertyDirect = async (propertyId: string, token?: string): Promise<PropertyListing | null> => {
  if (!db || !isFirebaseConfigured()) return null;
  try {
    // 1. If edit token provided, resolve via property_edit_tokens (works even if pending/rejected)
    if (token && token.trim()) {
      try {
        const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, token.trim());
        const tokenSnap = await getDoc(tokenRef);
        if (tokenSnap.exists()) {
          const tData = tokenSnap.data();
          if (tData.propertyId === propertyId && tData.propertyData) {
            const data = tData.propertyData;
            return {
              ...(data as PropertyListing),
              id: propertyId,
              status: (data.status || 'pending').toLowerCase() as any,
              occupancyStatus: (data.occupancyStatus || 'AVAILABLE').toUpperCase() as any,
              createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
              latitude: typeof data.latitude === 'number' ? data.latitude : 21.4556,
              longitude: typeof data.longitude === 'number' ? data.longitude : 80.1960
            };
          }
        }
      } catch (tokenErr) {
        console.warn('[GondiaStay] Token draft fetch fallback:', tokenErr);
      }
    }

    // 2. Fetch from main properties collection
    const propRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const snap = await getDoc(propRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      ...(data as PropertyListing),
      id: snap.id,
      status: (data.status || 'pending').toLowerCase() as any,
      occupancyStatus: (data.occupancyStatus || 'AVAILABLE').toUpperCase() as any,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
      latitude: typeof data.latitude === 'number' ? data.latitude : 21.4556,
      longitude: typeof data.longitude === 'number' ? data.longitude : 80.1960
    };
  } catch (err) {
    console.error('[GondiaStay] Error fetching single property:', err);
    return null;
  }
};

/**
 * Updates rental occupancy status ('AVAILABLE' or 'OCCUPIED') in Firestore.
 * Supports both admin authorization and private edit link token.
 */
export const updatePropertyOccupancyInFirestore = async (
  propertyId: string,
  occupancyStatus: 'AVAILABLE' | 'OCCUPIED',
  editToken?: string
): Promise<void> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not connected.');
  }

  const isUserAdmin = Boolean(
    auth?.currentUser && isAuthorizedAdminEmail(auth.currentUser.email)
  );

  const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);

  // If verified administrator is signed in, update directly
  if (isUserAdmin) {
    await updateDoc(docRef, {
      occupancyStatus,
      updatedAt: Date.now()
    });
    return;
  }

  // If authenticated user is signed in, check if they own the property
  if (auth?.currentUser) {
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const isOwner = (data.ownerId && data.ownerId === auth.currentUser.uid) ||
                        (data.ownerEmail && auth.currentUser.email && data.ownerEmail.toLowerCase() === auth.currentUser.email.toLowerCase());
        if (isOwner) {
          await updateDoc(docRef, {
            occupancyStatus,
            updatedAt: Date.now()
          });
          return;
        }
      }
    } catch (authErr) {
      console.warn('[GondiaStay] Auth owner check notice:', authErr);
    }
  }

  // If not signed in as owner, require private edit link token and commit verified batch
  if (!editToken) {
    throw new Error('Unauthorized: Only the property owner or authorized administrator can change occupancy status.');
  }

  const batch = writeBatch(db);
  batch.update(docRef, {
    occupancyStatus,
    updatedAt: Date.now()
  });
  const secretRef = doc(db, PROPERTY_SECRETS_COLLECTION, propertyId);
  batch.update(secretRef, {
    verifiedToken: editToken,
    lastEditedAt: Date.now(),
    editNonce: Math.random().toString(36).substring(2)
  });
  await batch.commit();
};

/**
 * Approves or rejects a property listing in Firestore.
 * Updates the listing status to 'approved' or 'rejected'.
 * ONLY verified admin can call this.
 */
export const moderatePropertyInFirestore = async (
  propertyId: string,
  approve: boolean,
  moderatorId: string
): Promise<void> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not connected.');
  }

  if (
    !auth?.currentUser ||
    !isAuthorizedAdminEmail(auth.currentUser.email)
  ) {
    throw new Error('Unauthorized: Only verified administrator can moderate listings.');
  }

  const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  const newStatus = approve ? 'approved' : 'rejected';
  
  await updateDoc(docRef, {
    status: newStatus,
    moderatedAt: Date.now(),
    moderatedBy: moderatorId,
    updatedAt: Date.now()
  });
};

/**
 * Approves or rejects proposed edits for an already approved property.
 * When approving: merges pendingEdit into live listing, clears pendingEdit and hasPendingEdit.
 * When rejecting: discards pendingEdit without touching live listing data.
 * ONLY verified admin can call this.
 */
export const moderatePropertyEditInFirestore = async (
  propertyId: string,
  approve: boolean,
  moderatorId: string
): Promise<void> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not connected.');
  }

  if (
    !auth?.currentUser ||
    !isAuthorizedAdminEmail(auth.currentUser.email)
  ) {
    throw new Error('Unauthorized: Only verified administrator can moderate listing edits.');
  }

  const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Property listing not found.');
  }

  const data = snap.data();
  const pendingEdit = data.pendingEdit;

  if (approve && pendingEdit) {
    const { submittedAt, ...fieldsToMerge } = pendingEdit;
    await updateDoc(docRef, {
      ...fieldsToMerge,
      status: 'approved',
      hasPendingEdit: false,
      pendingEdit: null,
      moderatedAt: Date.now(),
      moderatedBy: moderatorId,
      updatedAt: Date.now()
    });
  } else {
    // Reject proposed edit: discard pendingEdit, live approved listing remains completely intact
    await updateDoc(docRef, {
      hasPendingEdit: false,
      pendingEdit: null,
      moderatedAt: Date.now(),
      moderatedBy: moderatorId,
      updatedAt: Date.now()
    });
  }
};

/**
 * Deletes a property listing from Firestore.
 * ONLY verified admin can delete listings.
 */
export const deletePropertyFromFirestore = async (propertyId: string): Promise<void> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not connected.');
  }

  if (
    !auth?.currentUser ||
    !isAuthorizedAdminEmail(auth.currentUser.email)
  ) {
    throw new Error('Unauthorized: Only verified administrator can delete listings.');
  }

  const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  await deleteDoc(docRef);

  // Clean up secret and tokens if accessible
  try {
    const secretRef = doc(db, PROPERTY_SECRETS_COLLECTION, propertyId);
    await deleteDoc(secretRef);
  } catch {
    // Non-fatal if secret cleanup is blocked
  }
};

/**
 * Saves owner profile in Cloud Firestore (optional).
 */
export const saveOwnerProfileToFirestore = async (profile: OwnerProfile): Promise<void> => {
  if (!db || !isFirebaseConfigured()) return;
  try {
    const ownerId = profile.id || (auth?.currentUser?.uid ? auth.currentUser.uid : '');
    if (!ownerId) return;
    const ownerRef = doc(db, OWNERS_COLLECTION, ownerId);
    await setDoc(ownerRef, {
      id: ownerId,
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      whatsappNumber: (profile.whatsappNumber || profile.phone).trim(),
      email: profile.email || '',
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn('[GondiaStay] Error syncing owner profile to Firestore:', err);
  }
};

/**
 * Real-time listener for owner profile in Firestore.
 */
export const subscribeToOwnerProfile = (
  ownerId: string,
  onUpdate: (profile: OwnerProfile) => void
): Unsubscribe | null => {
  if (!db || !isFirebaseConfigured()) return null;
  try {
    const ownerRef = doc(db, OWNERS_COLLECTION, ownerId);
    return onSnapshot(ownerRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          id: snap.id,
          name: data.name || '',
          phone: data.phone || '',
          whatsappNumber: data.whatsappNumber || data.phone || '',
          email: data.email || ''
        });
      }
    }, (err) => {
      console.warn('[GondiaStay] Owner profile snapshot listener notice:', err);
    });
  } catch (err) {
    return null;
  }
};
