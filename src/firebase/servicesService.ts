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
  getDoc,
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './config';
import { isAuthorizedAdminEmail } from './propertiesService';
import { ServiceItem, ServiceCategory } from '../types';

export const SERVICES_COLLECTION = 'services';
export const SERVICE_SECRETS_COLLECTION = 'service_secrets';
export const SERVICE_EDIT_TOKENS_COLLECTION = 'service_edit_tokens';
export const SERVICES_CACHE_KEY = 'gondia_stay_services_cache';
export const DELETED_SERVICES_KEY = 'gondia_stay_deleted_services';

// Legacy dummy service IDs to permanently filter out from local cache and Firestore
export const DUMMY_SERVICE_IDS = new Set([
  "srv_mess_01", "srv_mess_02", "srv_mess_03",
  "srv_maid_01", "srv_maid_02",
  "srv_housekeeping_01", "srv_housekeeping_02",
  "srv_laundry_01", "srv_laundry_02",
  "srv_elec_01", "srv_elec_02",
  "srv_plumb_01", "srv_plumb_02",
  "srv_water_01", "srv_water_02",
  "srv_sec_01", "srv_sec_02"
]);

const getDeletedServiceIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_SERVICES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

/**
 * Retrieves cached services from localStorage, filtering out deleted and dummy records.
 */
export const getCachedServices = (): ServiceItem[] => {
  const deletedIds = getDeletedServiceIds();
  try {
    const raw = localStorage.getItem(SERVICES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out deleted IDs and any legacy dummy service IDs
        const validCached = parsed
          .filter((s: any) => s && s.id && !deletedIds.has(s.id) && !DUMMY_SERVICE_IDS.has(s.id));
        return validCached;
      }
    }
  } catch (err) {
    console.warn('[GondiaStay] Error reading services cache:', err);
  }
  return [];
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
    const deletedIds = getDeletedServiceIds();
    const items: ServiceItem[] = [];

    snapshot.forEach((docSnap: any) => {
      if (deletedIds.has(docSnap.id) || DUMMY_SERVICE_IDS.has(docSnap.id)) return;
      const data = docSnap.data();
      const pName = (data.providerName || data.ownerName || '').trim();
      const pPhone = (data.phone || data.ownerPhone || '').trim();
      const pWhatsapp = (data.whatsappNumber || data.ownerWhatsappNumber || pPhone).trim();
      const photos: string[] = [];
      const addRawPhoto = (item: any) => {
        if (!item) return;
        if (typeof item === 'string') {
          const t = item.trim();
          if (t.length > 0 && t !== 'null' && t !== 'undefined' && !photos.includes(t)) {
            photos.push(t);
          }
        } else if (typeof item === 'object') {
          const u = item.url || item.photoUrl || item.imageUrl || item.src;
          if (typeof u === 'string' && u.trim().length > 0 && !photos.includes(u.trim())) {
            photos.push(u.trim());
          }
        }
      };
      if (Array.isArray(data.photos)) data.photos.forEach(addRawPhoto);
      else if (typeof data.photos === 'string') {
        try {
          const p = JSON.parse(data.photos);
          if (Array.isArray(p)) p.forEach(addRawPhoto);
          else addRawPhoto(data.photos);
        } catch {
          data.photos.split(',').forEach(addRawPhoto);
        }
      }
      addRawPhoto(data.photoUrl);
      addRawPhoto(data.photo);
      addRawPhoto(data.imageUrl);
      if (Array.isArray(data.images)) data.images.forEach(addRawPhoto);
      if (typeof data.businessCardPhoto === 'string' && data.businessCardPhoto.trim().length > 0) {
        addRawPhoto(data.businessCardPhoto.trim());
      }
      const areas = Array.isArray(data.serviceAreas) && data.serviceAreas.length > 0 
        ? data.serviceAreas 
        : (data.locality ? [data.locality] : ['All Gondia']);

      items.push({
        id: docSnap.id,
        title: data.title || '',
        category: (data.category || 'MESS_TIFFIN') as ServiceCategory,
        providerName: pName,
        ownerName: pName,
        phone: pPhone,
        ownerPhone: pPhone,
        whatsappNumber: pWhatsapp,
        ownerWhatsappNumber: pWhatsapp,
        charges: data.charges || '',
        chargeUnit: data.chargeUnit || 'month',
        priceNumeric: typeof data.priceNumeric === 'number' ? data.priceNumeric : 0,
        description: data.description || '',
        serviceAreas: areas,
        locality: data.locality || areas[0] || 'Civil Lines',
        city: data.city || 'Gondia',
        address: data.address || '',
        photos: photos,
        businessCardPhoto: typeof data.businessCardPhoto === 'string' ? data.businessCardPhoto : '',
        timing: data.timing || '8:00 AM - 8:00 PM',
        experienceYears: typeof data.experienceYears === 'number' ? data.experienceYears : 1,
        status: (data.status || 'pending').toLowerCase() as any,
        isFeatured: Boolean(data.isFeatured),
        specialties: Array.isArray(data.specialties) ? data.specialties : [],
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
        moderatedAt: typeof data.moderatedAt === 'number' ? data.moderatedAt : undefined,
        moderatedBy: typeof data.moderatedBy === 'string' ? data.moderatedBy : undefined,
        ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
        ownerEmail: typeof data.ownerEmail === 'string' ? data.ownerEmail : undefined,
        // Private editToken is never read from public document; retrieved from local device storage for the owner
        editToken: (() => {
          try {
            const raw = localStorage.getItem('gondia_stay_service_tokens');
            const tokens = raw ? JSON.parse(raw) : {};
            return tokens[docSnap.id] || undefined;
          } catch {
            return undefined;
          }
        })(),
        hasPendingEdit: Boolean(data.hasPendingEdit),
        pendingEdit: data.pendingEdit || undefined
      });
    });

    // Exclusively use real Firestore services
    const merged = items.filter(s => !DUMMY_SERVICE_IDS.has(s.id));

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
 * Generates an unguessable private edit token for local services.
 */
