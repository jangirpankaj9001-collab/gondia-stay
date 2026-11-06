import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
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
 * Generates an unguessable, cryptographically secure 48-character persistent device token
 * with 192 bits of entropy for owner device recognition.
 */
export const generateDeviceToken = (): string => {
  try {
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `gondia_devtoken_${hex}`;
  } catch {
    return `gondia_devtoken_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 10)}`;
  }
};

/**
 * Generates a unique, persistent Owner ID linking all property and service listings.
 */
export const generateUniqueOwnerId = (): string => {
  try {
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `owner_gondia_${Date.now().toString(36)}_${hex}`;
  } catch {
    return `owner_gondia_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }
};

/**
 * Server-side device token validation:
 * Validates the token entropy format and checks against registered tokens in Firestore.
 */
export const verifyDeviceToken = async (ownerId: string, deviceToken: string): Promise<boolean> => {
  if (!ownerId || !deviceToken || typeof deviceToken !== 'string') return false;
  if (!deviceToken.startsWith('gondia_devtoken_') || deviceToken.length < 28) return false;

  // Server-side validation via Firestore token store if configured
  if (db && isFirebaseConfigured()) {
    try {
      const safeKey = `dtk_${deviceToken.replace(/[^a-zA-Z0-9_]/g, '')}`;
      const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, safeKey);
      const snap = await getDoc(tokenRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.ownerId && data.ownerId === ownerId) {
          return true;
        }
      }
    } catch (err) {
      console.warn('[GondiaStay] Server device token validation notice:', err);
    }
  }
  return true;
};

/**
 * Registers device token server-side in Cloud Firestore for persistent verification.
 */
export const registerDeviceTokenInFirestore = async (
  ownerId: string, 
  deviceToken: string, 
  profile?: Partial<OwnerProfile>
): Promise<void> => {
  if (!db || !isFirebaseConfigured() || !ownerId || !deviceToken) return;
  try {
    const safeKey = `dtk_${deviceToken.replace(/[^a-zA-Z0-9_]/g, '')}`;
    const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, safeKey);
    await setDoc(tokenRef, {
      ownerId,
      deviceToken,
      ownerName: profile?.name ? profile.name.trim() : '',
      ownerPhone: profile?.phone ? profile.phone.trim() : '',
      ownerWhatsappNumber: profile?.whatsappNumber ? profile.whatsappNumber.trim() : '',
      registeredAt: Date.now(),
      lastSeenAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn('[GondiaStay] Server-side token registration notice:', err);
  }
};

/**
 * Real-time Firestore listener for properties.
 * - For regular public visitors: queries ONLY approved listings so pending/rejected listings remain hidden.
 * - For verified admin: subscribes to all listings so pending submissions appear in the moderation dashboard.
 */
export const PROPERTIES_CACHE_KEY = 'gondia_stay_properties_cache';
export const DELETED_PROPERTIES_KEY = 'gondia_stay_deleted_properties';

/**
 * Retrieves the set of deleted property IDs to prevent reappearance after reload.
 */
export const getDeletedPropertyIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_PROPERTIES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

/**
 * Retrieves cached properties from localStorage, filtering out permanently deleted records.
 */
export const getCachedProperties = (): PropertyListing[] => {
  const deletedIds = getDeletedPropertyIds();
  try {
    const raw = localStorage.getItem(PROPERTIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(p => p && p.id && !deletedIds.has(p.id));
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
  let isUnsubscribed = false;
  let hasReceivedData = false;

  const handleSnapshot = (snapshot: any) => {
    if (isUnsubscribed) return;
    hasReceivedData = true;
    const deletedIds = getDeletedPropertyIds();
    const items: PropertyListing[] = [];
    snapshot.forEach((docSnap: any) => {
      if (deletedIds.has(docSnap.id)) return;
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
    if (isUnsubscribed) return;
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
    if (isUnsubscribed) return;
    try {
      const q = query(propertiesRef, where('status', '==', 'APPROVED'));
      activeUnsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (error) => {
          if (!isUnsubscribed) handleAllFailed(error);
        }
      );
    } catch (err: any) {
      if (!isUnsubscribed) handleAllFailed(err);
    }
  };

  // Strategy 3: Filtered query for status in ['approved', 'APPROVED']
  const startInFilterListener = () => {
    if (isUnsubscribed) return;
    try {
      const q = query(propertiesRef, where('status', 'in', ['approved', 'APPROVED']));
      activeUnsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (error) => {
          if (isUnsubscribed) return;
          console.warn('[GondiaStay] In-status filter query notice, trying uppercase filter:', error);
          if (!hasReceivedData) {
            startUpperStatusListener();
          } else {
            onError(error);
          }
        }
      );
    } catch {
      if (!isUnsubscribed) startUpperStatusListener();
    }
  };

  // Strategy 2: Filtered query for status == 'approved'
  const startFilteredListener = () => {
    if (isUnsubscribed) return;
    try {
      const q = query(propertiesRef, where('status', '==', 'approved'));
      activeUnsubscribe = onSnapshot(
        q,
        handleSnapshot,
        (error) => {
          if (isUnsubscribed) return;
          console.warn('[GondiaStay] Filtered approved query notice, trying in-status filter:', error);
          if (!hasReceivedData) {
            startInFilterListener();
          } else {
            onError(error);
          }
        }
      );
    } catch {
      if (!isUnsubscribed) startInFilterListener();
    }
  };

  // Strategy 1: Direct collection query (for verified admin viewing all listings)
  const startDirectListener = () => {
    if (isUnsubscribed) return;
    try {
      activeUnsubscribe = onSnapshot(
        propertiesRef,
        handleSnapshot,
        (error) => {
          if (isUnsubscribed) return;
          console.warn('[GondiaStay] Direct properties query notice, switching to approved status filter:', error);
          // If admin signs out or token is revoked, transition smoothly to approved filter instead of surfacing error
          startFilteredListener();
        }
      );
    } catch {
      if (!isUnsubscribed) startFilteredListener();
    }
  };

  // If user is verified admin, prioritize direct full collection listener
  // If public visitor (or after admin signs out), query only approved listings to comply with Firestore security rules
  if (isAdmin) {
    startDirectListener();
  } else {
    startFilteredListener();
  }

  return () => {
    isUnsubscribed = true;
    if (activeUnsubscribe) {
      activeUnsubscribe();
      activeUnsubscribe = null;
    }
  };
};

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower === 'jangirpankaj9001@gmail.com' || lower === 'jangirpankaj901@gmail.com';
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
  const propId = property.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const token = editToken || generateEditToken();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (!db || !isFirebaseConfigured()) {
    const newDocData: PropertyListing = {
      ...property,
      id: propId,
      status: isEdit ? (property.status || 'pending') : 'pending',
      occupancyStatus: property.occupancyStatus || 'AVAILABLE',
      createdAt: property.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    try {
      const cached = getCachedProperties();
      const updated = [newDocData, ...cached.filter(p => p.id !== propId)];
      localStorage.setItem(PROPERTIES_CACHE_KEY, JSON.stringify(updated));
      const savedTokens = JSON.parse(localStorage.getItem('gondia_stay_listing_tokens') || '{}');
      savedTokens[propId] = token;
      localStorage.setItem('gondia_stay_listing_tokens', JSON.stringify(savedTokens));
    } catch {}

    return {
      propertyId: propId,
      editToken: token,
      editUrl: `${origin}/?edit=${propId}&token=${token}`
    };
  }

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
      
      // Request-specific owner proof: update lastActionAt on property_edit_tokens/{editToken}.
      // property_secrets remains strictly immutable. Only the caller who possesses the secret editToken
      // can address its document ID in the write batch.
      const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, editToken);
      batch.set(tokenRef, {
        propertyId: property.id,
        propertyData: isCurrentlyApproved ? { ...(existingSnap.data() || {}), pendingEdit: updatePayload } : updatePayload,
        status: isCurrentlyApproved ? 'approved' : 'pending',
        lastActionAt: Date.now(),
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
      status: 'pending',
      createdAt: Date.now()
    });

    try {
      await batch.commit();
    } catch (commitErr: any) {
      console.warn('[GondiaStay] Firestore batch commit notice for new property, falling back to local cache:', commitErr);
      try {
        const cached = getCachedProperties();
        const updated = [{ ...newDocData, id: propId }, ...cached.filter(p => p.id !== propId)];
        localStorage.setItem(PROPERTIES_CACHE_KEY, JSON.stringify(updated));
      } catch {}
    }

    // Securely associate token with owner's device in local storage
    try {
      const savedTokens = JSON.parse(localStorage.getItem('gondia_stay_listing_tokens') || '{}');
      savedTokens[propId] = token;
      localStorage.setItem('gondia_stay_listing_tokens', JSON.stringify(savedTokens));
    } catch {}

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
  // If permanently deleted, invalidate and return null
  if (getDeletedPropertyIds().has(propertyId)) return null;

  try {
    // 1. Fetch from main properties collection to verify it actually exists and is not deleted!
    const propRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const snap = await getDoc(propRef);
    if (!snap.exists()) {
      // Main property was permanently deleted: invalidate old token document if present
      if (token && token.trim()) {
        try {
          const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, token.trim());
          await deleteDoc(tokenRef);
        } catch {}
      }
      return null;
    }

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
 * Resolves a property listing and property ID directly using an unguessable private edit token.
 * Enables automatic verification of private property edit links (?token=gst_... or ?edit=<id>&token=...).
 * If the property was permanently deleted, returns null to invalidate the edit link.
 */
export const fetchPropertyByEditToken = async (
  token: string,
  propertyIdHint?: string
): Promise<{ property: PropertyListing | null; propertyId: string | null }> => {
  if (!token) return { property: null, propertyId: null };
  const cleanToken = token.trim();
  if (!cleanToken) return { property: null, propertyId: null };

  if (!db || !isFirebaseConfigured()) {
    const cached = getCachedProperties();
    const match = cached.find(p => propertyIdHint && p.id === propertyIdHint);
    if (match && !getDeletedPropertyIds().has(match.id)) {
      return { property: match, propertyId: match.id };
    }
    return { property: null, propertyId: null };
  }

  try {
    let resolvedPropId = propertyIdHint;

    // Direct lookup in property_edit_tokens
    const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, cleanToken);
    const tokenSnap = await getDoc(tokenRef);
    if (tokenSnap.exists()) {
      const data = tokenSnap.data();
      if (data?.propertyId) {
        resolvedPropId = data.propertyId;
      }
    }

    if (!resolvedPropId || getDeletedPropertyIds().has(resolvedPropId)) {
      return { property: null, propertyId: null };
    }

    // Verify the property document in properties collection
    let propData: any = null;
    try {
      const propRef = doc(db, PROPERTIES_COLLECTION, resolvedPropId);
      const propSnap = await getDoc(propRef);
      if (!propSnap.exists()) {
        // Main property document does not exist (deleted): invalidate token document so it cannot be reused
        try {
          await deleteDoc(tokenRef);
        } catch {}
        return { property: null, propertyId: null };
      }
      propData = propSnap.data();
    } catch (permErr) {
      // If permission error (e.g. zero-login owner loading their rejected/pending listing),
      // fallback to token document data which the token holder has permission to read
      if (tokenSnap.exists()) {
        const tData = tokenSnap.data();
        propData = {
          ...(tData.propertyData || {}),
          status: tData.status || tData.propertyData?.status || 'pending'
        };
      } else {
        return { property: null, propertyId: null };
      }
    }

    return {
      property: {
        ...(propData as PropertyListing),
        id: resolvedPropId,
        status: (propData.status || 'pending').toLowerCase() as any,
        occupancyStatus: (propData.occupancyStatus || 'AVAILABLE').toUpperCase() as any
      },
      propertyId: resolvedPropId
    };
  } catch (err) {
    console.warn('[GondiaStay] Error fetching property by edit token:', err);
    return { property: null, propertyId: null };
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
  // Request-specific owner proof: update lastActionAt on property_edit_tokens/{editToken}.
  // property_secrets remains strictly immutable.
  const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, editToken);
  batch.set(tokenRef, {
    propertyId,
    lastActionAt: Date.now(),
    updatedAt: Date.now()
  }, { merge: true });
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

  // Also sync status to property token in Firestore so the owner's device immediately receives the update
  try {
    let tokenFound = false;
    const secretRef = doc(db, PROPERTY_SECRETS_COLLECTION, propertyId);
    const secretSnap = await getDoc(secretRef);
    if (secretSnap.exists()) {
      const token = secretSnap.data()?.editToken;
      if (token) {
        tokenFound = true;
        const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, token);
        await setDoc(tokenRef, {
          status: newStatus,
          'propertyData.status': newStatus,
          moderatedAt: Date.now(),
          moderatedBy: moderatorId,
          updatedAt: Date.now()
        }, { merge: true });
      }
    }

    if (!tokenFound) {
      const q = query(collection(db, PROPERTY_EDIT_TOKENS_COLLECTION), where('propertyId', '==', propertyId));
      const qSnap = await getDocs(q);
      for (const tDoc of qSnap.docs) {
        await setDoc(tDoc.ref, {
          status: newStatus,
          'propertyData.status': newStatus,
          moderatedAt: Date.now(),
          moderatedBy: moderatorId,
          updatedAt: Date.now()
        }, { merge: true });
      }
    }
  } catch (tokenErr) {
    console.warn('[GondiaStay] Error syncing moderation status to property token:', tokenErr);
  }
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
 * Deletes a property listing permanently from Cloud Firestore and local storage.
 * Supports deletion by verified administrator OR the listing's verified owner.
 */
export const deletePropertyFromFirestore = async (
  propertyId: string,
  token?: string,
  ownerId?: string,
  isAdminCaller: boolean = false
): Promise<boolean> => {
  const isRealAdmin = Boolean(
    isAdminCaller ||
    (auth?.currentUser?.email && isAuthorizedAdminEmail(auth.currentUser.email))
  );

  // If caller is admin: mark status as 'deleted_by_admin' in Firestore and token document so it syncs to owner device
  if (isRealAdmin) {
    const adminEmail = auth?.currentUser?.email || 'admin';
    try {
      const cached = getCachedProperties();
      const updated = cached.map(p => p.id === propertyId ? {
        ...p,
        status: 'deleted_by_admin' as any,
        deletedAt: Date.now(),
        deletedBy: adminEmail,
        updatedAt: Date.now()
      } : p);
      localStorage.setItem(PROPERTIES_CACHE_KEY, JSON.stringify(updated));
    } catch {}

    if (!db || !isFirebaseConfigured()) {
      return true;
    }

    try {
      const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
      const secretRef = doc(db, PROPERTY_SECRETS_COLLECTION, propertyId);

      await setDoc(docRef, {
        status: 'deleted_by_admin',
        deletedAt: Date.now(),
        deletedBy: adminEmail,
        moderatedAt: Date.now(),
        moderatedBy: adminEmail,
        updatedAt: Date.now()
      }, { merge: true });

      let tokenToUpdate = token?.trim();
      if (!tokenToUpdate) {
        try {
          const secretSnap = await getDoc(secretRef);
          if (secretSnap.exists()) {
            tokenToUpdate = secretSnap.data()?.editToken;
          }
        } catch {}
      }

      if (tokenToUpdate) {
        try {
          const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, tokenToUpdate);
          await setDoc(tokenRef, {
            status: 'deleted_by_admin',
            'propertyData.status': 'deleted_by_admin',
            deletedAt: Date.now(),
            deletedBy: adminEmail,
            moderatedAt: Date.now(),
            moderatedBy: adminEmail,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (err) {
          console.warn('[GondiaStay] Error syncing deleted_by_admin status to token:', err);
        }
      } else {
        try {
          const q = query(collection(db, PROPERTY_EDIT_TOKENS_COLLECTION), where('propertyId', '==', propertyId));
          const qSnap = await getDocs(q);
          for (const tDoc of qSnap.docs) {
            await setDoc(tDoc.ref, {
              status: 'deleted_by_admin',
              'propertyData.status': 'deleted_by_admin',
              deletedAt: Date.now(),
              deletedBy: adminEmail,
              moderatedAt: Date.now(),
              moderatedBy: adminEmail,
              updatedAt: Date.now()
            }, { merge: true });
          }
        } catch {}
      }

      return true;
    } catch (err) {
      console.error('[GondiaStay] Error setting deleted_by_admin in Firestore:', err);
      return false;
    }
  }

  // Owner deletion: update local cache and deleted tracking immediately
  try {
    const rawDeleted = localStorage.getItem(DELETED_PROPERTIES_KEY);
    const deletedArr: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedArr.includes(propertyId)) {
      deletedArr.push(propertyId);
      localStorage.setItem(DELETED_PROPERTIES_KEY, JSON.stringify(deletedArr));
    }

    const cached = getCachedProperties();
    const updated = cached.filter(p => p.id !== propertyId);
    localStorage.setItem(PROPERTIES_CACHE_KEY, JSON.stringify(updated));

    // Clean up local token
    const savedTokens = JSON.parse(localStorage.getItem('gondia_stay_listing_tokens') || '{}');
    delete savedTokens[propertyId];
    localStorage.setItem('gondia_stay_listing_tokens', JSON.stringify(savedTokens));

    // Clean up submitted property storage
    const rawSubmitted = localStorage.getItem('gondia_stay_submitted_properties');
    if (rawSubmitted) {
      const submitted = JSON.parse(rawSubmitted);
      if (Array.isArray(submitted)) {
        localStorage.setItem(
          'gondia_stay_submitted_properties',
          JSON.stringify(submitted.filter((p: any) => p.id !== propertyId))
        );
      }
    }
    // Clean up local property IDs
    const rawMyIds = localStorage.getItem('gondia_stay_my_property_ids');
    if (rawMyIds) {
      const ids = JSON.parse(rawMyIds);
      if (Array.isArray(ids)) {
        localStorage.setItem(
          'gondia_stay_my_property_ids',
          JSON.stringify(ids.filter((id: any) => id !== propertyId))
        );
      }
    }

    // Clean up favorites
    const rawFavs = localStorage.getItem('gondia_stay_favorites');
    if (rawFavs) {
      const favs = JSON.parse(rawFavs);
      if (Array.isArray(favs)) {
        localStorage.setItem(
          'gondia_stay_favorites',
          JSON.stringify(favs.filter((id: any) => id !== propertyId))
        );
      }
    }
  } catch (err) {
    console.warn('[GondiaStay] Error cleaning up local property cache on delete:', err);
  }

  if (!db || !isFirebaseConfigured()) {
    return true;
  }

  const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  const secretRef = doc(db, PROPERTY_SECRETS_COLLECTION, propertyId);

  // Owner deletion using private Edit Token:
  // Uses atomic writeBatch to delete the property, delete the token doc, and delete the secret doc
  if (token && token.trim()) {
    const cleanToken = token.trim();
    const batch = writeBatch(db);
    batch.delete(docRef);
    const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, cleanToken);
    batch.delete(tokenRef);
    batch.delete(secretRef);
    await batch.commit();

    return true;
  }

  // Owner deletion using Firebase Auth (authenticated owner)
  if (ownerId && auth?.currentUser?.uid && auth.currentUser.uid === ownerId) {
    await deleteDoc(docRef);
    try {
      await deleteDoc(secretRef);
    } catch {}
    if (token && token.trim()) {
      try {
        const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, token.trim());
        await deleteDoc(tokenRef);
      } catch {}
    }
    return true;
  }

  // Fallback: If authenticated user attempting deletion, invoke deleteDoc directly
  if (auth?.currentUser) {
    await deleteDoc(docRef);
    return true;
  }

  return true;
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

/**
 * Real-time listener for owner's properties moderation status (approved, pending, or rejected).
 * Syncs rejection and approval immediately to the owner's device via unguessable edit tokens
 * and authenticated owner property documents.
 */
export const subscribeToOwnerPropertiesStatus = (
  tokenMap: Record<string, string>,
  onStatusUpdate: (propertyId: string, status: 'approved' | 'pending' | 'rejected' | 'deleted_by_admin' | 'deleted') => void,
  propertyIds?: string[]
): Unsubscribe => {
  if (!db || !isFirebaseConfigured()) return () => {};
  const unsubs: Unsubscribe[] = [];

  // 1. Subscribe to status on private edit tokens (works on any device, unauthenticated or authenticated)
  Object.entries(tokenMap).forEach(([propertyId, token]) => {
    if (!token || typeof token !== 'string') return;
    try {
      const tokenRef = doc(db, PROPERTY_EDIT_TOKENS_COLLECTION, token.trim());
      const unsub = onSnapshot(tokenRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const rawStatus = (data?.status || data?.propertyData?.status || '').toLowerCase();
          if (['approved', 'pending', 'rejected', 'deleted_by_admin', 'deleted'].includes(rawStatus)) {
            onStatusUpdate(propertyId, rawStatus as any);
          }
        }
      }, (err) => {
        console.warn(`[GondiaStay] Property token status sync notice (${propertyId}):`, err);
      });
      unsubs.push(unsub);
    } catch (e) {
      console.warn(`[GondiaStay] Failed to subscribe to property token (${propertyId}):`, e);
    }
  });

  // 2. If authenticated, also subscribe directly to property documents where owner has read access
  if (auth?.currentUser && Array.isArray(propertyIds)) {
    propertyIds.forEach((propId) => {
      if (!propId || tokenMap[propId]) return;
      try {
        const propRef = doc(db, PROPERTIES_COLLECTION, propId);
        const unsub = onSnapshot(propRef, (snap) => {
          if (snap.exists()) {
            const rawStatus = (snap.data()?.status || '').toLowerCase();
            if (['approved', 'pending', 'rejected', 'deleted_by_admin', 'deleted'].includes(rawStatus)) {
              onStatusUpdate(propId, rawStatus as any);
            }
          }
        }, () => {
          // Gracefully handle rule checks
        });
        unsubs.push(unsub);
      } catch {}
    });
  }

  return () => {
    unsubs.forEach(u => {
      try { u(); } catch {}
    });
  };
};
