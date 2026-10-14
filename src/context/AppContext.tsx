import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  PropertyListing, 
  TiffinService, 
  PropertyType, 
  SortOption, 
  FilterCriteria, 
  OWNER_PROFILES 
} from '../types';
import { INITIAL_PROPERTIES, INITIAL_TIFFINS } from '../data/initialData';

interface AppContextType {
  properties: PropertyListing[];
  tiffinServices: TiffinService[];
  favorites: string[];
  currentOwner: typeof OWNER_PROFILES[0];
  searchQuery: string;
  selectedLocality: string;
  selectedType: PropertyType;
  sortOption: SortOption;
  filterCriteria: FilterCriteria;
  selectedProperty: PropertyListing | null;
  activeTab: 'explore' | 'map' | 'tiffin' | 'saved' | 'owner' | 'detail';
  toastMessage: string | null;

  setSearchQuery: (query: string) => void;
  setSelectedLocality: (locality: string) => void;
  setSelectedType: (type: PropertyType) => void;
  setSortOption: (sort: SortOption) => void;
  setFilterCriteria: React.Dispatch<React.SetStateAction<FilterCriteria>>;
  toggleFavorite: (propertyId: string) => void;
  switchOwner: (ownerId: string) => void;
  updateOwnerPhone: (newPhone: string) => void;
  saveProperty: (property: PropertyListing, isEdit: boolean) => void;
  deleteProperty: (propertyId: string) => void;
  toggleFeatured: (propertyId: string) => void;
  approveProperty: (propertyId: string, approve: boolean) => void;
  navigateTo: (tab: 'explore' | 'map' | 'tiffin' | 'saved' | 'owner' | 'detail', property?: PropertyListing) => void;
  showToast: (msg: string) => void;
  resetFilters: () => void;
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
  const [properties, setProperties] = useState<PropertyListing[]>(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_properties');
      return saved ? JSON.parse(saved) : INITIAL_PROPERTIES;
    } catch {
      return INITIAL_PROPERTIES;
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

  const [currentOwner, setCurrentOwner] = useState(() => {
    try {
      const saved = localStorage.getItem('gondia_stay_current_owner');
      return saved ? JSON.parse(saved) : OWNER_PROFILES[0];
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

  useEffect(() => {
    localStorage.setItem('gondia_stay_properties', JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    localStorage.setItem('gondia_stay_tiffins', JSON.stringify(tiffinServices));
  }, [tiffinServices]);

  useEffect(() => {
    localStorage.setItem('gondia_stay_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('gondia_stay_current_owner', JSON.stringify(currentOwner));
  }, [currentOwner]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

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

  const updateOwnerPhone = (newPhone: string) => {
    const trimmed = newPhone.trim();
    if (!trimmed) return;
    
    setCurrentOwner(prev => ({ ...prev, phone: trimmed }));
    
    // Update all properties owned by this owner
    setProperties(prev => prev.map(p => {
      if (p.ownerId === currentOwner.id) {
        return { ...p, ownerPhone: trimmed };
      }
      return p;
    }));

    showToast("Contact & WhatsApp number updated across all your listings!");
  };

  const saveProperty = (property: PropertyListing, isEdit: boolean) => {
    if (isEdit) {
      setProperties(prev => prev.map(p => p.id === property.id ? property : p));
      if (selectedProperty?.id === property.id) {
        setSelectedProperty(property);
      }
      showToast("Listing updated successfully!");
    } else {
      // New listing gets PENDING status for moderation/approval workflow
      const newListing: PropertyListing = {
        ...property,
        id: `prop_${Date.now()}`,
        status: 'PENDING',
        createdAt: Date.now()
      };
      setProperties(prev => [newListing, ...prev]);
      showToast("New listing submitted! Status: Pending Approval.");
    }
  };

  const deleteProperty = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    if (selectedProperty?.id === propertyId) {
      setSelectedProperty(null);
      setActiveTab('explore');
    }
    showToast("Listing deleted.");
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

  const approveProperty = (propertyId: string, approve: boolean) => {
    setProperties(prev => prev.map(p => {
      if (p.id === propertyId) {
        const newStatus = approve ? 'APPROVED' : 'REJECTED';
        showToast(approve ? "Listing approved and live for all tenants!" : "Listing rejected.");
        return { ...p, status: newStatus };
      }
      return p;
    }));
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
      resetFilters
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
