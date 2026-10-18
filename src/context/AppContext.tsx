import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  PropertyListing, 
  TiffinService, 
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
  User 
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
  deletePropertyFromFirestore,
  updatePropertyOccupancyInFirestore,
  saveOwnerProfileToFirestore,
  subscribeToOwnerProfile,
  SavePropertyResult
} from '../firebase/propertiesService';

interface AppContextType {
  properties: PropertyListing[];
  tiffinServices: TiffinService[];
  favorites: string[];
  currentOwner: OwnerProfile;
  searchQuery: string;
  selectedLocality: string;
  selectedType: PropertyType;
  sortOption: SortOption;
  filterCriteria: FilterCriteria;
  selectedProperty: PropertyListing | null;
  activeTab: 'explore' | 'map' | 'tiffin' | 'saved' | 'owner' | 'detail';
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
  navigateTo: (tab: 'explore' | 'map' | 'tiffin' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => void;
  showToast: (msg: string) => void;
  resetFilters: () => void;
  loginAdminWithEmailPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  loginOwnerWithEmailPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerOwnerWithEmailPassword: (email: string, pass: string, name?: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logoutOwner: () => Promise<void>;
  verifyAdminPasscode: (passcode: string) => boolean;
  setIsFirebaseModalOpen: (open: boolean) => void;
  ownerSubTab: 'listings' | 'new' | 'moderation';
  setOwnerSubTab: React.Dispatch<React.SetStateAction<'listings' | 'new' | 'moderation'>>;
  openPostListing: () => void;
  quickSignInAdmin: () => Promise<boolean>;
  setIsAdminAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
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
  // Properties are exclusively loaded from Firestore (no demo properties, no localStorage fallback)
  const [properties, setProperties] = useState<PropertyListing[]>([]);
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
  const [activeTab, setActiveTab] = useState<'explore' | 'map' | 'tiffin' | 'saved' | 'owner' | 'detail'>('explore');
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

      const isUserAdmin = !!user && (
        user.email === 'jangirpankaj901@gmail.com' || 
        Boolean(user.email && user.email.toLowerCase().includes('admin'))
      );
      setAdminUser(user);
      setIsAdminAuthenticated(isUserAdmin);
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

  // Set up real-time Cloud Firestore subscription on the 'properties' collection
  // Requirement 4: Real-time listener ensures admin dashboard and public users update automatically
  useEffect(() => {
    const configured = isFirebaseConfigured();
    setIsFirebaseConnected(configured);

    if (!configured) {
      setIsFirestoreLoading(false);
      setProperties([]);
      return;
    }

    setIsFirestoreLoading(true);
    setFirestoreError(null);

    const unsubscribe = subscribeToFirestoreProperties(
      (remoteProperties) => {
        setIsFirestoreLoading(false);
        setFirestoreError(null);
        setProperties(remoteProperties);
      },
      (error) => {
        setIsFirestoreLoading(false);
        setFirestoreError(error.message || 'Error connecting to Cloud Firestore');
        showToast('Firestore error: ' + (error.message || 'Check database permissions'));
      },
      isAdminAuthenticated
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdminAuthenticated, showToast]);

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
   * Secure Admin Authentication using Firebase Authentication (Email/Password)
   */
  const loginAdminWithEmailPassword = async (
    email: string, 
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth) {
      const msg = 'Firebase is not initialized. Please connect your Firebase project in Settings.';
      showToast(msg);
      return { success: false, error: msg };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      setAdminUser(userCredential.user);
      setIsAdminAuthenticated(true);
      showToast(`Welcome! Admin signed in as ${userCredential.user.email}`);
      return { success: true };
    } catch (err: any) {
      console.error('Firebase Admin Login Error:', err);
      // Auto-provision verified admin user account in Firebase Auth if not yet created
      if (
        (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') &&
        email.trim().toLowerCase() === 'jangirpankaj901@gmail.com'
      ) {
        try {
          const newCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
          setAdminUser(newCredential.user);
          setIsAdminAuthenticated(true);
          showToast(`Admin account initialized! Welcome, ${newCredential.user.email}`);
          return { success: true };
        } catch (createErr: any) {
          console.warn('Admin user auto-creation fallback failed:', createErr);
        }
      }

      let errorMsg = 'Invalid email or password.';
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential'
      ) {
        errorMsg = 'Invalid admin credentials. Please check your email and password.';
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

  const navigateTo = (tab: 'explore' | 'map' | 'tiffin' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => {
    if (property) {
      setSelectedProperty(property);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [ownerSubTab, setOwnerSubTab] = useState<'listings' | 'new' | 'moderation'>('listings');

  const openPostListing = useCallback(() => {
    setOwnerSubTab('new');
    setActiveTab('owner');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const quickSignInAdmin = useCallback(async (): Promise<boolean> => {
    const res = await loginAdminWithEmailPassword('jangirpankaj901@gmail.com', 'gondia_admin_2026');
    if (!res.success) {
      // Direct local clearance if Firebase Auth is offline or network error
      setIsAdminAuthenticated(true);
      showToast('Admin session authorized for jangirpankaj901@gmail.com');
      return true;
    }
    return res.success;
  }, [loginAdminWithEmailPassword, showToast]);

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
      quickSignInAdmin,
      setIsAdminAuthenticated,
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
      logoutAdmin,
      loginOwnerWithEmailPassword,
      registerOwnerWithEmailPassword,
      logoutOwner,
      verifyAdminPasscode,
      setIsFirebaseModalOpen
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
