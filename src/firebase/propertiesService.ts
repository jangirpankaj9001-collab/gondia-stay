import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './config';
import { PropertyListing, OwnerProfile } from '../types';

export const PROPERTIES_COLLECTION = 'properties';
export const OWNERS_COLLECTION = 'owners';

/**
 * Real-time Firestore listener for the 'properties' collection.
 * Guarantees cross-device data synchronization across all browsers and phones.
 */
export const subscribeToFirestoreProperties = (
  onUpdate: (properties: PropertyListing[]) => void,
  onError: (error: Error) => void
): Unsubscribe | null => {
  if (!db || !isFirebaseConfigured()) {
    console.warn('[GondiaStay] Firestore is not configured yet.');
    return null;
  }

  try {
    const propertiesRef = collection(db, PROPERTIES_COLLECTION);

    // Query collection directly to avoid index requirements and sort in memory
    return onSnapshot(propertiesRef, (snapshot) => {
      const items: PropertyListing[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          ...(data as PropertyListing),
          id: docSnap.id,
          // Normalize status
          status: (data.status || 'pending').toLowerCase() as any,
          occupancyStatus: (data.occupancyStatus || 'AVAILABLE').toUpperCase() as any,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
          latitude: typeof data.latitude === 'number' ? data.latitude : 21.4556,
          longitude: typeof data.longitude === 'number' ? data.longitude : 80.1960
        });
      });

      // Sort newest first
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(items);
    }, (error) => {
      console.error('[GondiaStay] Firestore snapshot subscription error:', error);
      onError(error);
    });
  } catch (error: any) {
    console.error('[GondiaStay] Error subscribing to Firestore collection:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
};

/**
 * Saves a property listing immediately to Cloud Firestore.
 * Requirement 3: Sets every new listing's status to "pending".
 */
export const savePropertyToFirestore = async (
  property: PropertyListing,
  isEdit: boolean
): Promise<string> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firebase Cloud Firestore is not connected. Please verify your Firebase configuration in Settings.');
  }

  const propertiesRef = collection(db, PROPERTIES_COLLECTION);

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
      ownerId: property.ownerId || auth?.currentUser?.uid || 'owner_gondia_primary',
      ...(property.ownerEmail || auth?.currentUser?.email ? { ownerEmail: property.ownerEmail || auth?.currentUser?.email } : {}),
      ownerName: property.ownerName?.trim() || 'Property Owner',
      ownerPhone: property.ownerPhone?.trim() || '+91 98230 12345',
      ownerWhatsappNumber: (property.ownerWhatsappNumber || property.ownerPhone)?.trim() || '+91 98230 12345',
      ownerPreferredContact: property.ownerPreferredContact || 'BOTH',
      latitude: Number(property.latitude) || 21.4556,
      longitude: Number(property.longitude) || 80.1960,
      occupancyStatus: property.occupancyStatus || 'AVAILABLE',
      isFeatured: Boolean(property.isFeatured),
      updatedAt: Date.now()
    };
    try {
      await updateDoc(docRef, updatePayload);
      return property.id;
    } catch (err: any) {
      console.error('[GondiaStay] Error updating property listing in Firestore:', err);
      if (err.code === 'permission-denied') {
        const currentUser = auth?.currentUser;
        const msg = !currentUser
          ? 'Missing or insufficient permissions: Please sign in as a verified landlord to edit listing details and photos.'
          : `Missing or insufficient permissions: Signed in as ${currentUser.email || currentUser.uid}, but this listing belongs to ownerId "${property.ownerId || 'unknown'}", or your deployed Firestore rules require deployment.`;
        throw new Error(msg);
      }
      throw err;
    }
  } else {
    // New submission: strictly set status to 'pending'
    const authenticatedUid = auth?.currentUser?.uid;
    const authenticatedEmail = auth?.currentUser?.email;
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
      ownerId: authenticatedUid || property.ownerId || 'owner_gondia_primary',
      ...(authenticatedEmail || property.ownerEmail ? { ownerEmail: authenticatedEmail || property.ownerEmail } : {}),
      ownerName: property.ownerName || 'Property Owner',
      ownerPhone: property.ownerPhone?.trim() || '+91 98230 12345',
      ownerWhatsappNumber: (property.ownerWhatsappNumber || property.ownerPhone)?.trim() || '+91 98230 12345',
      ownerPreferredContact: property.ownerPreferredContact || 'BOTH',
      status: 'pending', // Requirement 3: set every new listing's status to "pending"
      occupancyStatus: 'AVAILABLE',
      latitude: property.latitude || 21.4556,
      longitude: property.longitude || 80.1960,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFeatured: false
    };

    const docRef = await addDoc(propertiesRef, newDocData);
    return docRef.id;
  }
};

/**
 * Updates rental occupancy status ('AVAILABLE' or 'OCCUPIED') in Firestore.
 * Requirement 5: Keep approval status separate from occupancy status.
 */
export const updatePropertyOccupancyInFirestore = async (
  propertyId: string,
  occupancyStatus: 'AVAILABLE' | 'OCCUPIED'
): Promise<void> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not connected.');
  }

  const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  await updateDoc(docRef, {
    occupancyStatus,
    updatedAt: Date.now()
  });
};

/**
 * Approves or rejects a property listing in Firestore.
 * Updates the listing status to 'approved' or 'rejected'.
 */
export const moderatePropertyInFirestore = async (
  propertyId: string,
  approve: boolean,
  moderatorId: string
): Promise<void> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not connected.');
  }

  const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  const newStatus = approve ? 'approved' : 'rejected';
  
  await updateDoc(docRef, {
    status: newStatus,
    moderatedAt: Date.now(),
    moderatedBy: moderatorId
  });
};

/**
 * Deletes a property listing from Firestore.
 */
export const deletePropertyFromFirestore = async (propertyId: string): Promise<void> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not connected.');
  }
  const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
  await deleteDoc(docRef);
};

/**
 * Saves real owner profile in Cloud Firestore.
 * Requirement 1: Use real owner information stored in Firebase.
 */
export const saveOwnerProfileToFirestore = async (profile: OwnerProfile): Promise<void> => {
  if (!db || !isFirebaseConfigured()) return;
  try {
    const ownerRef = doc(db, OWNERS_COLLECTION, profile.id);
    await setDoc(ownerRef, {
      id: profile.id,
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
          name: data.name || 'Rajesh Sharma',
          phone: data.phone || '+91 98230 12345',
          whatsappNumber: data.whatsappNumber || data.phone || '+91 98230 12345',
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

