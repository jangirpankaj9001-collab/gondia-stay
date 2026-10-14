import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { PropertyListing } from '../types';

export const PROPERTIES_COLLECTION = 'properties';

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
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now()
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
      propertyType: property.propertyType || 'FLAT',
      monthlyRent: Number(property.monthlyRent) || 0,
      securityDeposit: Number(property.securityDeposit) || 0,
      bedrooms: Number(property.bedrooms) || 0,
      bathrooms: Number(property.bathrooms) || 1,
      furnishing: property.furnishing || 'SEMI_FURNISHED',
      availableFrom: property.availableFrom || 'Immediate',
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      photos: property.photos && property.photos.length > 0 ? property.photos : ['/hero_gondia_stays.jpg'],
      ownerPhone: property.ownerPhone || '',
      ownerPreferredContact: property.ownerPreferredContact || 'BOTH',
      isFeatured: Boolean(property.isFeatured),
    };
    await updateDoc(docRef, updatePayload);
    return property.id;
  } else {
    // New submission: strictly set status to 'pending'
    const newDocData: Omit<PropertyListing, 'id'> = {
      title: property.title.trim(),
      address: property.address.trim(),
      locality: property.locality || 'Civil Lines',
      city: 'Gondia',
      propertyType: property.propertyType || 'FLAT',
      monthlyRent: Number(property.monthlyRent) || 0,
      securityDeposit: Number(property.securityDeposit) || 0,
      bedrooms: Number(property.bedrooms) || 0,
      bathrooms: Number(property.bathrooms) || 1,
      furnishing: property.furnishing || 'SEMI_FURNISHED',
      availableFrom: property.availableFrom || 'Immediate',
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      photos: property.photos && property.photos.length > 0 ? property.photos : ['/hero_gondia_stays.jpg'],
      ownerId: property.ownerId || 'owner_gondia',
      ownerName: property.ownerName || 'Property Owner',
      ownerPhone: property.ownerPhone || '',
      ownerPreferredContact: property.ownerPreferredContact || 'BOTH',
      status: 'pending', // Requirement 3: set every new listing's status to "pending"
      latitude: property.latitude || 21.4550,
      longitude: property.longitude || 80.1920,
      createdAt: Date.now(),
      isFeatured: false
    };

    const docRef = await addDoc(propertiesRef, newDocData);
    return docRef.id;
  }
};

/**
 * Approves or rejects a property listing in Firestore.
 * Updates the listing status to 'approved' or 'rejected'.
 */
export const moderatePropertyInFirestore = async (
  propertyId: string,
  approve: boolean,
  moderatorId: string,
  ownerId?: string
): Promise<void> => {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Cloud Firestore is not connected.');
  }

  // Prevent users from approving their own listings
  if (ownerId && moderatorId === ownerId) {
    throw new Error('Security Violation: Listing owners cannot approve their own listings.');
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
