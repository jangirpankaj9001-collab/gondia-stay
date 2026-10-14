import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  PropertyListing, 
  TiffinService, 
  PropertyType, 
  SortOption, 
  FilterCriteria, 
  OWNER_PROFILES,
  OwnerProfile
} from '../types';
import { INITIAL_TIFFINS } from '../data/initialData';
import { 
  isFirebaseConfigured, 
  ADMIN_PASSCODE 
} from '../firebase/config';
import { 
  subscribeToFirestoreProperties, 
  savePropertyToFirestore, 
  moderatePropertyInFirestore, 
  deletePropertyFromFirestore
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
  isFirebaseModalOpen: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedLocality: (locality: string) => void;
  setSelectedType: (type: PropertyType) => void;
  setSortOption: (sort: SortOption) => void;
  setFilterCriteria: React.Dispatch<React.SetStateAction<FilterCriteria>>;
  toggleFavorite: (propertyId: string) => void;
  switchOwner: (ownerId: string) => void;
  updateOwnerPhone: (newPhone: string) => void;
  saveProperty: (property: PropertyListing, isEdit: boolean) => Promise<boolean>;
  deleteProperty: (propertyId: string) => Promise<void>;
  toggleFeatured: (propertyId: string) => void;
  approveProperty: (propertyId: string, approve: boolean) => Promise<boolean>;
  navigateTo: (tab: 'explore' | 'map' | 'tiffin' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => void;
  showToast: (msg: string) => void;
  resetFilters: () => void;
  verifyAdminPasscode: (passcode: string) => boolean;
  logoutAdmin: () => void;
  setIsFirebaseModalOpen: (open: boolean) => void;
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

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gondia_stay_is_admin') === 'true';
    } catch {
      return false;
    }
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
      const saved = localStorage.getItem('gondia_stay_current_owner');
      return saved ? (JSON.parse(saved) as OwnerProfile) : OWNER_PROFILES[0];
    } catch {
      return OWNER_PROFILES[0];
    }
  });

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
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [showToast]);

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

  const switchOwner = (ownerId: string) => {
    const found = OWNER_PROFILES.find(p => p.id === ownerId);
    if (found) {
      setCurrentOwner(found);
      showToast(`Switched profile to ${found.name}`);
    }
  };

  const updateOwnerPhone = async (newPhone: string) => {
    const trimmed = newPhone.trim();
    if (!trimmed) return;
    
    setCurrentOwner((prev: OwnerProfile) => ({ ...prev, phone: trimmed }));
    
    if (isFirebaseConfigured()) {
      try {
        const myProps = properties.filter(p => p.ownerId === currentOwner.id);
        for (const prop of myProps) {
          await savePropertyToFirestore({ ...prop, ownerPhone: trimmed }, true);
        }
      } catch (err) {
        console.warn('Failed to update phone on Firestore:', err);
      }
    }

    showToast("Contact number updated across your listings!");
  };

  /**
   * Saves a property listing directly to Cloud Firestore.
   * Requirement 1 & 2: Connect the owner listing submission form to Cloud Firestore and save immediately.
   * Requirement 3: Set every new listing's status to "pending".
   */
  const saveProperty = async (property: PropertyListing, isEdit: boolean): Promise<boolean> => {
    if (!isFirebaseConfigured()) {
      const err = new Error('Firebase Cloud Firestore is not configured. Please add your Firebase credentials in Settings.');
      showToast(err.message);
      throw err;
    }

    try {
      await savePropertyToFirestore(property, isEdit);
      if (isEdit) {
        showToast("Listing updated in Cloud Firestore!");
      } else {
        showToast("Listing submitted to Firestore! Status: pending approval.");
      }
      return true;
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
    if (!isFirebaseConfigured()) {
      showToast("Firebase is not connected.");
      return;
    }

    try {
      await deletePropertyFromFirestore(propertyId);
      showToast("Listing removed from Cloud Firestore.");
    } catch (err: any) {
      showToast("Error deleting listing: " + (err.message || ''));
      throw err;
    }

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

    // Never allow users to approve their own listings
    if (targetProp.ownerId === currentOwner.id) {
      showToast("Security Violation: You cannot approve your own listing.");
      return false;
    }

    if (!isFirebaseConfigured()) {
      showToast("Firebase is not connected.");
      return false;
    }

    try {
      await moderatePropertyInFirestore(
        propertyId, 
        approve, 
        'admin_moderator', 
        targetProp.ownerId
      );
      showToast(approve ? "Listing approved in Cloud Firestore! Live for all visitors." : "Listing rejected.");
      return true;
    } catch (err: any) {
      console.error('Error moderating listing in Firestore:', err);
      showToast("Moderation error: " + (err.message || ''));
      return false;
    }
  };

  const verifyAdminPasscode = (passcode: string): boolean => {
    if (passcode.trim() === ADMIN_PASSCODE.trim()) {
      setIsAdminAuthenticated(true);
      try {
        localStorage.setItem('gondia_stay_is_admin', 'true');
      } catch {}
      showToast("Admin access unlocked!");
      return true;
    }
    showToast("Incorrect Admin Passcode.");
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem('gondia_stay_is_admin');
    } catch {}
    showToast("Logged out of Admin Mode.");
  };

  const navigateTo = (tab: 'explore' | 'map' | 'tiffin' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => {
    if (property) {
      setSelectedProperty(property);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      isFirebaseModalOpen,
      setSearchQuery,
      setSelectedLocality,
      setSelectedType,
      setSortOption,
      setFilterCriteria,
      toggleFavorite,
      switchOwner,
      updateOwnerPhone,
      saveProperty,
      deleteProperty,
      toggleFeatured,
      approveProperty,
      navigateTo,
      showToast,
      resetFilters,
      verifyAdminPasscode,
      logoutAdmin,
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
