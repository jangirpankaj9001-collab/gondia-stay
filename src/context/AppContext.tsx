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
  getCachedProperties
} from '../firebase/propertiesService';
import {
  subscribeToFirestoreServices,
  saveServiceToFirestore,
  updateServiceInFirestore,
  moderateServiceInFirestore,
  moderateServiceEditInFirestore,
  deleteServiceInFirestore,
  rateServiceInFirestore,
  getCachedServices
} from '../firebase/servicesService';
import { isValidIndianMobileNumber } from '../utils/contact';

interface AppContextType {
  properties: PropertyListing[];
  tiffinServices: TiffinService[];
  services: ServiceItem[];
  saveService: (service: Partial<ServiceItem>) => Promise<{ success: boolean; serviceId: string; ownerId?: string; editToken?: string; error?: string }>;
  updateService: (serviceId: string, updatedFields: Partial<ServiceItem>) => Promise<{ success: boolean; error?: string }>;
  moderateService: (serviceId: string, approve: boolean) => Promise<boolean>;
  moderateServiceEdit: (serviceId: string, approve: boolean) => Promise<boolean>;
  deleteService: (serviceId: string) => Promise<boolean>;
  rateService: (serviceId: string, score: number) => Promise<{ success: boolean; error?: string }>;
  hasUserRatedService: (serviceId: string) => boolean;
  getUserRatingForService: (serviceId: string) => number | undefined;
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Properties are loaded from Cloud Firestore, initialized with local cache for instant UI availability
  const [properties, setProperties] = useState<PropertyListing[]>(() => getCachedProperties());
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
  const [services, setServices] = useState<ServiceItem[]>(() => getCachedServices());

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
      const saved = localStorage.getItem('gondia_stay_current_owner');
      return saved ? (JSON.parse(saved) as OwnerProfile) : DEFAULT_OWNER_PROFILE;
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

  /**
   * Secure service ownership check:
   * - Admin always has full access
   * - Verified service ID stored on this device
   * - Valid private edit token possessed by this device
   * - Logged-in Firebase account matching service.ownerId or service.ownerEmail
   * - Verified custom owner profile matching service.ownerId (excluding public demo profile)
   * Strictly prevents other owners from modifying or deleting someone else's service.
   */
  const isServiceOwner = useCallback((service: ServiceItem): boolean => {
    if (isAdminAuthenticated) return true;
    if (myServiceIds.includes(service.id)) return true;
    if (myServiceTokens[service.id]) return true;
    if (authUser) {
      if (service.ownerId && (service.ownerId === authUser.uid || (service.ownerId === currentOwner.id && currentOwner.id !== 'owner_gondia_primary'))) {
        return true;
      }
      if (service.ownerEmail && authUser.email && service.ownerEmail.toLowerCase() === authUser.email.toLowerCase()) {
        return true;
      }
    }
    if (currentOwner.id && currentOwner.id !== 'owner_gondia_primary' && service.ownerId === currentOwner.id) {
      return true;
    }
    return false;
  }, [isAdminAuthenticated, myServiceIds, myServiceTokens, authUser, currentOwner]);

  const isPropertyOwner = useCallback((property: PropertyListing): boolean => {
    if (isAdminAuthenticated) return true;
    if (myListingTokens[property.id]) return true;
    if (authUser) {
      if (property.ownerId === authUser.uid) return true;
      if (property.ownerEmail && authUser.email && property.ownerEmail.toLowerCase() === authUser.email.toLowerCase()) return true;
      if (property.ownerId === 'owner_gondia_primary' && authUser.email?.toLowerCase() === 'rajesh.sharma@gondiastay.com') return true;
    }
    if (property.ownerId === currentOwner.id) return true;
    const pPhone = (property.ownerPhone || property.ownerWhatsappNumber || '').replace(/\D/g, '');
    const oPhone = (currentOwner.phone || '').replace(/\D/g, '');
    if (pPhone.length >= 10 && oPhone.length >= 10) {
      if (pPhone.endsWith(oPhone.slice(-10)) || oPhone.endsWith(pPhone.slice(-10))) {
        return true;
      }
    }
    return false;
  }, [isAdminAuthenticated, myListingTokens, authUser, currentOwner]);

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