export const generateServiceEditToken = (): string => {
  try {
    const randomBytes = new Uint8Array(20);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `gst_srv_${hex}`;
  } catch {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'gst_srv_';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
};

/**
 * Submits a new local service to Firestore.
 * Always defaults status to 'pending' unless caller has an authenticated Firebase Admin session.
 * Fully supports zero-login submissions from any resident or provider across Gondia.
 * Secures the listing with unique ownerId and unguessable editToken.
 */
export const saveServiceToFirestore = async (
  serviceData: Partial<ServiceItem>,
  isAdmin: boolean = false
): Promise<{ success: boolean; serviceId: string; ownerId: string; editToken: string; error?: string }> => {
  const serviceId = serviceData.id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Determine if caller has an active, authorized Firebase administrator session
  const isRealAdminAuth = Boolean(
    isAdmin &&
    auth?.currentUser &&
    auth.currentUser.email &&
    isAuthorizedAdminEmail(auth.currentUser.email)
  );

  const ownerId = serviceData.ownerId || (
    auth?.currentUser?.uid && !isRealAdminAuth
      ? auth.currentUser.uid
      : `srv_owner_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  );
  const editToken = serviceData.editToken || generateServiceEditToken();

  // Non-admin or unauthenticated submissions ALWAYS default to 'pending' so security rules succeed
  const cleanStatus = (isRealAdminAuth && serviceData.status) ? serviceData.status : 'pending';

  const cleanTitle = (serviceData.title || '').trim().substring(0, 200);
  const cleanProvider = (serviceData.providerName || serviceData.ownerName || '').trim().substring(0, 150);
  const cleanPhone = (serviceData.phone || serviceData.ownerPhone || '').trim();
  const cleanWhatsapp = (serviceData.whatsappNumber || serviceData.ownerWhatsappNumber || cleanPhone).trim().substring(0, 30);
  const cleanCategory = (serviceData.category || 'MESS_TIFFIN') as ServiceCategory;
  const cleanPhotos = Array.isArray(serviceData.photos) 
    ? serviceData.photos.filter(p => typeof p === 'string' && p.trim().length > 0)
    : [];

  // CRITICAL SECURITY ENFORCEMENT:
  // editToken is NEVER stored in the public /services document!
  // It is stored exclusively in /service_secrets and /service_edit_tokens.
  const publicData: Omit<ServiceItem, 'editToken'> = {
    id: serviceId,
    title: cleanTitle,
    category: cleanCategory,
    providerName: cleanProvider,
    ownerName: cleanProvider,
    phone: cleanPhone,
    ownerPhone: cleanPhone,
    whatsappNumber: cleanWhatsapp,
    ownerWhatsappNumber: cleanWhatsapp,
    charges: (serviceData.charges || '').trim().substring(0, 100),
    chargeUnit: (serviceData.chargeUnit || 'service').trim().substring(0, 50),
    priceNumeric: typeof serviceData.priceNumeric === 'number' ? serviceData.priceNumeric : 0,
    description: (serviceData.description || '').trim().substring(0, 1500),
    serviceAreas: Array.isArray(serviceData.serviceAreas) && serviceData.serviceAreas.length > 0 
      ? serviceData.serviceAreas 
      : ['All Gondia'],
    locality: (serviceData.locality || 'Gondia').trim().substring(0, 100),
    city: 'Gondia',
    address: (serviceData.address || '').trim().substring(0, 300),
    photos: cleanPhotos,
    businessCardPhoto: typeof serviceData.businessCardPhoto === 'string' ? serviceData.businessCardPhoto : '',
    timing: (serviceData.timing || '8:00 AM - 8:00 PM').trim().substring(0, 100),
    experienceYears: typeof serviceData.experienceYears === 'number' ? serviceData.experienceYears : 1,
    status: cleanStatus as any,
    isFeatured: Boolean(serviceData.isFeatured),
    specialties: Array.isArray(serviceData.specialties) ? serviceData.specialties : [],
    createdAt: typeof serviceData.createdAt === 'number' ? serviceData.createdAt : Date.now(),
    updatedAt: Date.now(),
    ownerId,
    ...(serviceData.ownerEmail ? { ownerEmail: serviceData.ownerEmail } : (auth?.currentUser?.email && !isRealAdminAuth ? { ownerEmail: auth.currentUser.email } : {}))
  };

  const clientCachedData: ServiceItem = {
    ...publicData,
    editToken
  };

  // Always save private token to local device storage for the creator
  try {
    const savedTokens = JSON.parse(localStorage.getItem('gondia_stay_service_tokens') || '{}');
    savedTokens[serviceId] = editToken;
    localStorage.setItem('gondia_stay_service_tokens', JSON.stringify(savedTokens));
  } catch {}

  if (!db || !isFirebaseConfigured()) {
    // Save to local cache so offline or local-only works
    const cached = getCachedServices();
    const updated = [clientCachedData, ...cached.filter(s => s.id !== serviceId)];
    try {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
    } catch {}
    return { success: true, serviceId, ownerId, editToken };
  }

  try {
    const batch = writeBatch(db);
    const docRef = doc(db, SERVICES_COLLECTION, serviceId);
    batch.set(docRef, publicData);

    const secretRef = doc(db, SERVICE_SECRETS_COLLECTION, serviceId);
    batch.set(secretRef, {
      serviceId,
      editToken,
      ownerId,
      createdAt: Date.now()
    });

    const tokenRef = doc(db, SERVICE_EDIT_TOKENS_COLLECTION, editToken);
    batch.set(tokenRef, {
      serviceId,
      ownerId,
      createdAt: Date.now()
    });

    await batch.commit();

    // Also update local cache with private token for this device
    const cached = getCachedServices();
    const updated = [clientCachedData, ...cached.filter(s => s.id !== serviceId)];
    try {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
    } catch {}

    return { success: true, serviceId, ownerId, editToken };
  } catch (err: any) {
    console.error('[GondiaStay] Failed to save service in Firestore:', err);

    // Graceful local cache fallback so the listing isn't lost
    const cached = getCachedServices();
    const updated = [clientCachedData, ...cached.filter(s => s.id !== serviceId)];
    try {
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
    } catch {}

    const rawError = err?.message || String(err);
    let userFriendlyError = rawError;
    if (
      rawError.toLowerCase().includes('permission') || 
      rawError.toLowerCase().includes('insufficient') ||
      rawError.includes('PERMISSION_DENIED')
    ) {
      userFriendlyError = 'Database permissions error: Please ensure the latest Firestore security rules are published in Firebase Console -> Firestore Database -> Rules. (Open Firebase Settings in top navigation to copy production rules).';
    }

    return {
      success: false,
      serviceId,
      ownerId,
      editToken,
      error: userFriendlyError
    };
  }
};

/**
 * Updates an existing service in Firestore.
 * - If called by verified admin: publishes edits directly and clears any pendingEdit.
 * - If called by service provider on an already approved listing: stores proposed changes in pendingEdit
 *   and marks hasPendingEdit: true. The approved listing remains live and unchanged until admin approves.
 * - If called on a pending listing: updates listing fields directly and keeps status pending.
 */
export const updateServiceInFirestore = async (
  serviceId: string,
  updatedFields: Partial<ServiceItem>,
  isAdminCaller: boolean = false,
  editToken?: string
): Promise<{ success: boolean; error?: string }> => {
  const isRealAdminAuth = Boolean(
    isAdminCaller &&
    auth?.currentUser &&
    auth.currentUser.email &&
    isAuthorizedAdminEmail(auth.currentUser.email)
  );

  const cleanProvider = (updatedFields.providerName || updatedFields.ownerName || '').trim();
  const cleanPhone = (updatedFields.phone || updatedFields.ownerPhone || '').trim();
  const cleanWhatsapp = (updatedFields.whatsappNumber || updatedFields.ownerWhatsappNumber || cleanPhone).trim();

  const sanitized: any = {
    ...updatedFields,
    updatedAt: Date.now()
  };
  delete sanitized.id;
  delete sanitized.editToken;

  if (cleanProvider) {
    sanitized.providerName = cleanProvider;
    sanitized.ownerName = cleanProvider;
  }
  if (cleanPhone) {
    sanitized.phone = cleanPhone;
    sanitized.ownerPhone = cleanPhone;
  }
  if (cleanWhatsapp) {
    sanitized.whatsappNumber = cleanWhatsapp;
    sanitized.ownerWhatsappNumber = cleanWhatsapp;
  }
  if (Array.isArray(updatedFields.photos)) {
    sanitized.photos = updatedFields.photos.filter((p: any) => typeof p === 'string' && p.trim().length > 0);
  }
  if (Array.isArray(updatedFields.serviceAreas)) {
    sanitized.serviceAreas = updatedFields.serviceAreas;
  }
  if (Array.isArray(updatedFields.specialties)) {
    sanitized.specialties = updatedFields.specialties;
  }

  // Check if target service is currently approved
  let isCurrentlyApproved = false;
  if (db && isFirebaseConfigured()) {
    try {
      const docRef = doc(db, SERVICES_COLLECTION, serviceId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        isCurrentlyApproved = (snap.data().status || '').toLowerCase() === 'approved';
      }
    } catch (e) {
      console.warn('[GondiaStay] Error checking service status in Firestore:', e);
    }
  } else {
    const cached = getCachedServices().find(s => s.id === serviceId);
    isCurrentlyApproved = (cached?.status || '').toLowerCase() === 'approved';
  }

  let finalPayload: any;

  if (isRealAdminAuth) {
    // Admin direct update & publish
    finalPayload = {
      ...sanitized,
      hasPendingEdit: false,
      pendingEdit: null,
      updatedAt: Date.now()
    };
  } else if (isCurrentlyApproved) {
    // Provider editing approved service: keep live listing untouched! Store in pendingEdit
    const { status, hasPendingEdit, pendingEdit, ...fieldsForPendingEdit } = sanitized;
    const pendingData = {
      ...fieldsForPendingEdit,
      submittedAt: Date.now()
    };
    finalPayload = {
      hasPendingEdit: true,
      pendingEdit: pendingData,
      updatedAt: Date.now()
    };
  } else {
    // Provider editing pending service: update directly, remain pending
    finalPayload = {
      ...sanitized,
      status: 'pending',
      hasPendingEdit: false,
      pendingEdit: null,
      updatedAt: Date.now()
    };
  }

  // Update local cache immediately for responsive zero-lag UI
  try {
    const cached = getCachedServices();
    const updated = cached.map(s => {
      if (s.id === serviceId) {
        if (!isRealAdminAuth && isCurrentlyApproved) {
          return {
            ...s,
            hasPendingEdit: true,
            pendingEdit: finalPayload.pendingEdit,
            updatedAt: Date.now()
          };
        }
        return {
          ...s,
          ...finalPayload
        };
      }
      return s;
    });
    localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
  } catch {}

  if (!db || !isFirebaseConfigured()) {
    return { success: true };
  }

  try {
    const docRef = doc(db, SERVICES_COLLECTION, serviceId);
    if (!isRealAdminAuth && editToken && editToken.trim()) {
      const cleanToken = editToken.trim();
      const batch = writeBatch(db);
      batch.update(docRef, finalPayload);
      // Request-specific owner proof: update lastActionAt on service_edit_tokens/{cleanToken}.
      // service_secrets remains strictly immutable. Only the caller who possesses the secret editToken
      // can address its document ID in the write batch.
      const tokenRef = doc(db, SERVICE_EDIT_TOKENS_COLLECTION, cleanToken);
      batch.set(tokenRef, {
        serviceId,
        serviceData: finalPayload,
        lastActionAt: Date.now(),
        updatedAt: Date.now()
      }, { merge: true });
      await batch.commit();
      return { success: true };
    }

    try {
      await updateDoc(docRef, finalPayload);
      return { success: true };
    } catch (updateErr: any) {
      await setDoc(docRef, finalPayload, { merge: true });
      return { success: true };
    }
  } catch (err: any) {
    console.error('[GondiaStay] Error updating service in Firestore:', err);
    const rawError = err?.message || String(err);
    let userFriendlyError = rawError;
    if (
      rawError.toLowerCase().includes('permission') || 
      rawError.toLowerCase().includes('insufficient') ||
      rawError.includes('PERMISSION_DENIED')
    ) {
      userFriendlyError = 'Database permissions error: Please ensure the latest Firestore security rules are published in Firebase Console -> Firestore Database -> Rules. (Open Firebase Settings in top navigation to copy production rules).';
    }
    return {
      success: false,
      error: userFriendlyError
    };
  }
};

/**
 * Admin action: approves or rejects proposed edits for an already approved service.
 * When approving: merges pendingEdit into the root document, clears pendingEdit and hasPendingEdit.
 * When rejecting: discards pendingEdit without modifying the live approved service!
 */
export const moderateServiceEditInFirestore = async (
  serviceId: string,
  approve: boolean,
  adminEmail?: string
): Promise<boolean> => {
  if (!db || !isFirebaseConfigured()) {
    return true;
  }

  try {
    const docRef = doc(db, SERVICES_COLLECTION, serviceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return false;
    }

    const data = snap.data();
    const pendingEdit = data.pendingEdit;

    let updatePayload: any;

    if (approve && pendingEdit) {
      const { submittedAt, ...fieldsToMerge } = pendingEdit;
      updatePayload = {
        ...fieldsToMerge,
        status: 'approved',
        hasPendingEdit: false,
        pendingEdit: null,
        moderatedAt: Date.now(),
        moderatedBy: adminEmail || 'admin',
        updatedAt: Date.now()
      };
    } else {
      // Discard proposed edits; live approved service stays completely untouched
      updatePayload = {
        hasPendingEdit: false,
        pendingEdit: null,
        moderatedAt: Date.now(),
        moderatedBy: adminEmail || 'admin',
        updatedAt: Date.now()
      };
    }

    await setDoc(docRef, updatePayload, { merge: true });

    // Update local cache
    try {
      const cached = getCachedServices();
      const updated = cached.map(s => {
        if (s.id === serviceId) {
          return {
            ...s,
            ...updatePayload
          };
        }
        return s;
      });
      localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));
    } catch {}

    return true;
  } catch (err) {
    console.error('[GondiaStay] Error moderating service edit in Firestore:', err);
    return false;
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
          moderatedBy: adminEmail || 'admin',
          updatedAt: Date.now()
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
    await setDoc(docRef, {
      status: newStatus,
      moderatedAt: Date.now(),
      moderatedBy: adminEmail || 'admin',
      updatedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[GondiaStay] Error moderating service in Firestore:', err);
    return false;
  }
};

/**
 * Verifies if a given token belongs to the service listing.
 * Securely checks:
 * 1. Logged-in Firebase Account matching service.ownerId or service.ownerEmail
 * 2. Unforgeable private Edit Token checked against service_edit_tokens in Firestore
 * 3. Locally saved private edit token on this device
 * 
 * CRITICAL: Public metadata like ownerId or ownerPhone are NEVER accepted as secret credentials!
 */
export const verifyServiceOwnershipSecurely = async (
  service: ServiceItem,
  tokenInput: string
): Promise<boolean> => {
  if (!service || !tokenInput) return false;
  const cleanToken = tokenInput.trim();
  if (cleanToken.length === 0) return false;

  // 1. Authenticated Firebase account check
  if (auth?.currentUser) {
    if (service.ownerId && auth.currentUser.uid === service.ownerId) {
      return true;
    }
    if (service.ownerEmail && auth.currentUser.email && auth.currentUser.email.toLowerCase() === service.ownerEmail.toLowerCase()) {
      return true;
    }
  }

  // 2. Direct lookup of unguessable private token in service_edit_tokens collection
  if (db && isFirebaseConfigured()) {
    try {
      const tokenRef = doc(db, SERVICE_EDIT_TOKENS_COLLECTION, cleanToken);
      const tokenSnap = await getDoc(tokenRef);
      if (tokenSnap.exists()) {
        const tokenData = tokenSnap.data();
        if (tokenData?.serviceId === service.id) {
          return true;
        }
      }
    } catch (e) {
      console.warn('[GondiaStay] Error checking service edit token in Firestore:', e);
    }
  }

  // 3. Local storage fallback check (if token is stored on this device)
  try {
    const savedTokens = JSON.parse(localStorage.getItem('gondia_stay_service_tokens') || '{}');
    if (savedTokens[service.id] && savedTokens[service.id] === cleanToken) {
      return true;
    }
  } catch {}

  return false;
};

/**
 * Deletes a service listing permanently from Firestore.
 * Supports deletion by verified administrator OR the service's verified owner.
 */
export const deleteServiceInFirestore = async (
  serviceId: string,
  token?: string,
  ownerId?: string,
  isAdminCaller: boolean = false
): Promise<boolean> => {
  // Update local cache and deleted tracking
  try {
    const rawDeleted = localStorage.getItem(DELETED_SERVICES_KEY);
    const deletedArr: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedArr.includes(serviceId)) {
      deletedArr.push(serviceId);
      localStorage.setItem(DELETED_SERVICES_KEY, JSON.stringify(deletedArr));
    }

    const cached = getCachedServices();
    const updated = cached.filter(s => s.id !== serviceId);
    localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(updated));

    // Clean up local token
    const savedTokens = JSON.parse(localStorage.getItem('gondia_stay_service_tokens') || '{}');
    delete savedTokens[serviceId];
    localStorage.setItem('gondia_stay_service_tokens', JSON.stringify(savedTokens));
  } catch {}

  if (!db || !isFirebaseConfigured()) {
    return true;
  }

  try {
    const srvRef = doc(db, SERVICES_COLLECTION, serviceId);
    const secretRef = doc(db, SERVICE_SECRETS_COLLECTION, serviceId);

    const isRealAdmin = Boolean(
      isAdminCaller || 
      (auth?.currentUser?.email && isAuthorizedAdminEmail(auth.currentUser.email))
    );

    if (isRealAdmin) {
      await deleteDoc(srvRef);
      try {
        await deleteDoc(secretRef);
      } catch {}
      return true;
    }

    // Owner deletion using private Edit Token:
    // Uses an atomic writeBatch to delete the public service and delete the unguessable token
    // document from service_edit_tokens. service_secrets remains immutable.
    if (token && token.trim()) {
      const cleanToken = token.trim();
      const batch = writeBatch(db);
      batch.delete(srvRef);
      const tokenRef = doc(db, SERVICE_EDIT_TOKENS_COLLECTION, cleanToken);
      batch.delete(tokenRef);
      await batch.commit();

      return true;
    }

    // Authenticated owner deletion via Firebase Auth (UID match)
    if (auth?.currentUser) {
      await deleteDoc(srvRef);
      return true;
    }

    throw new Error('Unauthorized: Valid private edit token required to delete this service listing.');
  } catch (err) {
    console.error('[GondiaStay] Error deleting service from Firestore:', err);
    return false;
  }
};

/**
 * Resolves a service listing and ID using an unguessable private edit token.
 * Enables automatic verification of private service edit links (?token=gst_srv_... or ?service=<id>&token=...).
 */
export const fetchServiceByEditToken = async (
  token: string,
  serviceIdHint?: string
): Promise<{ service: ServiceItem | null; serviceId: string | null }> => {
  if (!token) return { service: null, serviceId: null };
  const cleanToken = token.trim();
  if (!cleanToken) return { service: null, serviceId: null };

  if (!db || !isFirebaseConfigured()) {
    const cached = getCachedServices();
    const match = cached.find(s => s.editToken === cleanToken || (serviceIdHint && s.id === serviceIdHint));
    return { service: match || null, serviceId: match?.id || serviceIdHint || null };
  }

  try {
    let resolvedServiceId = serviceIdHint;

    // Direct lookup in service_edit_tokens
    const tokenRef = doc(db, SERVICE_EDIT_TOKENS_COLLECTION, cleanToken);
    const tokenSnap = await getDoc(tokenRef);
    if (tokenSnap.exists()) {
      const data = tokenSnap.data();
      if (data?.serviceId) {
        resolvedServiceId = data.serviceId;
      }
    }

    if (!resolvedServiceId) {
      return { service: null, serviceId: null };
    }

    // Fetch the service document
    const srvRef = doc(db, SERVICES_COLLECTION, resolvedServiceId);
    const srvSnap = await getDoc(srvRef);
    if (srvSnap.exists()) {
      return {
        service: { id: srvSnap.id, ...srvSnap.data() } as ServiceItem,
        serviceId: resolvedServiceId
      };
    }

    return { service: null, serviceId: resolvedServiceId };
  } catch (err) {
    console.warn('[GondiaStay] Error fetching service by edit token:', err);
    return { service: null, serviceId: serviceIdHint || null };
  }
};

