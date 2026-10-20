import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { INITIAL_TIFFINS, INITIAL_SERVICES } from '../data/initialData';
import { 
  auth,
  isFirebaseConfigured
} from '../firebase/config';
import { 
  subscribeToFirestoreProperties, 
  savePropertyToFirestore, 
  moderatePropertyInFirestore, 
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
  moderateServiceInFirestore,
  deleteServiceInFirestore,
  getCachedServices
} from '../firebase/servicesService';

interface AppContextType {
  properties: PropertyListing[];
  tiffinServices: TiffinService[];
  services: ServiceItem[];
  saveService: (service: Partial<ServiceItem>) => Promise<{ success: boolean; serviceId: string; error?: string }>;
  moderateService: (serviceId: string, approve: boolean) => Promise<boolean>;
  deleteService: (serviceId: string) => Promise<boolean>;
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
  navigateTo: (tab: 'explore' | 'map' | 'tiffin' | 'services' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => void;
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
        user.email.toLowerCase() === 'jangirpankaj9001@gmail.com' &&
        user.emailVerified
      );
      setAdminUser(user && user.email?.toLowerCase() === 'jangirpankaj9001@gmail.com' ? user : null);
      setIsAdminAuthenticated(isAuthorizedEmail);
      setIsAdminLoading(false);

      if (user) {
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
    await updateOwnerProfile({ phone: newPhone.trim() });
  };

  /**
   * Updates real owner profile and synchronizes directly with Firebase Firestore.
   * Requirement 1: Use real owner information stored in Firebase.
   */
  const updateOwnerProfile = async (updates: Partial<OwnerProfile>): Promise<void> => {
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

      // Ensure newly submitted listing is immediately in properties state with status 'pending'
      // so it appears in the Admin Panel's Pending Review tab and Owner listings
      const savedListing: PropertyListing = {
        ...property,
        id: result.propertyId,
        status: isEdit ? (property.status || 'pending') : 'pending',
        occupancyStatus: property.occupancyStatus || 'AVAILABLE',
        createdAt: property.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      setProperties(prev => {
        const existingIdx = prev.findIndex(p => p.id === result.propertyId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...savedListing };
          return updated;
        }
        return [savedListing, ...prev];
      });

      if (isEdit) {
        showToast("Listing updated securely in Cloud Firestore!");
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
   * Submits a new local service to Cloud Firestore and updates local state.
   */
  const saveService = async (
    service: Partial<ServiceItem>
  ): Promise<{ success: boolean; serviceId: string; error?: string }> => {
    const result = await saveServiceToFirestore(service, isAdminAuthenticated);
    if (result.success) {
      showToast(isAdminAuthenticated ? "Service listing published!" : "Service submitted! Awaiting admin verification.");
      const cleanService: ServiceItem = {
        id: result.serviceId,
        title: service.title || '',
        category: service.category || 'MESS_TIFFIN',
        providerName: service.providerName || '',
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
   * Deletes a service listing permanently from Cloud Firestore.
   */
  const deleteService = async (serviceId: string): Promise<boolean> => {
    if (!isAdminAuthenticated) {
      showToast("Admin verification required to delete services.");
      return false;
    }
    const success = await deleteServiceInFirestore(serviceId);
    if (success) {
      setServices(prev => prev.filter(s => s.id !== serviceId));
      showToast("Service listing removed.");
    }
    return success;
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
    const isAuthorized = trimmedEmail === 'jangirpankaj9001@gmail.com';

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
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
      const user = userCredential.user;
      const userEmail = user.email?.toLowerCase();

      if (!userEmail || userEmail !== 'jangirpankaj9001@gmail.com') {
        await signOut(auth);
        setAdminUser(null);
        setIsAdminAuthenticated(false);
        const errorMsg = 'Access Denied: This account is not authorized as an administrator.';
        showToast(errorMsg);
        return { success: false, error: errorMsg };
      }

      setAdminUser(user);
      if (!user.emailVerified) {
        setIsAdminAuthenticated(false);
        const msg = 'Email unverified: Please verify email ownership for jangirpankaj9001@gmail.com.';
        showToast(msg);
        return { success: false, needsVerification: true, error: msg };
      }

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

  const navigateTo = (tab: 'explore' | 'map' | 'tiffin' | 'services' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => {
    if (property) {
      setSelectedProperty(property);
    }
    const targetTab = tab === 'tiffin' ? 'services' : tab;
    setActiveTab(targetTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [ownerSubTab, setOwnerSubTab] = useState<'listings' | 'new' | 'moderation'>('listings');

  const openPostListing = useCallback(() => {
    setOwnerSubTab('new');
    setActiveTab('owner');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
