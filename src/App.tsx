import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Bed, 
  Bath, 
  Sofa, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  Plus, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Navigation, 
  Heart,
  Share2,
  Trash2,
  Edit3,
  Utensils,
  Bookmark,
  Check,
  ChevronRight,
  Filter,
  Database,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  AlertCircle,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { PropertyCard } from './components/PropertyCard';
import { TiffinCard } from './components/TiffinCard';
import { FilterModal } from './components/FilterModal';
import { FirebaseModal } from './components/FirebaseModal';
import { 
  PropertyListing, 
  PropertyType, 
  FurnishingStatus, 
  ContactMethod, 
  GONDIA_LOCALITIES, 
  PROPERTY_TYPES,
  SortOption,
  OWNER_PROFILES,
  isApproved,
  isPending,
  isRejected
} from './types';
import { formatDisplayPhone, openWhatsApp, dialPhone, openGoogleMaps } from './utils/contact';

export const App: React.FC = () => {
  const {
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
  } = useApp();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [ownerSubTab, setOwnerSubTab] = useState<'listings' | 'new' | 'moderation'>('listings');
  const [editingProperty, setEditingProperty] = useState<PropertyListing | null>(null);
  const [phoneInput, setPhoneInput] = useState(currentOwner.phone);
  const [selectedMapLocality, setSelectedMapLocality] = useState<string | null>(null);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // New Listing Form State
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    locality: GONDIA_LOCALITIES[1], // Civil Lines
    propertyType: 'FLAT' as PropertyType,
    monthlyRent: 8000,
    securityDeposit: 16000,
    bedrooms: 2,
    bathrooms: 1,
    furnishing: 'SEMI_FURNISHED' as FurnishingStatus,
    availableFrom: 'Immediate',
    amenities: ['24/7 Water', 'Wi-Fi'],
    ownerPreferredContact: 'BOTH' as ContactMethod,
    photoUrl: '/hero_gondia_stays.jpg'
  });

  // Filtered properties for Explore, Map & Saved
  // Requirement 6: Show only approved listings to public users
  // Requirement 7: Ensure every visitor opening public URL sees the same approved listings from Firestore
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // Ordinary user tabs strictly require approved status
      if (activeTab === 'explore' || activeTab === 'map' || activeTab === 'saved') {
        if (!isApproved(p.status)) return false;
      }

      // Saved tab filter
      if (activeTab === 'saved' && !favorites.includes(p.id)) {
        return false;
      }

      // Locality
      if (selectedLocality !== 'All' && p.locality !== selectedLocality) {
        return false;
      }

      // Property Type
      if (selectedType !== 'ALL' && p.propertyType !== selectedType) {
        return false;
      }

      // Rent
      if (p.monthlyRent < filterCriteria.minRent || p.monthlyRent > filterCriteria.maxRent) {
        return false;
      }

      // Bedrooms
      if (filterCriteria.bedrooms > 0 && p.bedrooms < filterCriteria.bedrooms) {
        return false;
      }

      // Furnishing
      if (filterCriteria.furnishing && p.furnishing !== filterCriteria.furnishing) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesAddress = p.address.toLowerCase().includes(q);
        const matchesLocality = p.locality.toLowerCase().includes(q);
        const matchesAmenities = p.amenities.some(a => a.toLowerCase().includes(q));
        if (!matchesTitle && !matchesAddress && !matchesLocality && !matchesAmenities) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'RENT_LOW_TO_HIGH') {
        return a.monthlyRent - b.monthlyRent;
      }
      if (sortOption === 'RENT_HIGH_TO_LOW') {
        return b.monthlyRent - a.monthlyRent;
      }
      if (sortOption === 'NEWEST') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      // RELEVANCE: Featured first, then newest
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [properties, activeTab, favorites, selectedLocality, selectedType, filterCriteria, searchQuery, sortOption]);

  // Owner properties (can see their own listings regardless of status)
  const myProperties = useMemo(() => {
    return properties.filter(p => p.ownerId === currentOwner.id);
  }, [properties, currentOwner]);

  // Pending properties for Moderation Workflow
  // Requirement 4: Real-time listener automatically updates admin dashboard when new owner submits
  const pendingProperties = useMemo(() => {
    return properties.filter(p => isPending(p.status));
  }, [properties]);

  // Handle Form Submission
  // Requirement 1 & 2: Connect owner listing form to Firestore and save immediately
  // Requirement 3: Set every new listing's status to "pending"
  // Requirement 11: Handle loading states and show clear error if listing cannot be saved
  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!formData.title.trim() || !formData.address.trim()) {
      showToast('Please fill out all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProperty) {
        const updated: PropertyListing = {
          ...editingProperty,
          title: formData.title.trim(),
          address: formData.address.trim(),
          locality: formData.locality,
          propertyType: formData.propertyType,
          monthlyRent: Number(formData.monthlyRent),
          securityDeposit: Number(formData.securityDeposit),
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          furnishing: formData.furnishing,
          availableFrom: formData.availableFrom,
          amenities: formData.amenities,
          photos: [formData.photoUrl || '/hero_gondia_stays.jpg'],
          ownerPreferredContact: formData.ownerPreferredContact,
        };
        await saveProperty(updated, true);
        setEditingProperty(null);
      } else {
        // Requirement 2: Save immediately to Firestore
        // Requirement 3: Set status to "pending"
        const newProp: PropertyListing = {
          id: `prop_${Date.now()}`,
          title: formData.title.trim(),
          address: formData.address.trim(),
          locality: formData.locality,
          city: 'Gondia',
          propertyType: formData.propertyType,
          monthlyRent: Number(formData.monthlyRent),
          securityDeposit: Number(formData.securityDeposit),
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          furnishing: formData.furnishing,
          availableFrom: formData.availableFrom,
          amenities: formData.amenities,
          photos: [formData.photoUrl || '/hero_gondia_stays.jpg'],
          ownerId: currentOwner.id,
          ownerName: currentOwner.name,
          ownerPhone: currentOwner.phone,
          ownerPreferredContact: formData.ownerPreferredContact,
          status: 'pending', // Requirement 3: status set to "pending"
          latitude: 21.4550,
          longitude: 80.1920,
          createdAt: Date.now()
        };
        await saveProperty(newProp, false);
      }

      // Reset Form on successful save
      setFormData({
        title: '',
        address: '',
        locality: GONDIA_LOCALITIES[1],
        propertyType: 'FLAT',
        monthlyRent: 8000,
        securityDeposit: 16000,
        bedrooms: 2,
        bathrooms: 1,
        furnishing: 'SEMI_FURNISHED',
        availableFrom: 'Immediate',
        amenities: ['24/7 Water', 'Wi-Fi'],
        ownerPreferredContact: 'BOTH',
        photoUrl: '/hero_gondia_stays.jpg'
      });
      setSubmissionError(null);
      setOwnerSubTab('listings');
    } catch (err: any) {
      console.error('Submission failed:', err);
      setSubmissionError(err.message || 'Failed to save listing to Cloud Firestore. Please check your connection or Firebase settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (property: PropertyListing) => {
    setEditingProperty(property);
    setSubmissionError(null);
    setFormData({
      title: property.title,
      address: property.address,
      locality: property.locality,
      propertyType: property.propertyType,
      monthlyRent: property.monthlyRent,
      securityDeposit: property.securityDeposit,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      furnishing: property.furnishing,
      availableFrom: property.availableFrom,
      amenities: property.amenities,
      ownerPreferredContact: property.ownerPreferredContact,
      photoUrl: property.photos[0] || '/hero_gondia_stays.jpg'
    });
    setOwnerSubTab('new');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists 
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      };
    });
  };

  const availableAmenities = [
    '24/7 Water', 'Wi-Fi', 'Parking (Bike/Car)', 'Power Backup', 
    'Geyser', 'CCTV Security', 'Balcony', 'Kitchen Setup'
  ];

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPasscode(adminPasscodeInput)) {
      setAdminPasscodeInput('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      {/* Top Header */}
      <Header />

      {/* Database Status Alert Bar (if disconnected or error) */}
      {!isFirebaseConnected && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs px-4 py-2.5 shadow-xs flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0 text-amber-200" />
              <span>
                <strong>Cloud Firestore Sync:</strong> Connect your existing Firebase project to enable cross-device persistence for GondiaStay.
              </span>
            </div>
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-colors shadow-xs"
            >
              Configure Firebase
            </button>
          </div>
        </div>
      )}

      {firestoreError && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Database Sync Notice: {firestoreError}</span>
            </div>
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded font-bold text-[11px]"
            >
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ===================== EXPLORE TAB ===================== */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            
            {/* Hero Banner with Direct Landlord Highlights */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-xl">
              <div className="absolute inset-0 opacity-25 mix-blend-overlay">
                <img 
                  src="/hero_gondia_stays.jpg" 
                  alt="Gondia Stay" 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="relative z-10 p-6 sm:p-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 backdrop-blur-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100% Verified Landlords in Gondia • 0% Brokerage</span>
                </div>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                  Find Rooms, Flats & Hostels in <span className="text-amber-400">Gondia</span>
                </h1>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
                  Connect directly with verified local property owners in Civil Lines, Ram Nagar, Kudwa Naka, and Rail Toly. Real-time Cloud Firestore synchronization across mobile & desktop.
                </p>

                {/* Search Bar Input */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2 max-w-xl">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search locality, flat, 1BHK, Wi-Fi, near railway station..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-400 shadow-md"
                    />
                  </div>
                  <button 
                    onClick={() => setShowFilterModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md active:scale-95"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Locality Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pl-1">
                Area:
              </span>
              {GONDIA_LOCALITIES.map(loc => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocality(loc)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedLocality === loc
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            {/* Property Type Pills & Sort Options Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {PROPERTY_TYPES.map(pt => (
                  <button
                    key={pt.type}
                    onClick={() => setSelectedType(pt.type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedType === pt.type
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                >
                  <option value="RELEVANCE">Relevance & Featured</option>
                  <option value="RENT_LOW_TO_HIGH">Rent: Low to High</option>
                  <option value="RENT_HIGH_TO_LOW">Rent: High to Low</option>
                  <option value="NEWEST">Newest Listings</option>
                </select>
              </div>
            </div>

            {/* Listings Grid Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {selectedLocality === 'All' ? 'All Verified Properties' : `Properties in ${selectedLocality}`}
                </h2>
                <p className="text-xs text-slate-500">
                  Showing {filteredProperties.length} approved listings from Cloud Firestore
                </p>
              </div>

              {(searchQuery || selectedLocality !== 'All' || selectedType !== 'ALL') && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Database Loading State */}
            {isFirestoreLoading && properties.length === 0 && (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Connecting to Cloud Firestore...</h3>
                <p className="text-xs text-slate-500">Syncing live property listings across all devices</p>
              </div>
            )}

            {/* Properties Grid (Requirement 6 & 7: Shows only approved listings across all visitors) */}
            {!isFirestoreLoading && filteredProperties.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isFirestoreLoading && filteredProperties.length === 0 && (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 space-y-4">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No approved properties yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {properties.length === 0 
                    ? "Your Cloud Firestore database is currently ready. When owners submit listings, they will appear here once approved by admin."
                    : "No approved properties match your current search and filter criteria."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setOwnerSubTab('new');
                      navigateTo('owner');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Post New Property Listing
                  </button>
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl shadow-xs"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== MAP TAB ===================== */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Interactive Gondia City Map
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live hotspots from Cloud Firestore across Civil Lines, Rail Toly, and Ram Nagar
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Approved Listings</span>
                </div>
              </div>

              {/* Interactive Vector Map of Gondia Hotspots */}
              <div className="relative w-full h-80 sm:h-96 bg-gradient-to-br from-slate-100 to-blue-50/50 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 600 400" className="w-full h-full">
                  <path 
                    d="M 50 120 Q 200 100 450 140 T 580 180" 
                    fill="none" 
                    stroke="#94a3b8" 
                    strokeWidth="6" 
                    strokeDasharray="8 6" 
                  />
                  <text x="490" y="130" fill="#64748b" fontSize="10" fontWeight="bold">Main Railway Line</text>

                  <path 
                    d="M 120 30 C 250 120 300 280 400 380" 
                    fill="none" 
                    stroke="#cbd5e1" 
                    strokeWidth="12" 
                  />
                  <text x="140" y="50" fill="#64748b" fontSize="9" fontWeight="bold">Ring Road Corridor</text>

                  {[
                    { name: 'Civil Lines', x: 260, y: 150, count: properties.filter(p => isApproved(p.status) && p.locality === 'Civil Lines').length },
                    { name: 'Rail Toly', x: 370, y: 170, count: properties.filter(p => isApproved(p.status) && p.locality === 'Rail Toly').length },
                    { name: 'Ram Nagar', x: 200, y: 280, count: properties.filter(p => isApproved(p.status) && p.locality === 'Ram Nagar').length },
                    { name: 'Kudwa Naka', x: 420, y: 270, count: properties.filter(p => isApproved(p.status) && p.locality === 'Kudwa Naka').length },
                    { name: 'Ring Road', x: 120, y: 200, count: properties.filter(p => isApproved(p.status) && p.locality === 'Ring Road').length },
                    { name: 'Station Road', x: 330, y: 215, count: properties.filter(p => isApproved(p.status) && p.locality === 'Station Road').length },
                  ].map((loc) => {
                    const isSelected = selectedMapLocality === loc.name;
                    return (
                      <g 
                        key={loc.name}
                        onClick={() => {
                          setSelectedMapLocality(isSelected ? null : loc.name);
                          setSelectedLocality(isSelected ? 'All' : loc.name);
                        }}
                        className="cursor-pointer transition-transform hover:scale-110"
                        transform={`translate(${loc.x}, ${loc.y})`}
                      >
                        <circle 
                          r={isSelected ? "22" : "18"} 
                          fill={isSelected ? "#2563eb" : "#ffffff"} 
                          stroke="#2563eb" 
                          strokeWidth="3" 
                          className="shadow-md"
                        />
                        <text 
                          y="4" 
                          textAnchor="middle" 
                          fill={isSelected ? "#ffffff" : "#1e40af"} 
                          fontSize="11" 
                          fontWeight="bold"
                        >
                          {loc.count}
                        </text>
                        <rect 
                          x="-35" 
                          y="22" 
                          width="70" 
                          height="18" 
                          rx="4" 
                          fill="#0f172a" 
                          opacity="0.85" 
                        />
                        <text 
                          x="0" 
                          y="34" 
                          textAnchor="middle" 
                          fill="#ffffff" 
                          fontSize="8" 
                          fontWeight="600"
                        >
                          {loc.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-xs">
                  <span className="font-bold text-slate-900">Tip:</span> Tap any circle to view stays in that neighborhood!
                </div>
              </div>

              {/* Stays in selected map locality */}
              <div className="mt-6">
                <h3 className="text-base font-bold text-slate-900 mb-3">
                  {selectedMapLocality ? `Stays in ${selectedMapLocality}` : 'All Mapped Stays in Gondia'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProperties.map(p => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TIFFIN TAB ===================== */}
        {activeTab === 'tiffin' && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-gradient-to-r from-amber-600 to-orange-600 text-white p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs mb-3">
                  <Utensils className="w-3.5 h-3.5" />
                  Daily Student & Working Professional Food
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
                  Verified Tiffin & Mess in Gondia
                </h1>
                <p className="text-sm sm:text-base text-amber-100 font-normal">
                  Fresh, hygienic, home-cooked daily meals delivered to your room or hostel across Gondia. Direct WhatsApp enquiry with mess vendors.
                </p>
              </div>
            </div>

            {/* Tiffin Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tiffinServices.map(tiffin => (
                <TiffinCard key={tiffin.id} tiffin={tiffin} />
              ))}
            </div>
          </div>
        )}

        {/* ===================== SAVED TAB ===================== */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-600" />
                Saved Favorites ({favorites.length})
              </h2>
              <p className="text-xs text-slate-500">
                Quickly access properties you have bookmarked for easy contact
              </p>
            </div>

            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No saved favorites yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Browse stays in Gondia and tap the heart icon on any card to save it here for quick reference.
                </p>
                <button
                  onClick={() => navigateTo('explore')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Explore Stays in Gondia
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================== OWNER HUB TAB ===================== */}
        {activeTab === 'owner' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* Owner Hub Welcome & Stats Card */}
            <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Verified Landlord Console
                    </span>
                    {isFirebaseConnected && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Database className="w-3 h-3" /> Cloud Firestore Active
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                    Welcome, {currentOwner.name}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Managing properties in Gondia • Registered Phone: <span className="text-white font-bold">{formatDisplayPhone(currentOwner.phone)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingProperty(null);
                      setSubmissionError(null);
                      setOwnerSubTab('new');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Post New Listing</span>
                  </button>
                </div>
              </div>

              {/* Quick Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                  <span className="text-xs text-slate-400 font-semibold">Your Listings</span>
                  <div className="text-2xl font-extrabold text-white mt-1">{myProperties.length}</div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                  <span className="text-xs text-slate-400 font-semibold">Approved (Live)</span>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                    {myProperties.filter(p => isApproved(p.status)).length}
                  </div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                  <span className="text-xs text-slate-400 font-semibold">Pending Review</span>
                  <div className="text-2xl font-extrabold text-amber-400 mt-1">
                    {myProperties.filter(p => isPending(p.status)).length}
                  </div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                  <span className="text-xs text-slate-400 font-semibold">Total Pending</span>
                  <div className="text-2xl font-extrabold text-amber-300 mt-1">
                    {pendingProperties.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Hub Navigation Sub-Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200">
              <div className="flex space-x-2">
                <button
                  onClick={() => setOwnerSubTab('listings')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                    ownerSubTab === 'listings'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  My Properties ({myProperties.length})
                </button>
                <button
                  onClick={() => {
                    setEditingProperty(null);
                    setSubmissionError(null);
                    setOwnerSubTab('new');
                  }}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                    ownerSubTab === 'new'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {editingProperty ? 'Edit Listing' : 'Post New Listing'}
                </button>
                <button
                  onClick={() => setOwnerSubTab('moderation')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    ownerSubTab === 'moderation'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Moderation</span>
                  {pendingProperties.length > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {pendingProperties.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Edit Phone Number Inline */}
              <div className="hidden sm:flex items-center gap-2 pb-2">
                <span className="text-xs font-bold text-slate-500">Contact:</span>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91..."
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg w-36 font-semibold"
                />
                <button
                  onClick={() => updateOwnerPhone(phoneInput)}
                  className="px-2.5 py-1 text-xs bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Sub-tab 1: My Properties List */}
            {ownerSubTab === 'listings' && (
              <div className="space-y-4">
                {myProperties.length > 0 ? (
                  <div className="space-y-3">
                    {myProperties.map(property => (
                      <div 
                        key={property.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={property.photos[0] || '/hero_gondia_stays.jpg'} 
                            alt={property.title} 
                            className="w-16 h-16 rounded-xl object-cover shrink-0" 
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isApproved(property.status)
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPending(property.status)
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isApproved(property.status) ? 'Approved • Live' : isPending(property.status) ? 'Pending Approval' : 'Rejected'}
                              </span>
                              {property.isFeatured && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-600" /> Featured
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">{property.title}</h4>
                            <p className="text-xs text-slate-500">{property.address}, {property.locality}</p>
                            <p className="text-xs font-bold text-blue-700 mt-0.5">₹{property.monthlyRent}/month</p>
                          </div>
                        </div>

                        {/* Actions for owner */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => toggleFeatured(property.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Toggle featured badge"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">{property.isFeatured ? 'Featured' : 'Make Featured'}</span>
                          </button>

                          <button
                            onClick={() => handleEditClick(property)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm('Delete this listing from Cloud Firestore?')) {
                                deleteProperty(property.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No properties listed under {currentOwner.name} yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Tap below to add your room, flat, or student PG directly to Cloud Firestore.</p>
                    <button
                      onClick={() => setOwnerSubTab('new')}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                    >
                      Post Your First Listing
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Post New Listing / Edit Form */}
            {/* Requirement 1 & 2: Connected directly to Cloud Firestore */}
            {/* Requirement 3: Set status to "pending" */}
            {/* Requirement 11: Handle loading states and clear error reporting */}
            {ownerSubTab === 'new' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingProperty ? `Edit Listing: ${editingProperty.title}` : 'Post Property Listing (0% Brokerage)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {editingProperty 
                      ? 'Update listing details. Any modifications will be saved immediately to Cloud Firestore.'
                      : 'Submissions are saved directly to Cloud Firestore with status "pending". Listings appear publicly across all devices once approved by admin.'}
                  </p>
                </div>

                {/* Inline Submission Error Display (Requirement 11) */}
                {submissionError && (
                  <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Error Saving Listing to Cloud Firestore:</div>
                      <div className="text-rose-700 mt-0.5">{submissionError}</div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsFirebaseModalOpen(true)}
                          className="px-2.5 py-1 bg-rose-700 text-white font-bold rounded-lg text-[11px]"
                        >
                          Check Firebase Settings
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmissionError(null)}
                          className="px-2.5 py-1 bg-white border border-rose-300 text-rose-800 rounded-lg text-[11px]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveListing} className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1.5">
                      Property Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spacious 2BHK Family Flat with Balcony near Railway Station"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value });
                        if (submissionError) setSubmissionError(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        Gondia Locality *
                      </label>
                      <select
                        value={formData.locality}
                        onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-semibold"
                      >
                        {GONDIA_LOCALITIES.filter(l => l !== 'All').map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        Property Type *
                      </label>
                      <select
                        value={formData.propertyType}
                        onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as PropertyType })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-semibold"
                      >
                        {PROPERTY_TYPES.filter(t => t.type !== 'ALL').map(pt => (
                          <option key={pt.type} value={pt.type}>{pt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1.5">
                      Detailed Address & Landmark *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flat 302, Shanti Heights, Near Gayatri Mandir, Civil Lines"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value });
                        if (submissionError) setSubmissionError(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Photo URL field */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1.5">
                      Photo URL (Accessible across all devices)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://... or /hero_gondia_stays.jpg"
                        value={formData.photoUrl}
                        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Tip: Enter any image URL (e.g. Imgur, Cloudinary, Unsplash). Defaults to Gondia Stay photo.
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        Monthly Rent (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="500"
                        value={formData.monthlyRent}
                        onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">
                        Security Deposit (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.securityDeposit}
                        onChange={(e) => setFormData({ ...formData, securityDeposit: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-bold"
                      />
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">Bedrooms</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">Bathrooms</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1.5">Furnishing</label>
                      <select
                        value={formData.furnishing}
                        onChange={(e) => setFormData({ ...formData, furnishing: e.target.value as FurnishingStatus })}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                      >
                        <option value="FURNISHED">Fully Furnished</option>
                        <option value="SEMI_FURNISHED">Semi Furnished</option>
                        <option value="UNFURNISHED">Unfurnished</option>
                      </select>
                    </div>
                  </div>

                  {/* Amenities Checklist */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">Amenities Included</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableAmenities.map(am => (
                        <button
                          type="button"
                          key={am}
                          onClick={() => toggleAmenity(am)}
                          className={`px-3 py-2 text-xs rounded-xl border text-left font-semibold flex items-center justify-between transition-colors ${
                            formData.amenities.includes(am)
                              ? 'bg-blue-50 border-blue-600 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{am}</span>
                          {formData.amenities.includes(am) && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Contact Mode */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1.5">
                      Tenant Contact Preference
                    </label>
                    <div className="flex gap-3">
                      {(['BOTH', 'WHATSAPP', 'PHONE'] as ContactMethod[]).map(method => (
                        <label key={method} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="contactMethod"
                            checked={formData.ownerPreferredContact === method}
                            onChange={() => setFormData({ ...formData, ownerPreferredContact: method })}
                            className="accent-blue-600"
                          />
                          <span>{method === 'BOTH' ? 'WhatsApp & Calls' : method === 'WHATSAPP' ? 'WhatsApp Only' : 'Phone Calls'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOwnerSubTab('listings')}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{editingProperty ? 'Update Listing' : 'Submit for Admin Approval'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sub-tab 3: Admin Approval Workflow */}
            {/* Requirement 4: Real-time listener automatically updates admin dashboard */}
            {/* Requirement 5: Let admin approve or reject listings */}
            {/* Requirement 10: Never allow users to approve their own listings */}
            {ownerSubTab === 'moderation' && (
              <div className="space-y-4">
                
                {/* Admin Authentication Barrier */}
                {!isAdminAuthenticated ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 max-w-lg mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-base font-extrabold text-slate-900">Admin Authentication Required</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        To preserve system integrity and prevent unauthorized approvals, only verified administrators can review and approve property listings. Listing owners are never allowed to approve their own submissions.
                      </p>
                    </div>

                    <form onSubmit={handleAdminLogin} className="space-y-3 pt-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Enter Admin Passcode
                        </label>
                        <input
                          type="password"
                          required
                          value={adminPasscodeInput}
                          onChange={(e) => setAdminPasscodeInput(e.target.value)}
                          placeholder="e.g. gondia_admin_2026"
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Key className="w-4 h-4 text-amber-400" />
                        <span>Unlock Admin Moderation Portal</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Admin Status Header */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
                      <div className="flex items-center gap-2 font-bold">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span>Admin Moderation Clearance Active (Real-Time Firestore Listener)</span>
                          <span className="block text-[11px] font-normal text-emerald-700">
                            Submissions from any phone or browser update here immediately.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={logoutAdmin}
                        className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-[11px] transition-colors self-start sm:self-auto"
                      >
                        Exit Admin Mode
                      </button>
                    </div>

                    {pendingProperties.length > 0 ? (
                      <div className="space-y-3">
                        {pendingProperties.map(prop => {
                          const isOwnListing = prop.ownerId === currentOwner.id;
                          return (
                            <div key={prop.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Pending Approval
                                  </span>
                                  <span className="text-xs font-bold text-slate-500">{prop.locality}</span>
                                  {isOwnListing && (
                                    <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                      Your Own Submission
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">{prop.title}</h4>
                                <p className="text-xs text-slate-500">{prop.address}</p>
                                <div className="text-xs text-slate-600 font-medium pt-1">
                                  Owner: <span className="font-bold">{prop.ownerName}</span> ({formatDisplayPhone(prop.ownerPhone)}) • Rent: <span className="font-extrabold text-blue-700">₹{prop.monthlyRent}/mo</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isOwnListing ? (
                                  <div className="text-[11px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                                    Self-Approval Blocked (Owner Security Rule)
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => approveProperty(prop.id, true)}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      Approve Listing
                                    </button>
                                    <button
                                      onClick={() => approveProperty(prop.id, false)}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800">All listings are reviewed!</p>
                        <p className="text-xs text-slate-500">There are no pending submissions awaiting review in Cloud Firestore.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ===================== DETAIL VIEW TAB ===================== */}
        {activeTab === 'detail' && selectedProperty && (
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Back Button */}
            <button
              onClick={() => navigateTo('explore')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Listings in Gondia
            </button>

            {/* Main Detail Card */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md">
              
              {/* Photo Hero */}
              <div className="relative h-72 sm:h-96 w-full bg-slate-900">
                <img 
                  src={selectedProperty.photos[0] || '/hero_gondia_stays.jpg'} 
                  alt={selectedProperty.title} 
                  className="w-full h-full object-cover" 
                />
                
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {selectedProperty.propertyType}
                  </span>
                  <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    0% Brokerage
                  </span>
                  {selectedProperty.isFeatured && (
                    <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Featured
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast('Listing link copied to clipboard!');
                  }}
                  className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Content */}
              <div className="p-6 sm:p-8 space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedProperty.locality}, Gondia</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      {selectedProperty.title}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">{selectedProperty.address}</p>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-2xl sm:text-3xl font-black text-blue-700">
                      ₹{selectedProperty.monthlyRent.toLocaleString('en-IN')}
                      <span className="text-xs font-medium text-slate-500"> /month</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Security Deposit: ₹{selectedProperty.securityDeposit.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Key Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Bed className="w-5 h-5 text-blue-600 mb-1" />
                    <span className="text-xs text-slate-500 block">Bedrooms</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {selectedProperty.bedrooms === 0 ? 'Single Room / Studio' : `${selectedProperty.bedrooms} BHK`}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Bath className="w-5 h-5 text-blue-600 mb-1" />
                    <span className="text-xs text-slate-500 block">Bathrooms</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {selectedProperty.bathrooms} Washroom
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Sofa className="w-5 h-5 text-blue-600 mb-1" />
                    <span className="text-xs text-slate-500 block">Furnishing</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {selectedProperty.furnishing.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Clock className="w-5 h-5 text-blue-600 mb-1" />
                    <span className="text-xs text-slate-500 block">Available From</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {selectedProperty.availableFrom}
                    </span>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Amenities & Facilities</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedProperty.amenities.map(am => (
                      <div key={am} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{am}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Landlord Contact Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {selectedProperty.ownerName[0]}
                    </div>
                    <div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Verified Landlord
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">{selectedProperty.ownerName}</h4>
                      <p className="text-xs text-slate-500">Contact: {formatDisplayPhone(selectedProperty.ownerPhone)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Zero Brokerage guaranteed. Chat directly with the landlord on WhatsApp to schedule an in-person room visit in Gondia.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <button
                      onClick={() => openWhatsApp(selectedProperty.ownerPhone, selectedProperty.title)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      <span>WhatsApp Chat</span>
                    </button>

                    <button
                      onClick={() => dialPhone(selectedProperty.ownerPhone)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call Landlord</span>
                    </button>

                    <button
                      onClick={() => openGoogleMaps(selectedProperty.latitude, selectedProperty.longitude, selectedProperty.title)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Get Directions</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Filter Modal */}
      {showFilterModal && (
        <FilterModal onClose={() => setShowFilterModal(false)} />
      )}

      {/* Cloud Firestore Connection & Settings Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        propertiesCount={properties.length}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-3 flex items-center gap-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