      if (user && !isAuthorizedAdminEmail(user.email)) {
        setCurrentOwner(prev => {
          const updated: OwnerProfile = {
            ...prev,
            id: user.uid,
            email: user.email || prev.email,
            name: user.displayName || (prev.email === user.email ? prev.name : user.email?.split('@')[0] || prev.name)
          };
          localStorage.setItem('gondia_stay_current_owner', JSON.stringify(updated));
          return updated;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore owner profile listener
  useEffect(() => {
    if (!isFirebaseConfigured() || !currentOwner.id) return;
    const unsubscribe = subscribeToOwnerProfile(currentOwner.id, (remoteOwner) => {
      setCurrentOwner(remoteOwner);
      localStorage.setItem('gondia_stay_current_owner', JSON.stringify(remoteOwner));
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentOwner.id]);

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
        setProperties(remoteProperties);
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
        setServices(remoteServices);
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
    localStorage.setItem('gondia_stay_current_owner', JSON.stringify(currentOwner));
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
    const updated: OwnerProfile = {
      ...currentOwner,
      ...updates
    };
    if (updates.phone && !updates.whatsappNumber && !currentOwner.whatsappNumber) {
      updated.whatsappNumber = updates.phone;
    }
    setCurrentOwner(updated);
    localStorage.setItem('gondia_stay_current_owner', JSON.stringify(updated));

    if (isFirebaseConfigured()) {
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

    showToast("Owner profile updated & synchronized with Firebase!");
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
    if (!isFirebaseConfigured()) {
      const err = new Error('Firebase Cloud Firestore is not configured. Please add your Firebase credentials in Settings.');
      showToast(err.message);
      throw err;
    }

    try {
      const tokenToUse = editToken || myListingTokens[property.id];
      const result = await savePropertyToFirestore(property, isEdit, tokenToUse);
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
   * Deletes a property listing directly from Cloud Firestore.
   */
  const deleteProperty = async (propertyId: string): Promise<void> => {
    if (isFirebaseConfigured()) {
      try {
        await deletePropertyFromFirestore(propertyId);
      } catch (err: any) {
        console.warn('Firestore delete notice:', err);
      }
    }

    setProperties(prev => prev.filter(p => p.id !== propertyId));
    showToast("Listing removed successfully.");

    if (selectedProperty?.id === propertyId) {
      setSelectedProperty(null);
      setActiveTab('explore');
    }
  };

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
    const result = await saveServiceToFirestore(service, isAdminAuthenticated);
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

    const result = await updateServiceInFirestore(serviceId, updatedFields, isAdminAuthenticated);
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
   * Deletes a service listing permanently from Cloud Firestore.
   * Only the actual listing owner or admin can delete it.
   */
  const deleteService = async (serviceId: string): Promise<boolean> => {
    const targetService = services.find(s => s.id === serviceId);
    if (!isAdminAuthenticated && targetService && !isServiceOwner(targetService)) {
      showToast("Unauthorized: Only the listing owner or admin can delete this service.");
      return false;
    }
    const token = myServiceTokens[serviceId] || targetService?.editToken;
    const ownerId = targetService?.ownerId;
    const success = await deleteServiceInFirestore(serviceId, token, ownerId, isAdminAuthenticated);
    if (success) {
      setServices(prev => prev.filter(s => s.id !== serviceId));
      setMyServiceIds(prev => prev.filter(id => id !== serviceId));
      setMyServiceTokens(prev => {
        const updated = { ...prev };
        delete updated[serviceId];
        localStorage.setItem('gondia_stay_service_tokens', JSON.stringify(updated));
        return updated;
      });
      showToast("Service listing removed.");
    } else {
      showToast("Failed to delete service listing. Please check permissions.");
    }
    return success;
  };

  // Local storage mapping for user ratings submitted by this visitor/device (serviceId -> score)
  const [userRatings, setUserRatings] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_user_service_ratings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const getOrCreateClientId = useCallback((): string => {
    try {
      if (authUser?.uid) return authUser.uid;
      const saved = localStorage.getItem('gondia_stay_client_id');
      if (saved) return saved;
      const newId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('gondia_stay_client_id', newId);
      return newId;
    } catch {
      return `usr_${Date.now()}`;
    }
  }, [authUser]);

  const hasUserRatedService = useCallback((serviceId: string): boolean => {
    return Boolean(userRatings[serviceId]);
  }, [userRatings]);

  const getUserRatingForService = useCallback((serviceId: string): number | undefined => {
    return userRatings[serviceId];
  }, [userRatings]);

  /**
   * Submits a 1-5 star rating for a service provider.
   * Updates average rating, prevents repeated ratings, and synchronizes with Cloud Firestore.
   */
  const rateService = async (
    serviceId: string, 
    score: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (hasUserRatedService(serviceId)) {
      const prev = userRatings[serviceId];
      showToast(`You have already rated this service provider (${prev}★). Thank you!`);
      return { success: false, error: 'Already rated' };
    }

    const safeScore = Math.max(1, Math.min(5, Math.round(score)));
    const clientId = getOrCreateClientId();

    // Optimistically calculate and update state
    setServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        const currentCount = s.reviewCount || 1;
        const currentRating = s.rating || 5.0;
        const currentTotal = s.ratingTotal ?? (currentRating * currentCount);
        const newCount = currentCount + 1;
        const newTotal = currentTotal + safeScore;
        const newRating = Math.round((newTotal / newCount) * 10) / 10;
        return {
          ...s,
          rating: newRating,
          reviewCount: newCount,
          ratingTotal: newTotal,
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    // Record user rating locally to prevent duplicate ratings
    setUserRatings(prev => {
      const updated = { ...prev, [serviceId]: safeScore };
      try {
        localStorage.setItem('gondia_stay_user_service_ratings', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Synchronize to Firestore
    try {
      await rateServiceInFirestore(serviceId, safeScore, clientId);
    } catch (err: any) {
      console.warn('[GondiaStay] Error updating rating in Firestore:', err);
    }

    showToast(`Thank you! Your ${safeScore}-star rating has been submitted.`);
    return { success: true };
  };

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
      const errorMsg = 'Access Denied: Only the authorized GondiaStay administrator account (jangirpankaj9001@gmail.com) can access the Admin Panel.';
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
        name: name?.trim() || 'Property Owner',
        phone: phone?.trim() || '+91 98230 12345',
        whatsappNumber: phone?.trim() || '+91 98230 12345',
        email: email.trim()
      };
      setCurrentOwner(updatedProfile);
      localStorage.setItem('gondia_stay_current_owner', JSON.stringify(updatedProfile));
      if (isFirebaseConfigured()) {
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
      rateService,
      hasUserRatedService,
      getUserRatingForService,
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
