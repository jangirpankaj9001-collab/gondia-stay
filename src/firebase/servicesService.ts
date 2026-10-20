/**
 * Firebase Firestore Data Layer for GondiaStay Local Services.
 * Supports categories: Mess/Tiffin (highlighted), Maid, Housekeeping, Laundry, Electrician, Plumber, Water Cans, Security.
 * 
 * Rules & Architecture:
 * - Public users only receive 'approved' services.
 * - All new submissions default to 'pending' status.
 * - Authenticated admin receives all submissions and can approve, reject, or delete.
 * - Resilient with local caching and offline graceful fallback.
 */

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { ServiceItem, ServiceCategory } from '../types';
import { INITIAL_SERVICES } from '../data/initialData';

export const SERVICES_COLLECTION = 'services';
export const SERVICES_CACHE_KEY = 'gondia_stay_services_cache';

/**
 * Retrieves cached services from localStorage or returns verified initial services.
 */
export const getCachedServices = (): ServiceItem[] => {
  try {
    const raw = localStorage.getItem(SERVICES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[GondiaStay] Error reading services cache:', err);
  }
  return INITIAL_SERVICES;
};

/**
 * Real-time Firestore listener for GondiaStay services.
 * - For regular public visitors: queries approved listings smoothly.
 * - For verified admin: subscribes to all listings so pending submissions appear in moderation console.
 * - Resilient: Caches listings locally and gracefully manages permission/security rule synchronization.
 */
export const subscribeToFirestoreServices = (
  onUpdate: (services: ServiceItem[]) => void,
  onError: (error: Error) => void,
  isAdmin: boolean = false
): Unsubscribe | null => {
  if (!db || !isFirebaseConfigured()) {
    console.warn('[GondiaStay] Firestore is not configured yet for services.');
    const cached = getCachedServices();
    onUpdate(cached);
    return null;
  }

  const servicesRef = collection(db, SERVICES_COLLECTION);
  let activeUnsubscribe: Unsubscribe | null = null;
  let hasReceivedData = false;

  const handleSnapshot = (snapshot: any) => {
    hasReceivedData = true;
    const items: ServiceItem[] = [];
    snapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      items.push({
        ...(data as ServiceItem),
        id: docSnap.id,
        // Normalize status
        status: (data.status || 'pending').toLowerCase() as any,
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        photos: Array.isArray(data.photos) ? data.photos : [],
        serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas : ['All Gondia']
      });
    });

    // If Firestore has services, use them; if brand new empty collection, merge/seed initial services
    let merged = items;
    if (items.length === 0 && !isAdmin) {
      merged = INITIAL_SERVICES;
    } else if (items.length > 0) {
      // Merge with initial services to ensure all 8 categories are represented if not yet seeded
      const existingIds = new Set(items.map(s => s.id));
      const missingInitial = INITIAL_SERVICES.filter(init => !existingIds.has(init.id));
      merged = [...items, ...missingInitial];
    }

    // Sort: Featured first, then newest
    merged.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    try {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(merged));
    } catch {
      // Ignore quota warnings
    }

    onUpdate(merged);
  };

  const handleQueryError = (err: any) => {
    console.warn('[GondiaStay] Firestore services query notice:', err);
    const cached = getCachedServices();
    onUpdate(cached);
    
    // Don't toast permission error if cached data is served seamlessly
    if (!hasReceivedData) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  try {
    if (isAdmin) {
      // Admin sees all submissions including pending & rejected
      activeUnsubscribe = onSnapshot(
        servicesRef,
        handleSnapshot,
        (error) => {
          // If direct snapshot fails, attempt status in filter
          try {
            const q = query(servicesRef, where('status', 'in', ['pending', 'approved', 'rejected', 'PENDING', 'APPROVED', 'REJECTED']));
            activeUnsubscribe = onSnapshot(q, handleSnapshot, handleQueryError);
          } catch {
            handleQueryError(error);
          }
        }
      );
    } else {
      // Public visitors: only approved services
      try {
        const q = query(servicesRef, where('status', '==', 'approved'));
        activeUnsubscribe = onSnapshot(
          q,
          handleSnapshot,
          () => {
            // Fallback for uppercase 'APPROVED'
            try {
              const qUpper = query(servicesRef, where('status', '==', 'APPROVED'));
              activeUnsubscribe = onSnapshot(qUpper, handleSnapshot, handleQueryError);
            } catch (fallbackErr) {
              handleQueryError(fallbackErr);
            }
          }
        );
      } catch (err) {
        handleQueryError(err);
      }
    }
  } catch (err) {
    handleQueryError(err);
  }

  return () => {
    if (activeUnsubscribe) {
      activeUnsubscribe();
    }
  };
};

/**
 * Submits a new local service to Firestore.
 * Always defaults status to 'pending' unless caller is verified admin.
 */
