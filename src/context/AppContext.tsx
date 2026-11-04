import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  PropertyListing, 
  TiffinService, 
  ServiceItem,
  PropertyType, 
  SortOption, 
  FilterCriteria, 
  DEFAULT_OWNER_PROFILE,
  OwnerProfile
} from '../types';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User,
  sendEmailVerification
} from 'firebase/auth';
import { INITIAL_TIFFINS } from '../data/initialData';
import { 
  auth,
  isFirebaseConfigured
} from '../firebase/config';
import { 
  subscribeToFirestoreProperties, 
  savePropertyToFirestore, 
  moderatePropertyInFirestore, 
  moderatePropertyEditInFirestore,
  deletePropertyFromFirestore,
  updatePropertyOccupancyInFirestore,
  saveOwnerProfileToFirestore,
  subscribeToOwnerProfile,
  SavePropertyResult,
  getCachedProperties,
  generateDeviceToken,
  generateUniqueOwnerId,
  verifyDeviceToken,
  registerDeviceTokenInFirestore
} from '../firebase/propertiesService';
import {
  subscribeToFirestoreServices,
  saveServiceToFirestore,
  updateServiceInFirestore,
  moderateServiceInFirestore,
  moderateServiceEditInFirestore,
  deleteServiceInFirestore,
  getCachedServices
} from '../firebase/servicesService';
import { isValidIndianMobileNumber } from '../utils/contact';

export interface PendingPropertyDeletion {
  property: PropertyListing;
  token?: string;
  expiresAt: number;
  secondsRemaining: number;
}

export interface PendingServiceDeletion {
  service: ServiceItem;
  token?: string;
  ownerId?: string;
  expiresAt: number;
  secondsRemaining: number;
}

interface AppContextType {
  properties: PropertyListing[];
  tiffinServices: TiffinService[];
  services: ServiceItem[];
  saveService: (service: Partial<ServiceItem>) => Promise<{ success: boolean; serviceId: string; ownerId?: string; editToken?: string; error?: string }>;
  updateService: (serviceId: string, updatedFields: Partial<ServiceItem>) => Promise<{ success: boolean; error?: string }>;
  moderateService: (serviceId: string, approve: boolean) => Promise<boolean>;
  moderateServiceEdit: (serviceId: string, approve: boolean) => Promise<boolean>;
  deleteService: (serviceId: string) => Promise<boolean>;
  isServiceOwner: (service: ServiceItem) => boolean;
  isPropertyOwner: (property: PropertyListing) => boolean;
  myServiceIds: string[];
  saveServiceId: (serviceId: string) => void;
  myServiceTokens: Record<string, string>;
  saveServiceToken: (serviceId: string, token: string) => void;
  getServiceToken: (serviceId: string) => string | undefined;
  favorites: string[];
  currentOwner: OwnerProfile;
  searchQuery: string;
  selectedLocality: string;
  selectedType: PropertyType;
  sortOption: SortOption;
  filterCriteria: FilterCriteria;
  selectedProperty: PropertyListing | null;
  activeTab: 'explore' | 'map' | 'tiffin' | 'services' | 'saved' | 'owner' | 'detail';
  toastMessage: string | null;

  // Firebase Firestore Status & Moderation
  isFirestoreLoading: boolean;
  firestoreError: string | null;
  isFirebaseConnected: boolean;
  isAdminAuthenticated: boolean;
  adminUser: User | null;
  isAdminLoading: boolean;
  isFirebaseModalOpen: boolean;
  authUser: User | null;
  isOwnerAuthenticated: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedLocality: (locality: string) => void;
  setSelectedType: (type: PropertyType) => void;
  setSortOption: (sort: SortOption) => void;
  setFilterCriteria: React.Dispatch<React.SetStateAction<FilterCriteria>>;
  toggleFavorite: (propertyId: string) => void;
  switchOwner: (ownerId: string) => void;
  updateOwnerPhone: (newPhone: string) => void;
  updateOwnerProfile: (updates: Partial<OwnerProfile>) => Promise<void>;
  updatePropertyOccupancy: (propertyId: string, occupancyStatus: 'AVAILABLE' | 'OCCUPIED', editToken?: string) => Promise<void>;
  saveProperty: (property: PropertyListing, isEdit: boolean, editToken?: string) => Promise<SavePropertyResult>;
  myListingTokens: Record<string, string>;
  saveListingToken: (propertyId: string, token: string) => void;
  getListingToken: (propertyId: string) => string | undefined;
  deleteProperty: (propertyId: string) => Promise<void>;
  pendingPropertyDeletion: PendingPropertyDeletion | null;
  undoPropertyDeletion: () => void;
  pendingServiceDeletion: PendingServiceDeletion | null;
  undoServiceDeletion: () => void;
  toggleFeatured: (propertyId: string) => void;
  approveProperty: (propertyId: string, approve: boolean) => Promise<boolean>;
  moderatePropertyEdit: (propertyId: string, approve: boolean) => Promise<boolean>;
  navigateTo: (tab: 'explore' | 'map' | 'tiffin' | 'services' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => void;
  goBack: () => void;
  registerOverlay: (name: string, onBack: () => void) => () => void;
  showToast: (msg: string) => void;
  resetFilters: () => void;
  loginAdminWithEmailPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  sendAdminVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  checkAdminVerificationStatus: () => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  loginOwnerWithEmailPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerOwnerWithEmailPassword: (email: string, pass: string, name?: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logoutOwner: () => Promise<void>;
  verifyAdminPasscode: (passcode: string) => boolean;
  setIsFirebaseModalOpen: (open: boolean) => void;
  clearFirestoreError: () => void;
  ownerSubTab: 'listings' | 'new' | 'moderation';
  setOwnerSubTab: React.Dispatch<React.SetStateAction<'listings' | 'new' | 'moderation'>>;
  openPostListing: () => void;
}

const defaultFilterCriteria: FilterCriteria = {
  minRent: 0,
  maxRent: 30000,
  bedrooms: 0,
  furnishing: null,
  propertyType: 'ALL',
  statusOnlyApproved: true,
};

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return lower === 'jangirpankaj9001@gmail.com';
};

// Local persistence for owner submitted properties so they appear immediately in Owner -> My Properties even before admin approval
export const getSubmittedProperties = (): PropertyListing[] => {
  try {
    const raw = localStorage.getItem('gondia_stay_my_submitted_properties');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveSubmittedProperty = (property: PropertyListing) => {
  try {
    const existing = getSubmittedProperties();
    const updated = [property, ...existing.filter(p => p.id !== property.id)];
    localStorage.setItem('gondia_stay_my_submitted_properties', JSON.stringify(updated));
  } catch {
    // Ignore quota warnings
  }
};

export const updateSubmittedPropertyStatus = (propertyId: string, newStatus: 'approved' | 'pending' | 'rejected') => {
  try {
    const existing = getSubmittedProperties();
    const updated = existing.map(p => p.id === propertyId ? { ...p, status: newStatus } : p);
    localStorage.setItem('gondia_stay_my_submitted_properties', JSON.stringify(updated));
  } catch {
    // Ignore
  }
};

export const removeSubmittedProperty = (propertyId: string) => {
  try {
    const existing = getSubmittedProperties();
    const updated = existing.filter(p => p.id !== propertyId);
    localStorage.setItem('gondia_stay_my_submitted_properties', JSON.stringify(updated));
  } catch {
    // Ignore
  }
};

// Local persistence for owner submitted services so they appear immediately in Owner -> My Home Services even before admin approval
export const getSubmittedServices = (): ServiceItem[] => {
  try {
    const raw = localStorage.getItem('gondia_stay_my_submitted_services');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveSubmittedService = (service: ServiceItem) => {
  try {
    const existing = getSubmittedServices();
    const updated = [service, ...existing.filter(s => s.id !== service.id)];
    localStorage.setItem('gondia_stay_my_submitted_services', JSON.stringify(updated));
  } catch {
    // Ignore quota warnings
  }
};

export const updateSubmittedServiceStatus = (serviceId: string, newStatus: 'approved' | 'pending' | 'rejected') => {
  try {
    const existing = getSubmittedServices();
    const updated = existing.map(s => s.id === serviceId ? { ...s, status: newStatus } : s);
    localStorage.setItem('gondia_stay_my_submitted_services', JSON.stringify(updated));
  } catch {
    // Ignore
  }
};

export const removeSubmittedService = (serviceId: string) => {
  try {
    const existing = getSubmittedServices();
    const updated = existing.filter(s => s.id !== serviceId);
    localStorage.setItem('gondia_stay_my_submitted_services', JSON.stringify(updated));
  } catch {
    // Ignore
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Properties are loaded from Cloud Firestore, initialized with local cache + submitted pending listings for instant owner availability
  const [properties, setProperties] = useState<PropertyListing[]>(() => {
    const cached = getCachedProperties();
    const submitted = getSubmittedProperties();
    const map = new Map(cached.map(p => [p.id, p]));
    const merged = [...cached];
    submitted.forEach(p => {
      if (!map.has(p.id)) {
        merged.push(p);
      }
    });
    merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return merged;
  });
  const [isFirestoreLoading, setIsFirestoreLoading] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(isFirebaseConfigured());
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);

  // Firebase Authentication states
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState<boolean>(false);

  // GondiaStay Services (Mess/Tiffin, Maid, Housekeeping, Laundry, Electrician, Plumber, Water Cans, Security)
  const [services, setServices] = useState<ServiceItem[]>(() => {
    const cached = getCachedServices();
    const submitted = getSubmittedServices();
    const map = new Map(cached.map(s => [s.id, s]));
    const merged = [...cached];
    submitted.forEach(s => {
      if (!map.has(s.id)) {
        merged.push(s);
      }
    });
    merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return merged;
  });

  const [tiffinServices, setTiffinServices] = useState<TiffinService[]>(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_tiffins');
      return saved ? JSON.parse(saved) : INITIAL_TIFFINS;
    } catch {
      return INITIAL_TIFFINS;
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentOwner, setCurrentOwner] = useState<OwnerProfile>(() => {
    try {
      // 1. Ensure persistent device token exists on this device
      let deviceToken = localStorage.getItem('gondia_stay_owner_device_token');
      if (!deviceToken) {
        deviceToken = generateDeviceToken();
        localStorage.setItem('gondia_stay_owner_device_token', deviceToken);
      }

      // 2. Ensure persistent unique Owner ID exists on this device
      let deviceOwnerId = localStorage.getItem('gondia_stay_device_owner_id');
      if (!deviceOwnerId || deviceOwnerId === 'owner_gondia_primary') {
        deviceOwnerId = generateUniqueOwnerId();
        localStorage.setItem('gondia_stay_device_owner_id', deviceOwnerId);
      }

      const saved = localStorage.getItem('gondia_stay_current_owner') || localStorage.getItem('gondia_stay_persistent_owner');
      if (saved) {
        const parsed = JSON.parse(saved) as OwnerProfile;
        if (
          parsed.email?.toLowerCase() === 'rajesh.sharma@gondiastay.com' ||
          parsed.name === 'Rajesh Sharma'
        ) {
          localStorage.removeItem('gondia_stay_current_owner');
          localStorage.removeItem('gondia_stay_persistent_owner');
          return {
            ...DEFAULT_OWNER_PROFILE,
            id: deviceOwnerId,
            deviceToken
          };
        }
        return {
          ...DEFAULT_OWNER_PROFILE,
          ...parsed,
          id: parsed.id || deviceOwnerId,
          deviceToken: parsed.deviceToken || deviceToken
        };
      }
      return {
        ...DEFAULT_OWNER_PROFILE,
        id: deviceOwnerId,
        deviceToken
      };
    } catch {
      return DEFAULT_OWNER_PROFILE;
    }
  });

  // Local storage mapping for private edit link tokens (propertyId -> token)
  const [myListingTokens, setMyListingTokens] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_listing_tokens');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveListingToken = useCallback((propertyId: string, token: string) => {
    setMyListingTokens(prev => {
      const updated = { ...prev, [propertyId]: token };
      localStorage.setItem('gondia_stay_listing_tokens', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getListingToken = useCallback((propertyId: string): string | undefined => {
    return myListingTokens[propertyId];
  }, [myListingTokens]);

  // Local storage mapping for property IDs registered by this device
  const [myPropertyIds, setMyPropertyIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_my_property_ids');
      if (saved) return JSON.parse(saved);
      const rawTokens = localStorage.getItem('gondia_stay_listing_tokens');
      return rawTokens ? Object.keys(JSON.parse(rawTokens)) : [];
    } catch {
      return [];
    }
  });

  const savePropertyId = useCallback((propertyId: string) => {
    setMyPropertyIds(prev => {
      if (prev.includes(propertyId)) return prev;
      const updated = [...prev, propertyId];
      localStorage.setItem('gondia_stay_my_property_ids', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removePropertyId = useCallback((propertyId: string) => {
    setMyPropertyIds(prev => {
      const updated = prev.filter(id => id !== propertyId);
      localStorage.setItem('gondia_stay_my_property_ids', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Temporary Property Deletion UNDO state (5–10 seconds window, default 8 seconds)
  const [pendingPropertyDeletion, setPendingPropertyDeletion] = useState<PendingPropertyDeletion | null>(null);
  const deletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deletionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingDeletionRef = useRef<{ property: PropertyListing; token?: string } | null>(null);

  /**
   * Finalizes deletion permanently from Cloud Firestore and clears stored device tokens.
   */
  const finalizePendingDeletion = useCallback(async (item: { property: PropertyListing; token?: string }) => {
    if (deletionTimerRef.current) {
      clearTimeout(deletionTimerRef.current);
      deletionTimerRef.current = null;
    }
    if (deletionIntervalRef.current) {
      clearInterval(deletionIntervalRef.current);
      deletionIntervalRef.current = null;
    }

    if (isFirebaseConfigured()) {
      try {
        await deletePropertyFromFirestore(item.property.id);
      } catch (err: any) {
        console.warn('Firestore permanent delete notice:', err);
      }
    }

    setMyListingTokens(prev => {
      const updated = { ...prev };
      delete updated[item.property.id];
      localStorage.setItem('gondia_stay_listing_tokens', JSON.stringify(updated));
      return updated;
    });
    removeSubmittedProperty(item.property.id);
    removePropertyId(item.property.id);
  }, [removePropertyId]);

  // Flush any pending deletion on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingDeletionRef.current) {
        const item = pendingDeletionRef.current;
        pendingDeletionRef.current = null;
        if (isFirebaseConfigured()) {
          deletePropertyFromFirestore(item.property.id).catch(() => {});
        }
        removeSubmittedProperty(item.property.id);
        removePropertyId(item.property.id);
        try {
          const raw = localStorage.getItem('gondia_stay_listing_tokens');
          if (raw) {
            const tokens = JSON.parse(raw);
            delete tokens[item.property.id];
            localStorage.setItem('gondia_stay_listing_tokens', JSON.stringify(tokens));
          }
        } catch {}
      }

      if (pendingServiceDeletionRef.current) {
        const item = pendingServiceDeletionRef.current;
        pendingServiceDeletionRef.current = null;
        if (isFirebaseConfigured()) {
          deleteServiceInFirestore(item.service.id, item.token, item.ownerId, isAdminAuthenticated).catch(() => {});
        }
        removeSubmittedService(item.service.id);
        try {
          const raw = localStorage.getItem('gondia_stay_service_tokens');
          if (raw) {
            const tokens = JSON.parse(raw);
            delete tokens[item.service.id];
            localStorage.setItem('gondia_stay_service_tokens', JSON.stringify(tokens));
          }
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAdminAuthenticated]);

  // Local storage mapping for services registered/managed by this provider/device
  const [myServiceIds, setMyServiceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_my_service_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveServiceId = useCallback((serviceId: string) => {
    setMyServiceIds(prev => {
      if (prev.includes(serviceId)) return prev;
      const updated = [...prev, serviceId];
      localStorage.setItem('gondia_stay_my_service_ids', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Local storage mapping for service private edit tokens (serviceId -> token)
  const [myServiceTokens, setMyServiceTokens] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_service_tokens');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveServiceToken = useCallback((serviceId: string, token: string) => {
    setMyServiceTokens(prev => {
      const updated = { ...prev, [serviceId]: token };
      localStorage.setItem('gondia_stay_service_tokens', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getServiceToken = useCallback((serviceId: string): string | undefined => {
    return myServiceTokens[serviceId];
  }, [myServiceTokens]);

  // Temporary Service Deletion UNDO state (7 seconds window)
  const [pendingServiceDeletion, setPendingServiceDeletion] = useState<PendingServiceDeletion | null>(null);
  const serviceDeletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serviceDeletionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingServiceDeletionRef = useRef<{ service: ServiceItem; token?: string; ownerId?: string } | null>(null);

  /**
   * Finalizes service deletion permanently from Cloud Firestore and clears stored device tokens.
   */
  const finalizePendingServiceDeletion = useCallback(async (item: { service: ServiceItem; token?: string; ownerId?: string }) => {
    if (serviceDeletionTimerRef.current) {
      clearTimeout(serviceDeletionTimerRef.current);
      serviceDeletionTimerRef.current = null;
    }
    if (serviceDeletionIntervalRef.current) {
      clearInterval(serviceDeletionIntervalRef.current);
      serviceDeletionIntervalRef.current = null;
    }

    if (isFirebaseConfigured()) {
      try {
        await deleteServiceInFirestore(item.service.id, item.token, item.ownerId, isAdminAuthenticated);
      } catch (err: any) {
        console.warn('Firestore permanent delete service notice:', err);
      }
    }

    setMyServiceTokens(prev => {
      const updated = { ...prev };
      delete updated[item.service.id];
      localStorage.setItem('gondia_stay_service_tokens', JSON.stringify(updated));
      return updated;
    });
    removeSubmittedService(item.service.id);
    setMyServiceIds(prev => {
      const updated = prev.filter(id => id !== item.service.id);
      localStorage.setItem('gondia_stay_my_service_ids', JSON.stringify(updated));
      return updated;
    });
  }, [isAdminAuthenticated]);

  /**
   * Secure service ownership check:
   * - Verified service ID stored on this device
   * - Valid private edit token possessed by this device
   * - Logged-in Firebase account matching service.ownerId or service.ownerEmail
   * - Verified custom owner profile matching service.ownerId
   * Strictly prevents mixing listings between owners or devices.
   */
  const isServiceOwner = useCallback((service: ServiceItem): boolean => {
    if (currentOwner.id && service.ownerId && service.ownerId === currentOwner.id) return true;
    if (myServiceTokens[service.id]) return true;
    if (myServiceIds.includes(service.id)) return true;
    if (authUser) {
      if (service.ownerId && service.ownerId === authUser.uid) {
        return true;
      }
      if (service.ownerEmail && authUser.email && service.ownerEmail.toLowerCase() === authUser.email.toLowerCase()) {
        return true;
      }
    }
    return false;
  }, [currentOwner.id, myServiceTokens, myServiceIds, authUser]);

  /**
   * Secure property ownership check:
   * - Verified custom owner profile matching property.ownerId
   * - Valid private edit token possessed by this device in myListingTokens
   * - Verified property ID registered by this device in myPropertyIds
   * - Logged-in Firebase account matching property.ownerId or property.ownerEmail
   * Strictly prevents mixing listings between owners or devices.
   */
  const isPropertyOwner = useCallback((property: PropertyListing): boolean => {
    if (currentOwner.id && property.ownerId && property.ownerId === currentOwner.id) return true;
    if (myListingTokens[property.id]) return true;
    if (myPropertyIds.includes(property.id)) return true;
    if (authUser) {
      if (property.ownerId && property.ownerId === authUser.uid) return true;
      if (property.ownerEmail && authUser.email && property.ownerEmail.toLowerCase() === authUser.email.toLowerCase()) return true;
    }
    return false;
  }, [currentOwner.id, myListingTokens, myPropertyIds, authUser]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('All');
  const [selectedType, setSelectedType] = useState<PropertyType>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('RELEVANCE');
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>(defaultFilterCriteria);
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'map' | 'tiffin' | 'services' | 'saved' | 'owner' | 'detail'>('explore');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Real-time Firebase Authentication listener for Admin and Landlords
  useEffect(() => {
    if (!auth) {
      setIsAdminLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setIsOwnerAuthenticated(!!user);

      const isAuthorizedEmail = Boolean(
        user && user.email && 
        isAuthorizedAdminEmail(user.email)
      );
      setAdminUser(user && isAuthorizedAdminEmail(user.email) ? user : null);
      setIsAdminAuthenticated(isAuthorizedEmail);
      setIsAdminLoading(false);

      if (user) {
        if (isAuthorizedEmail) {
          // Admin account: preserve owner profile completely independent of admin session
          setAdminUser(user);
          setIsAdminAuthenticated(true);
        } else {
          // Logged-in Landlord / Owner:
          // Check for saved profile for this specific owner UID
          const savedOwnerForUser = localStorage.getItem(`gondia_stay_owner_${user.uid}`);
          let loadedProfile: OwnerProfile | null = null;
          if (savedOwnerForUser) {
            try {
              loadedProfile = JSON.parse(savedOwnerForUser);
            } catch {}
          }
          if (loadedProfile && loadedProfile.id === user.uid) {
            setCurrentOwner(loadedProfile);
            localStorage.setItem('gondia_stay_current_owner', JSON.stringify(loadedProfile));
            localStorage.setItem('gondia_stay_persistent_owner', JSON.stringify(loadedProfile));
          } else {
            // Check if there is an existing persistent device profile to associate with this UID
            const existingSaved = localStorage.getItem('gondia_stay_current_owner') || localStorage.getItem('gondia_stay_persistent_owner');
            let existingParsed: OwnerProfile | null = null;
            if (existingSaved) {
              try { existingParsed = JSON.parse(existingSaved); } catch {}
            }
            const newOwner: OwnerProfile = {
              id: user.uid,
              email: user.email || '',
              name: existingParsed?.name || user.displayName || '',
              phone: existingParsed?.phone || '',
              whatsappNumber: existingParsed?.whatsappNumber || ''
            };
            setCurrentOwner(newOwner);
            localStorage.setItem('gondia_stay_current_owner', JSON.stringify(newOwner));
            localStorage.setItem('gondia_stay_persistent_owner', JSON.stringify(newOwner));
          }
        }
      } else {
        // Guest / zero-login owner: preserve persistent device owner profile across reloads
        try {
          const saved = localStorage.getItem('gondia_stay_current_owner') || localStorage.getItem('gondia_stay_persistent_owner');
          if (saved) {
            const parsed = JSON.parse(saved) as OwnerProfile;
            if (parsed && (parsed.name || parsed.phone || parsed.id)) {
              setCurrentOwner(prev => ({
                ...prev,
                ...parsed
              }));
              localStorage.setItem('gondia_stay_current_owner', JSON.stringify(parsed));
            }
          }
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore owner profile listener
  useEffect(() => {
    if (!isFirebaseConfigured() || !currentOwner.id || isAdminAuthenticated) return;
    const unsubscribe = subscribeToOwnerProfile(currentOwner.id, (remoteOwner) => {
      if (remoteOwner && remoteOwner.id === currentOwner.id) {
        setCurrentOwner(remoteOwner);
        localStorage.setItem('gondia_stay_current_owner', JSON.stringify(remoteOwner));
        localStorage.setItem(`gondia_stay_owner_${remoteOwner.id}`, JSON.stringify(remoteOwner));
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentOwner.id, isAdminAuthenticated]);

  // Clear firestore error manually
  const clearFirestoreError = useCallback(() => {
    setFirestoreError(null);
  }, []);

  // Set up real-time Cloud Firestore subscription on the 'properties' collection
  // Requirement 4: Real-time listener ensures admin dashboard and public users update automatically
  useEffect(() => {
    const configured = isFirebaseConfigured();
    setIsFirebaseConnected(configured);

    if (!configured) {
      setIsFirestoreLoading(false);
      return;
    }

    setIsFirestoreLoading(true);

    const unsubscribe = subscribeToFirestoreProperties(
      (remoteProperties) => {
        setIsFirestoreLoading(false);
        setFirestoreError(null);
        setProperties(() => {
          const remoteMap = new Map(remoteProperties.map(p => [p.id, p]));
          const merged: PropertyListing[] = [...remoteProperties];

          const locallyTracked = getSubmittedProperties();
          let localUpdated = false;
          const updatedLocallyTracked = locallyTracked.map(localProp => {
            const remoteVersion = remoteMap.get(localProp.id);
            if (remoteVersion) {
              if (remoteVersion.status !== localProp.status) {
                localUpdated = true;
                return { ...localProp, status: remoteVersion.status };
              }
            }
            return localProp;
          });
          if (localUpdated) {
            try {
              localStorage.setItem('gondia_stay_my_submitted_properties', JSON.stringify(updatedLocallyTracked));
            } catch {
              // Ignore
            }
          }

          locallyTracked.forEach(localProp => {
            if (!remoteMap.has(localProp.id)) {
              merged.push(localProp);
            }
          });

          merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          return merged;
        });
      },
      (error) => {
        setIsFirestoreLoading(false);
        const msg = error.message || 'Error connecting to Cloud Firestore';
        setFirestoreError(msg);
        console.warn('[GondiaStay] Firestore sync warning:', msg);
      },
      isAdminAuthenticated
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdminAuthenticated]);

  // Set up real-time Cloud Firestore subscription on the 'services' collection
  useEffect(() => {
    const configured = isFirebaseConfigured();
    if (!configured) return;

    const unsubscribe = subscribeToFirestoreServices(
      (remoteServices) => {
        setServices(() => {
          const remoteMap = new Map(remoteServices.map(s => [s.id, s]));
          const merged: ServiceItem[] = [...remoteServices];

          const locallyTracked = getSubmittedServices();
          let localUpdated = false;
          const updatedLocallyTracked = locallyTracked.map(localSrv => {
            const remoteVersion = remoteMap.get(localSrv.id);
            if (remoteVersion) {
              if (remoteVersion.status !== localSrv.status) {
                localUpdated = true;
                return { ...localSrv, status: remoteVersion.status };
              }
            }
            return localSrv;
          });
          if (localUpdated) {
            try {
              localStorage.setItem('gondia_stay_my_submitted_services', JSON.stringify(updatedLocallyTracked));
            } catch {
              // Ignore
            }
          }

          locallyTracked.forEach(localSrv => {
            if (!remoteMap.has(localSrv.id)) {
              merged.push(localSrv);
            }
          });

          merged.sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return (b.createdAt || 0) - (a.createdAt || 0);
          });
          return merged;
        });
      },
      (error) => {
        console.warn('[GondiaStay] Services sync notice:', error.message);
      },
      isAdminAuthenticated
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdminAuthenticated]);

  useEffect(() => {
    localStorage.setItem('gondia_stay_tiffins', JSON.stringify(tiffinServices));
  }, [tiffinServices]);

  useEffect(() => {
    localStorage.setItem('gondia_stay_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (currentOwner.name || currentOwner.phone || currentOwner.whatsappNumber) {
      localStorage.setItem('gondia_stay_current_owner', JSON.stringify(currentOwner));
      localStorage.setItem('gondia_stay_persistent_owner', JSON.stringify(currentOwner));
    }
  }, [currentOwner]);

  const toggleFavorite = (propertyId: string) => {
    setFavorites(prev => {
      const exists = prev.includes(propertyId);
      const updated = exists ? prev.filter(id => id !== propertyId) : [...prev, propertyId];
      showToast(exists ? "Removed from Saved" : "Saved to Favorites!");
      return updated;
    });
  };

  const switchOwner = (_ownerId: string) => {
    // Single real owner console (demo switcher removed)
  };

  const updateOwnerPhone = async (newPhone: string) => {
    if (!newPhone.trim() || !isValidIndianMobileNumber(newPhone)) {
      showToast("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }
    await updateOwnerProfile({ phone: newPhone.trim() });
    showToast("Contact number updated successfully.");
  };

  /**
   * Updates real owner profile and synchronizes directly with Firebase Firestore.
   * Requirement 1: Use real owner information stored in Firebase.
   */
  const updateOwnerProfile = async (updates: Partial<OwnerProfile>): Promise<void> => {
    if (updates.phone && !isValidIndianMobileNumber(updates.phone)) {
      showToast("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 for phone.");
      return;
    }
    if (updates.whatsappNumber && !isValidIndianMobileNumber(updates.whatsappNumber)) {
      showToast("Please enter a valid 10-digit Indian WhatsApp number starting with 6, 7, 8, or 9.");
      return;
    }
    let deviceToken = currentOwner.deviceToken || localStorage.getItem('gondia_stay_owner_device_token');
    if (!deviceToken) {
      deviceToken = generateDeviceToken();
      localStorage.setItem('gondia_stay_owner_device_token', deviceToken);
    }

    let ownerId = currentOwner.id || localStorage.getItem('gondia_stay_device_owner_id');
    if (!ownerId || ownerId === 'owner_gondia_primary' || ownerId === 'owner_unauthenticated') {
      ownerId = (authUser && !isAdminAuthenticated) ? authUser.uid : generateUniqueOwnerId();
      localStorage.setItem('gondia_stay_device_owner_id', ownerId);
    }

    const updated: OwnerProfile = {
      ...currentOwner,
      ...updates,
      id: (authUser && !isAdminAuthenticated) ? authUser.uid : ownerId,
      deviceToken
    };

    if (updates.phone && !updates.whatsappNumber && !currentOwner.whatsappNumber) {
      updated.whatsappNumber = updates.phone;
    }

    setCurrentOwner(updated);
    localStorage.setItem('gondia_stay_current_owner', JSON.stringify(updated));
    localStorage.setItem('gondia_stay_persistent_owner', JSON.stringify(updated));
    localStorage.setItem('gondia_stay_owner_device_token', deviceToken);
    localStorage.setItem('gondia_stay_device_owner_id', updated.id);
    if (updated.id) {
      localStorage.setItem(`gondia_stay_owner_${updated.id}`, JSON.stringify(updated));
    }

    // Secure server-side device token validation & registration
    try {
      await registerDeviceTokenInFirestore(updated.id, deviceToken, updated);
    } catch (err) {
      console.warn('Server-side token registration notice:', err);
    }

    if (isFirebaseConfigured() && updated.id) {
      try {
        await saveOwnerProfileToFirestore(updated);
        // Also update any properties belonging to this owner so tenant view sees new info
        const myProps = properties.filter(p => p.ownerId === updated.id);
        for (const prop of myProps) {
          await savePropertyToFirestore({
            ...prop,
            ownerName: updated.name,
            ownerPhone: updated.phone,
            ownerWhatsappNumber: updated.whatsappNumber || updated.phone
          }, true);
        }
      } catch (err) {
        console.warn('Failed to sync profile to Firestore:', err);
      }
    }

    showToast("Owner profile & device token saved successfully!");
  };

  /**
   * Updates rental occupancy status in Firebase Firestore.
   * Requirement 5: Rental Occupancy Management
   * Occupied properties remain approved but are excluded from available tenant searches,
   * display OCCUPIED label, and hide direct owner contact from tenants.
   */
  const updatePropertyOccupancy = async (
    propertyId: string, 
    occupancyStatus: 'AVAILABLE' | 'OCCUPIED',
    editToken?: string
  ): Promise<void> => {
    // Immediately reflect occupancy status in local properties state
    setProperties(prev => prev.map(p => 
      p.id === propertyId 
        ? { ...p, occupancyStatus, updatedAt: Date.now() }
        : p
    ));
    setSelectedProperty(prev => (prev && prev.id === propertyId ? { ...prev, occupancyStatus, updatedAt: Date.now() } : prev));

    const tokenToUse = editToken || myListingTokens[propertyId];

    if (isFirebaseConfigured()) {
      try {
        await updatePropertyOccupancyInFirestore(propertyId, occupancyStatus, tokenToUse);
      } catch (err: any) {
        console.warn('Error syncing occupancy in Firestore:', err);
      }
    }

    showToast(occupancyStatus === 'OCCUPIED' 
      ? "Property marked as Rented / Occupied!" 
      : "Property marked as Available for Rent!");
  };

  /**
   * Saves a property listing directly to Cloud Firestore.
   * Requirement 1: Allow owners to submit properties without login, email, password, or OTP.
   * Returns SavePropertyResult with unique unguessable private editToken & editUrl.
   */
  const saveProperty = async (
    property: PropertyListing, 
    isEdit: boolean,
    editToken?: string
  ): Promise<SavePropertyResult> => {
    try {
      const tokenToUse = editToken || myListingTokens[property.id];
      const propertyWithLinkedOwner: PropertyListing = {
        ...property,
        ownerId: (property.ownerId && property.ownerId !== 'owner_unauthenticated')
          ? property.ownerId
          : (currentOwner.id || property.ownerId)
      };
      const result = await savePropertyToFirestore(propertyWithLinkedOwner, isEdit, tokenToUse);
      if (result.editToken) {
        saveListingToken(result.propertyId, result.editToken);
      }

      const targetExisting = properties.find(p => p.id === result.propertyId);
      const isAlreadyApproved = Boolean(isEdit && targetExisting && targetExisting.status === 'approved' && !isAdminAuthenticated);

      // Ensure newly submitted listing is updated in local state:
      // For approved listing edited by non-admin: keep approved live listing intact, store in pendingEdit
      // For admin or pending listing: update directly
      setProperties(prev => {
        const existingIdx = prev.findIndex(p => p.id === result.propertyId);
        if (existingIdx >= 0) {
          const current = prev[existingIdx];
          const updated = [...prev];
          if (isAlreadyApproved) {
            updated[existingIdx] = {
              ...current,
              hasPendingEdit: true,
              pendingEdit: {
                ...property,
                submittedAt: Date.now()
              },
              updatedAt: Date.now()
            };
          } else {
            updated[existingIdx] = {
              ...current,
              ...property,
              id: result.propertyId,
              status: isEdit ? (current.status || 'pending') : 'pending',
              hasPendingEdit: false,
              pendingEdit: undefined,
              updatedAt: Date.now()
            };
          }
          return updated;
        }
        const newListing: PropertyListing = {
          ...property,
          id: result.propertyId,
          status: 'pending',
          occupancyStatus: property.occupancyStatus || 'AVAILABLE',
          createdAt: property.createdAt || Date.now(),
          updatedAt: Date.now()
        };
        saveSubmittedProperty(newListing);
        savePropertyId(result.propertyId);
        return [newListing, ...prev];
      });

      if (isEdit) {
        if (isAlreadyApproved) {
          showToast("Proposed edits submitted for reapproval! Live listing remains visible to tenants.");
        } else if (isAdminAuthenticated) {
          showToast("Listing updated & published directly!");
        } else {
          showToast("Listing updated securely in Cloud Firestore!");
        }
      } else {
        showToast("Listing submitted for review! Private edit link generated.");
      }
      return result;
    } catch (error: any) {
      console.error('Error saving property to Firestore:', error);
      showToast('Error saving: ' + (error.message || 'Check database connection'));
      throw error;
    }
  };

  /**
   * Deletes a property listing with a temporary 5–10 second UNDO option (8 seconds).
   * After confirming property deletion (tapping Yes), show a temporary "Property deleted – UNDO" option for 5–10 seconds.
   * If Undo is tapped, restores property with all original details, photos, ownership credentials and status.
   * If the timer expires, completes permanent deletion in Cloud Firestore.
   */
  const deleteProperty = async (propertyId: string): Promise<void> => {
    const targetProp = properties.find(p => p.id === propertyId);
    if (!isAdminAuthenticated && targetProp && !isPropertyOwner(targetProp)) {
      showToast("Unauthorized: Only the listing owner or admin can delete this property.");
      return;
    }

    if (!targetProp) return;

    // If another property was already pending deletion, finalize it immediately
    if (pendingDeletionRef.current) {
      const previous = pendingDeletionRef.current;
      pendingDeletionRef.current = null;
      setPendingPropertyDeletion(null);
      await finalizePendingDeletion(previous);
    }

    const token = myListingTokens[propertyId];
    const propertyCopy: PropertyListing = { ...targetProp };

    // Remove from UI immediately so user sees deletion take effect
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    if (selectedProperty?.id === propertyId) {
      setSelectedProperty(null);
      setActiveTab('explore');
    }

    // 7-second temporary undo option (7 seconds)
    const DURATION_SECONDS = 7;
    const expiresAt = Date.now() + DURATION_SECONDS * 1000;
    const pendingItem = { property: propertyCopy, token };
    pendingDeletionRef.current = pendingItem;

    setPendingPropertyDeletion({
      property: propertyCopy,
      token,
      expiresAt,
      secondsRemaining: DURATION_SECONDS
    });

    deletionIntervalRef.current = setInterval(() => {
      setPendingPropertyDeletion(prev => {
        if (!prev) return null;
        const remaining = Math.max(0, Math.ceil((prev.expiresAt - Date.now()) / 1000));
        return { ...prev, secondsRemaining: remaining };
      });
    }, 500);

    deletionTimerRef.current = setTimeout(async () => {
      if (deletionIntervalRef.current) {
        clearInterval(deletionIntervalRef.current);
        deletionIntervalRef.current = null;
      }
      const itemToDelete = pendingDeletionRef.current;
      pendingDeletionRef.current = null;
      setPendingPropertyDeletion(null);

      if (itemToDelete) {
        await finalizePendingDeletion(itemToDelete);
      }
    }, DURATION_SECONDS * 1000);
  };

  /**
   * Restores the deleted property with all its original details, photos, ownership credentials, and status.
   */
  const undoPropertyDeletion = useCallback(() => {
    if (deletionTimerRef.current) {
      clearTimeout(deletionTimerRef.current);
      deletionTimerRef.current = null;
    }
    if (deletionIntervalRef.current) {
      clearInterval(deletionIntervalRef.current);
      deletionIntervalRef.current = null;
    }

    const item = pendingDeletionRef.current;
    if (!item) return;

    pendingDeletionRef.current = null;
    setPendingPropertyDeletion(null);

    // Restore property with all original details, photos, occupancy, and approval status
    setProperties(prev => {
      if (prev.some(p => p.id === item.property.id)) return prev;
      return [item.property, ...prev];
    });

    // Restore ownership credentials / token
    if (item.token) {
      setMyListingTokens(prev => {
        const updated = { ...prev, [item.property.id]: item.token! };
        localStorage.setItem('gondia_stay_listing_tokens', JSON.stringify(updated));
        return updated;
      });
    }

    saveSubmittedProperty(item.property);
    savePropertyId(item.property.id);

    showToast("Property restored successfully");
  }, [savePropertyId]);

  const toggleFeatured = (propertyId: string) => {
    setProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        const next = !p.isFeatured;
        showToast(next ? "Marked as Featured (₹0 Commission)" : "Standard listing");
        return { ...p, isFeatured: next };
      }
      return p;
    }));
  };

  /**
   * Admin Moderation: Approve or reject a listing in Cloud Firestore.
   * Requirement 5: Let admin approve or reject listings from the admin dashboard.
   */
  const approveProperty = async (propertyId: string, approve: boolean): Promise<boolean> => {
    const targetProp = properties.find(p => p.id === propertyId);
    if (!targetProp) return false;

    if (!isAdminAuthenticated) {
      showToast("Admin verification required to approve listings.");
      return false;
    }

    if (isFirebaseConfigured()) {
      try {
        const moderatorId = adminUser?.email || 'admin_moderator';
        await moderatePropertyInFirestore(
          propertyId, 
          approve, 
          moderatorId
        );
      } catch (err: any) {
        console.warn('Firestore moderation notice:', err);
      }
    }

    // Immediately reflect approval/rejection in local state
    setProperties(prev => prev.map(p => 
      p.id === propertyId 
        ? { ...p, status: approve ? 'approved' : 'rejected', updatedAt: Date.now() }
        : p
    ));
    updateSubmittedPropertyStatus(propertyId, approve ? 'approved' : 'rejected');
    showToast(approve ? "Listing approved in Cloud Firestore! Live for all visitors." : "Listing rejected.");
    return true;
  };

  /**
   * Admin Moderation: Approve or reject proposed edits for an already approved property.
   */
  const moderatePropertyEdit = async (propertyId: string, approve: boolean): Promise<boolean> => {
    if (!isAdminAuthenticated) {
      showToast("Admin verification required to moderate listing edits.");
      return false;
    }

    const moderatorId = adminUser?.email || 'admin_moderator';

    if (isFirebaseConfigured()) {
      try {
        await moderatePropertyEditInFirestore(propertyId, approve, moderatorId);
      } catch (err: any) {
        console.warn('Firestore moderation notice:', err);
      }
    }

    // Immediately reflect approval/rejection of edit in local state
    setProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        if (approve && p.pendingEdit) {
          const { submittedAt, ...cleanPending } = p.pendingEdit as any;
          return {
            ...p,
            ...cleanPending,
            status: 'approved',
            hasPendingEdit: false,
            pendingEdit: undefined,
            updatedAt: Date.now(),
            moderatedAt: Date.now(),
            moderatedBy: moderatorId
          };
        } else {
          // Reject edit: discard pendingEdit, keep live listing approved & intact
          return {
            ...p,
            hasPendingEdit: false,
            pendingEdit: undefined,
            updatedAt: Date.now(),
            moderatedAt: Date.now(),
            moderatedBy: moderatorId
          };
        }
      }
      return p;
    }));

    showToast(approve ? "Proposed property edits approved and published live!" : "Proposed property edits rejected. Live listing remains intact.");
    return true;
  };

  /**
   * Submits a new local service to Cloud Firestore and updates local state.
   */
  const saveService = async (
    service: Partial<ServiceItem>
  ): Promise<{ success: boolean; serviceId: string; ownerId?: string; editToken?: string; error?: string }> => {
    const serviceWithLinkedOwner: Partial<ServiceItem> = {
      ...service,
      ownerId: service.ownerId || currentOwner.id
    };
    const result = await saveServiceToFirestore(serviceWithLinkedOwner, isAdminAuthenticated);
    if (result.success) {
      saveServiceId(result.serviceId);
      if (result.editToken) {
        saveServiceToken(result.serviceId, result.editToken);
      }
      showToast(isAdminAuthenticated ? "Service listing published!" : "Service submitted! Awaiting admin verification.");
      const cleanService: ServiceItem = {
        id: result.serviceId,
        title: service.title || '',
        category: service.category || 'MESS_TIFFIN',
        providerName: service.providerName || '',
        ownerName: service.providerName || '',
        ownerId: result.ownerId || service.ownerId,
        editToken: result.editToken || service.editToken,
        phone: service.phone || '',
        whatsappNumber: service.whatsappNumber || service.phone || '',
        charges: service.charges || '',
        description: service.description || '',
        serviceAreas: service.serviceAreas || ['All Gondia'],
        locality: service.locality || 'Civil Lines',
        photos: service.photos || [],
        businessCardPhoto: service.businessCardPhoto || '',
        status: (isAdminAuthenticated ? 'approved' : 'pending') as any,
        timing: service.timing || '8:00 AM - 8:00 PM',
        createdAt: Date.now()
      };
      saveSubmittedService(cleanService);
      setServices(prev => [cleanService, ...prev.filter(s => s.id !== result.serviceId)]);
    } else {
      showToast(result.error || "Failed to save service");
    }
    return result;
  };

  /**
   * Updates fields of an existing service in Cloud Firestore.
   * - If caller is admin: publishes directly.
   * - If caller is service provider of an approved listing: stores proposed changes in pendingEdit for admin reapproval.
   */
  const updateService = async (
    serviceId: string,
    updatedFields: Partial<ServiceItem>
  ): Promise<{ success: boolean; error?: string }> => {
    const targetService = services.find(s => s.id === serviceId);
    if (!isAdminAuthenticated && targetService && !isServiceOwner(targetService)) {
      showToast("Unauthorized: You can only edit your own service listing.");
      return { success: false, error: "Unauthorized: You can only edit your own service listing." };
    }

    const token = myServiceTokens[serviceId] || targetService?.editToken;
    const result = await updateServiceInFirestore(serviceId, updatedFields, isAdminAuthenticated, token);
    if (result.success) {
      const isApprovedLive = Boolean(targetService && targetService.status === 'approved' && !isAdminAuthenticated);

      if (isApprovedLive) {
        setServices(prev => prev.map(s => s.id === serviceId ? {
          ...s,
          hasPendingEdit: true,
          pendingEdit: {
            ...updatedFields,
            submittedAt: Date.now()
          },
          updatedAt: Date.now()
        } : s));
        showToast("Proposed changes submitted for verification! Your live service remains visible to customers.");
      } else {
        setServices(prev => prev.map(s => s.id === serviceId ? {
          ...s,
          ...updatedFields,
          hasPendingEdit: false,
          pendingEdit: undefined,
          updatedAt: Date.now()
        } : s));
        showToast(isAdminAuthenticated ? "Service updated and published directly!" : "Service details updated!");
      }
    } else {
      showToast(result.error || "Failed to update service");
    }
    return result;
  };

  /**
   * Moderates (approves or rejects) a service listing in Cloud Firestore.
   */
  const moderateService = async (serviceId: string, approve: boolean): Promise<boolean> => {
    if (!isAdminAuthenticated) {
      showToast("Admin verification required to moderate services.");
      return false;
    }
    const adminEmail = adminUser?.email || 'admin';
    const success = await moderateServiceInFirestore(serviceId, approve, adminEmail);
    if (success) {
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: (approve ? 'approved' : 'rejected') as any } : s));
      updateSubmittedServiceStatus(serviceId, approve ? 'approved' : 'rejected');
      showToast(approve ? "Service approved! Live for all visitors in Gondia." : "Service rejected.");
    }
    return success;
  };

  /**
   * Admin Moderation: Approve or reject proposed edits on an approved service listing.
   */
  const moderateServiceEdit = async (serviceId: string, approve: boolean): Promise<boolean> => {
    if (!isAdminAuthenticated) {
      showToast("Admin verification required to moderate service edits.");
      return false;
    }
    const adminEmail = adminUser?.email || 'admin';
    const success = await moderateServiceEditInFirestore(serviceId, approve, adminEmail);
    if (success) {
      setServices(prev => prev.map(s => {
        if (s.id === serviceId) {
          if (approve && s.pendingEdit) {
            const { submittedAt, ...merged } = s.pendingEdit as any;
            return {
              ...s,
              ...merged,
              status: 'approved',
              hasPendingEdit: false,
              pendingEdit: undefined,
              updatedAt: Date.now(),
              moderatedAt: Date.now(),
              moderatedBy: adminEmail
            };
          } else {
            // Reject proposed edit: live approved service remains untouched
            return {
              ...s,
              hasPendingEdit: false,
              pendingEdit: undefined,
              updatedAt: Date.now(),
              moderatedAt: Date.now(),
              moderatedBy: adminEmail
            };
          }
        }
        return s;
      }));
      showToast(approve ? "Proposed service edits approved and published live!" : "Proposed service edits rejected. Live listing remains intact.");
    }
    return success;
  };

  /**
   * Deletes a service listing with a temporary 7-second UNDO option.
   * If Undo is tapped, restores service with all original details, photos, ownership credentials and status.
   * If the timer expires, completes permanent deletion in Cloud Firestore.
   */
  const deleteService = async (serviceId: string): Promise<boolean> => {
    const targetService = services.find(s => s.id === serviceId);
    if (!isAdminAuthenticated && targetService && !isServiceOwner(targetService)) {
      showToast("Unauthorized: Only the listing owner or admin can delete this service.");
      return false;
    }

    if (!targetService) return false;

    // If another service was already pending deletion, finalize it immediately
    if (pendingServiceDeletionRef.current) {
      const previous = pendingServiceDeletionRef.current;
      pendingServiceDeletionRef.current = null;
      setPendingServiceDeletion(null);
      await finalizePendingServiceDeletion(previous);
    }

    const token = myServiceTokens[serviceId] || targetService.editToken;
    const ownerId = targetService.ownerId;
    const serviceCopy: ServiceItem = { ...targetService };

    // Remove from UI immediately so user sees deletion take effect
    setServices(prev => prev.filter(s => s.id !== serviceId));

    // 7-second temporary undo option
    const DURATION_SECONDS = 7;
    const expiresAt = Date.now() + DURATION_SECONDS * 1000;
    const pendingItem = { service: serviceCopy, token, ownerId };
    pendingServiceDeletionRef.current = pendingItem;

    setPendingServiceDeletion({
      service: serviceCopy,
      token,
      ownerId,
      expiresAt,
      secondsRemaining: DURATION_SECONDS
    });

    serviceDeletionIntervalRef.current = setInterval(() => {
      setPendingServiceDeletion(prev => {
        if (!prev) return null;
        const remaining = Math.max(0, Math.ceil((prev.expiresAt - Date.now()) / 1000));
        return { ...prev, secondsRemaining: remaining };
      });
    }, 500);

    serviceDeletionTimerRef.current = setTimeout(async () => {
      if (serviceDeletionIntervalRef.current) {
        clearInterval(serviceDeletionIntervalRef.current);
        serviceDeletionIntervalRef.current = null;
      }
      const itemToDelete = pendingServiceDeletionRef.current;
      pendingServiceDeletionRef.current = null;
      setPendingServiceDeletion(null);

      if (itemToDelete) {
        await finalizePendingServiceDeletion(itemToDelete);
      }
    }, DURATION_SECONDS * 1000);

    return true;
  };

  /**
   * Restores the deleted service with all its original details, photos, ownership credentials, and status.
   */
  const undoServiceDeletion = useCallback(() => {
    if (serviceDeletionTimerRef.current) {
      clearTimeout(serviceDeletionTimerRef.current);
      serviceDeletionTimerRef.current = null;
    }
    if (serviceDeletionIntervalRef.current) {
      clearInterval(serviceDeletionIntervalRef.current);
      serviceDeletionIntervalRef.current = null;
    }

    const item = pendingServiceDeletionRef.current;
    if (!item) return;

    pendingServiceDeletionRef.current = null;
    setPendingServiceDeletion(null);

    // Restore service with all original details and approval status
    setServices(prev => {
      if (prev.some(s => s.id === item.service.id)) return prev;
      return [item.service, ...prev];
    });

    // Restore ownership credentials / token
    if (item.token) {
      setMyServiceTokens(prev => {
        const updated = { ...prev, [item.service.id]: item.token! };
        localStorage.setItem('gondia_stay_service_tokens', JSON.stringify(updated));
        return updated;
      });
    }

    saveSubmittedService(item.service);
    saveServiceId(item.service.id);

    showToast("Service restored successfully");
  }, [saveServiceId]);


  /**
   * Secure Admin Authentication using Firebase Authentication (Email/Password)
   */
  const loginAdminWithEmailPassword = async (
    email: string, 
    pass: string
  ): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    if (!auth) {
      const msg = 'Firebase is not initialized. Please connect your Firebase project in Settings.';
      showToast(msg);
      return { success: false, error: msg };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const isAuthorized = isAuthorizedAdminEmail(trimmedEmail);

    // Strictly enforce that only the authorized administrator email can attempt admin login
    if (!isAuthorized) {
      const errorMsg = 'Access Denied: Only the authorized GondiaStay administrator account can access the Admin Panel.';
      showToast(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (!pass || pass.trim().length === 0) {
      const errorMsg = 'Please enter your administrator password.';
      showToast(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/user-not-found') {
          // If the authorized admin user account is not yet provisioned in Firebase Auth, create it now
          userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
        } else {
          throw signInErr;
        }
      }

      const user = userCredential.user;
      const userEmail = user.email?.toLowerCase();

      if (!userEmail || !isAuthorizedAdminEmail(userEmail)) {
        await signOut(auth);
        setAdminUser(null);
        setIsAdminAuthenticated(false);
        const errorMsg = 'Access Denied: This account is not authorized as an administrator.';
        showToast(errorMsg);
        return { success: false, error: errorMsg };
      }

      setAdminUser(user);
      setIsAdminAuthenticated(true);
      showToast(`Welcome! Admin signed in as ${user.email}`);
      return { success: true };
    } catch (err: any) {
      console.error('Firebase Admin Login Error:', err);

      let errorMsg = 'Invalid email or password.';
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential'
      ) {
        errorMsg = 'Invalid administrator credentials. Access restricted to authorized admin.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Access temporarily disabled due to multiple failed attempts. Try again later.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      showToast(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const sendAdminVerificationEmail = async (): Promise<{ success: boolean; error?: string }> => {
    const targetUser = auth?.currentUser || adminUser || authUser;
    if (!targetUser) {
      const msg = 'No signed-in administrator account found to verify. Please sign in first.';
      showToast(msg);
      return { success: false, error: msg };
    }
    try {
      await sendEmailVerification(targetUser);
      showToast('Verification email sent to ' + targetUser.email + '. Please check your inbox and verify.');
      return { success: true };
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      let errorMsg = err?.message || 'Failed to send verification email.';
      if (err?.code === 'auth/too-many-requests') {
        errorMsg = 'Too many requests. Firebase has temporarily throttled verification emails. Please wait a few minutes before trying again.';
      } else if (err?.code === 'auth/user-token-expired' || err?.code === 'auth/user-disabled') {
        errorMsg = 'Session expired or invalid. Please sign out and sign in again.';
      } else if (err?.code === 'auth/network-request-failed') {
        errorMsg = 'Network error. Please check your internet connection.';
      }
      showToast(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const checkAdminVerificationStatus = async (): Promise<boolean> => {
    if (!auth?.currentUser) return false;
    try {
      await auth.currentUser.reload();
      const refreshedUser = auth.currentUser;
      const isVerified = Boolean(
        refreshedUser &&
        refreshedUser.email?.toLowerCase() === 'jangirpankaj9001@gmail.com' &&
        refreshedUser.emailVerified
      );
      setAdminUser(refreshedUser.email?.toLowerCase() === 'jangirpankaj9001@gmail.com' ? refreshedUser : null);
      setIsAdminAuthenticated(isVerified);
      if (isVerified) {
        showToast('Email ownership verified! Admin console unlocked.');
      } else {
        showToast('Email ownership not verified yet. Please check your inbox/spam folder.');
      }
      return isVerified;
    } catch (err: any) {
      console.error('Error reloading user status:', err);
      return false;
    }
  };

  const logoutAdmin = async (): Promise<void> => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Firebase sign-out error:', err);
      }
    }
    setAdminUser(null);
    setIsAdminAuthenticated(false);
    setAuthUser(null);
    setIsOwnerAuthenticated(false);

    // Restore persistent owner profile so saved details and greeting remain intact after admin sign-out
    try {
      const saved = localStorage.getItem('gondia_stay_current_owner') || localStorage.getItem('gondia_stay_persistent_owner');
      if (saved) {
        const parsed = JSON.parse(saved) as OwnerProfile;
        if (parsed && (parsed.name || parsed.phone || parsed.id)) {
          setCurrentOwner(prev => ({
            ...prev,
            ...parsed
          }));
          localStorage.setItem('gondia_stay_current_owner', JSON.stringify(parsed));
          localStorage.setItem('gondia_stay_persistent_owner', JSON.stringify(parsed));
        }
      }
    } catch {}
    showToast("Logged out of Admin Portal.");
  };

  /**
   * Secure Owner / Landlord Authentication using Firebase Auth
   */
  const loginOwnerWithEmailPassword = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth) {
      const msg = 'Firebase is not initialized. Please configure Firebase in Settings.';
      showToast(msg);
      return { success: false, error: msg };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const user = userCredential.user;
      setAuthUser(user);
      setIsOwnerAuthenticated(true);
      showToast(`Welcome! Signed in as ${user.email}`);
      return { success: true };
    } catch (err: any) {
      console.error('Landlord Login Error:', err);
      let errorMsg = 'Invalid email or password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Invalid landlord credentials. Please check your email and password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      showToast(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const registerOwnerWithEmailPassword = async (
    email: string,
    pass: string,
    name?: string,
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth) {
      const msg = 'Firebase is not initialized. Please configure Firebase in Settings.';
      showToast(msg);
      return { success: false, error: msg };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const user = userCredential.user;
      setAuthUser(user);
      setIsOwnerAuthenticated(true);
      const updatedProfile: OwnerProfile = {
        id: user.uid,
        name: name?.trim() || '',
        phone: phone?.trim() || '',
        whatsappNumber: phone?.trim() || '',
        email: email.trim()
      };
      setCurrentOwner(updatedProfile);
      localStorage.setItem('gondia_stay_current_owner', JSON.stringify(updatedProfile));
      localStorage.setItem(`gondia_stay_owner_${user.uid}`, JSON.stringify(updatedProfile));
      if (isFirebaseConfigured() && (updatedProfile.name || updatedProfile.phone)) {
        await saveOwnerProfileToFirestore(updatedProfile);
      }
      showToast(`Landlord account created! Welcome, ${name || email}`);
      return { success: true };
    } catch (err: any) {
      console.error('Landlord Registration Error:', err);
      let errorMsg = 'Registration failed.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password should be at least 6 characters.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      showToast(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logoutOwner = async (): Promise<void> => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Sign-out error:', err);
      }
    }
    setAuthUser(null);
    setIsOwnerAuthenticated(false);
    setIsAdminAuthenticated(false);
    setAdminUser(null);
    setCurrentOwner(DEFAULT_OWNER_PROFILE);
    localStorage.removeItem('gondia_stay_current_owner');
    showToast("Signed out of Landlord Console.");
  };

  // Deprecated passcode fallback helper
  const verifyAdminPasscode = (_passcode: string): boolean => {
    return isAdminAuthenticated;
  };

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const selectedPropertyRef = useRef(selectedProperty);
  selectedPropertyRef.current = selectedProperty;
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;

  const overlayStackRef = useRef<Array<{ id: string; name: string; onBack: () => void }>>([]);
  const isHandlingBackRef = useRef<boolean>(false);

  const registerOverlay = useCallback((name: string, onBack: () => void) => {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    overlayStackRef.current.push({ id, name, onBack });

    const currentDepth = (window.history.state?.depth ?? 0);
    window.history.pushState(
      {
        app: 'gondia',
        type: 'overlay',
        overlayId: id,
        overlayName: name,
        tab: activeTabRef.current,
        depth: currentDepth + 1
      },
      ''
    );

    return () => {
      const idx = overlayStackRef.current.findIndex(e => e.id === id);
      if (idx !== -1) {
        overlayStackRef.current.splice(idx, 1);
        if (!isHandlingBackRef.current) {
          if (window.history.state?.overlayId === id) {
            isHandlingBackRef.current = true;
            window.history.back();
            setTimeout(() => {
              isHandlingBackRef.current = false;
            }, 60);
          }
        }
      }
    };
  }, []);

  const navigateTo = useCallback((tab: 'explore' | 'map' | 'tiffin' | 'services' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => {
    if (property) {
      setSelectedProperty(property);
    }
    const targetTab = tab === 'tiffin' ? 'services' : tab;

    if (targetTab === activeTabRef.current && (!property || property.id === selectedPropertyRef.current?.id)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const currentDepth = (window.history.state?.depth ?? 0);
    const nextDepth = currentDepth + 1;

    window.history.pushState(
      {
        app: 'gondia',
        type: 'screen',
        tab: targetTab,
        propertyId: property?.id || null,
        fromTab: activeTabRef.current,
        depth: nextDepth
      },
      ''
    );

    setActiveTab(targetTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    if (overlayStackRef.current.length > 0) {
      window.history.back();
      return;
    }

    if (window.history.state && (window.history.state.depth ?? 0) > 0) {
      window.history.back();
    } else {
      if (activeTabRef.current !== 'explore') {
        navigateTo('explore');
      }
    }
  }, [navigateTo]);

  useEffect(() => {
    // Initialize root history state if needed
    if (!window.history.state || window.history.state.app !== 'gondia') {
      window.history.replaceState({ app: 'gondia', type: 'screen', tab: activeTab, depth: 0 }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isHandlingBackRef.current) {
        isHandlingBackRef.current = false;
        return;
      }

      // Priority 1: Close active overlay / dialog / menu if open
      if (overlayStackRef.current.length > 0) {
        const topOverlay = overlayStackRef.current.pop();
        if (topOverlay) {
          isHandlingBackRef.current = true;
          try {
            topOverlay.onBack();
          } finally {
            setTimeout(() => {
              isHandlingBackRef.current = false;
            }, 60);
          }
          return;
        }
      }

      // Priority 2: In-app screen / tab navigation
      const state = event.state;
      if (state && state.app === 'gondia' && state.tab) {
        if (state.tab !== activeTabRef.current) {
          setActiveTab(state.tab);
          if (state.tab === 'detail' && state.propertyId) {
            const prop = propertiesRef.current.find(p => p.id === state.propertyId);
            if (prop) setSelectedProperty(prop);
          } else if (activeTabRef.current === 'detail') {
            setSelectedProperty(null);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        // Returned to root or outside state
        if (activeTabRef.current !== 'explore') {
          setActiveTab('explore');
          setSelectedProperty(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const [ownerSubTab, setOwnerSubTab] = useState<'listings' | 'new' | 'moderation'>('listings');

  const openPostListing = useCallback(() => {
    setOwnerSubTab('new');
    navigateTo('owner');
  }, [navigateTo]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedLocality('All');
    setSelectedType('ALL');
    setSortOption('RELEVANCE');
    setFilterCriteria(defaultFilterCriteria);
    showToast("Filters reset to default");
  };

  return (
    <AppContext.Provider value={{
      properties,
      tiffinServices,
      services,
      saveService,
      updateService,
      moderateService,
      deleteService,
      favorites,
      currentOwner,
      searchQuery,
      selectedLocality,
      selectedType,
      sortOption,
      filterCriteria,
      selectedProperty,
      activeTab,
      toastMessage,
      isFirestoreLoading,
      firestoreError,
      isFirebaseConnected,
      isAdminAuthenticated,
      adminUser,
      isAdminLoading,
      isFirebaseModalOpen,
      authUser,
      isOwnerAuthenticated,
      ownerSubTab,
      setOwnerSubTab,
      openPostListing,
      setSearchQuery,
      setSelectedLocality,
      setSelectedType,
      setSortOption,
      setFilterCriteria,
      toggleFavorite,
      switchOwner,
      updateOwnerPhone,
      updateOwnerProfile,
      updatePropertyOccupancy,
      saveProperty,
      myListingTokens,
      saveListingToken,
      getListingToken,
      deleteProperty,
      pendingPropertyDeletion,
      undoPropertyDeletion,
      pendingServiceDeletion,
      undoServiceDeletion,
      toggleFeatured,
      approveProperty,
      navigateTo,
      goBack,
      registerOverlay,
      showToast,
      resetFilters,
      loginAdminWithEmailPassword,
      sendAdminVerificationEmail,
      checkAdminVerificationStatus,
      logoutAdmin,
      loginOwnerWithEmailPassword,
      registerOwnerWithEmailPassword,
      logoutOwner,
      verifyAdminPasscode,
      moderatePropertyEdit,
      moderateServiceEdit,
      isServiceOwner,
      isPropertyOwner,
      myServiceIds,
      saveServiceId,
      myServiceTokens,
      saveServiceToken,
      getServiceToken,
      setIsFirebaseModalOpen,
      clearFirestoreError
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

/**
 * Hook to handle Android phone Back button and browser history for modals, dialogs, drawers, and overlays.
 * When enabled, pushing back on Android phone will close this overlay first instead of closing the app.
 */
export const useBackHandler = (enabled: boolean, onBack: () => void, name?: string) => {
  const { registerOverlay } = useApp();
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) return;
    return registerOverlay(name || 'overlay', () => onBackRef.current());
  }, [enabled, name, registerOverlay]);
};