export const saveServiceToFirestore = async (
  serviceData: Partial<ServiceItem>,
  isAdmin: boolean = false
): Promise<{ success: boolean; serviceId: string; error?: string }> => {
  const serviceId = serviceData.id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Default to pending for all public submissions
  const cleanStatus = isAdmin && serviceData.status ? serviceData.status : 'pending';

  const cleanData: ServiceItem = {
    id: serviceId,
    title: (serviceData.title || '').trim(),
    category: (serviceData.category || 'MESS_TIFFIN') as ServiceCategory,
    providerName: (serviceData.providerName || '').trim(),
    phone: (serviceData.phone || '').trim(),
    whatsappNumber: (serviceData.whatsappNumber || serviceData.phone || '').trim(),
    charges: (serviceData.charges || '').trim(),
    chargeUnit: (serviceData.chargeUnit || 'service').trim(),
    priceNumeric: typeof serviceData.priceNumeric === 'number' ? serviceData.priceNumeric : 0,
    description: (serviceData.description || '').trim(),
    serviceAreas: Array.isArray(serviceData.serviceAreas) && serviceData.serviceAreas.length > 0 
      ? serviceData.serviceAreas 
      : ['All Gondia'],
    locality: (serviceData.locality || 'Gondia').trim(),
    city: 'Gondia',
    address: (serviceData.address || '').trim(),
    photos: Array.isArray(serviceData.photos) ? serviceData.photos : [],
    businessCardPhoto: serviceData.businessCardPhoto || '',
    timing: (serviceData.timing || '8:00 AM - 8:00 PM').trim(),
    experienceYears: typeof serviceData.experienceYears === 'number' ? serviceData.experienceYears : 1,
    status: cleanStatus as any,
    rating: typeof serviceData.rating === 'number' ? serviceData.rating : 5.0,
    reviewCount: typeof serviceData.reviewCount === 'number' ? serviceData.reviewCount : 1,
    isFeatured: false,
    specialties: Array.isArray(serviceData.specialties) ? serviceData.specialties : [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  if (!db || !isFirebaseConfigured()) {
    // Save to local cache so offline or local-only works
    const cached = getCachedServices();
    const updated = [cleanData, ...cached.filter(s => s.id !== serviceId)];
    try {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
    } catch {}
    return { success: true, serviceId };
  }

  try {
    const docRef = doc(db, SERVICES_COLLECTION, serviceId);
    await setDoc(docRef, cleanData);

    // Also update local cache
    const cached = getCachedServices();
    const updated = [cleanData, ...cached.filter(s => s.id !== serviceId)];
    try {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
    } catch {}

    return { success: true, serviceId };
  } catch (err: any) {
    console.error('[GondiaStay] Failed to save service in Firestore:', err);
    // Graceful local cache fallback
    const cached = getCachedServices();
    const updated = [cleanData, ...cached.filter(s => s.id !== serviceId)];
    try {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
    } catch {}

    return {
      success: false,
      serviceId,
      error: err?.message || 'Failed to save service in database.'
    };
  }
};

/**
 * Admin action: approves or rejects a service listing in Firestore.
 */
export const moderateServiceInFirestore = async (
  serviceId: string,
  approve: boolean,
  adminEmail?: string
): Promise<boolean> => {
  const newStatus = approve ? 'approved' : 'rejected';

  // Update local cache immediately for responsive UI
  try {
    const cached = getCachedServices();
    const updated = cached.map(s => {
      if (s.id === serviceId) {
        return { 
          ...s, 
          status: newStatus as any, 
          moderatedAt: Date.now(), 
          moderatedBy: adminEmail || 'admin' 
        };
      }
      return s;
    });
    localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
  } catch {}

  if (!db || !isFirebaseConfigured()) {
    return true;
  }

  try {
    const docRef = doc(db, SERVICES_COLLECTION, serviceId);
    await updateDoc(docRef, {
      status: newStatus,
      moderatedAt: Date.now(),
      moderatedBy: adminEmail || 'admin',
      updatedAt: Date.now()
    });
    return true;
  } catch (err) {
    console.error('[GondiaStay] Error moderating service in Firestore:', err);
    return false;
  }
};

/**
 * Admin action: deletes a service listing permanently from Firestore.
 */
export const deleteServiceInFirestore = async (serviceId: string): Promise<boolean> => {
  // Update local cache
  try {
    const cached = getCachedServices();
    const updated = cached.filter(s => s.id !== serviceId);
    localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
  } catch {}

  if (!db || !isFirebaseConfigured()) {
    return true;
  }

  try {
    const docRef = doc(db, SERVICES_COLLECTION, serviceId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('[GondiaStay] Error deleting service from Firestore:', err);
    return false;
  }
};
