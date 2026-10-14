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
  Filter
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { PropertyCard } from './components/PropertyCard';
import { TiffinCard } from './components/TiffinCard';
import { FilterModal } from './components/FilterModal';
import { 
  PropertyListing, 
  PropertyType, 
  FurnishingStatus, 
  ContactMethod, 
  GONDIA_LOCALITIES, 
  PROPERTY_TYPES,
  SortOption,
  OWNER_PROFILES
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
    resetFilters
  } = useApp();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [ownerSubTab, setOwnerSubTab] = useState<'listings' | 'new' | 'moderation'>('listings');
  const [editingProperty, setEditingProperty] = useState<PropertyListing | null>(null);
  const [phoneInput, setPhoneInput] = useState(currentOwner.phone);
  const [selectedMapLocality, setSelectedMapLocality] = useState<string | null>(null);

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
  });

  // Filtered properties for Explore & Map
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // Status check: on user-facing tabs, show only APPROVED
      if (activeTab === 'explore' || activeTab === 'map' || activeTab === 'saved') {
        if (p.status !== 'APPROVED') return false;
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

  // Owner properties
  const myProperties = useMemo(() => {
    return properties.filter(p => p.ownerId === currentOwner.id);
  }, [properties, currentOwner]);

  // Pending properties for Moderation Workflow
  const pendingProperties = useMemo(() => {
    return properties.filter(p => p.status === 'PENDING');
  }, [properties]);

  // Handle Form Submission
  const handleSaveListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.address.trim()) {
      showToast('Please fill out all required fields');
      return;
    }

    if (editingProperty) {
      const updated: PropertyListing = {
        ...editingProperty,
        title: formData.title,
        address: formData.address,
        locality: formData.locality,
        propertyType: formData.propertyType,
        monthlyRent: Number(formData.monthlyRent),
        securityDeposit: Number(formData.securityDeposit),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        furnishing: formData.furnishing,
        availableFrom: formData.availableFrom,
        amenities: formData.amenities,
        ownerPreferredContact: formData.ownerPreferredContact,
      };
      saveProperty(updated, true);
      setEditingProperty(null);
    } else {
      const newProp: PropertyListing = {
        id: `prop_${Date.now()}`,
        title: formData.title,
        address: formData.address,
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
        photos: ['/hero_gondia_stays.jpg'],
        ownerId: currentOwner.id,
        ownerName: currentOwner.name,
        ownerPhone: currentOwner.phone,
        ownerPreferredContact: formData.ownerPreferredContact,
        status: 'PENDING',
        latitude: 21.4550,
        longitude: 80.1920,
        createdAt: Date.now()
      };
      saveProperty(newProp, false);
    }

    // Reset Form
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
    });
    setOwnerSubTab('listings');
  };

  const handleEditClick = (property: PropertyListing) => {
    setEditingProperty(property);
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
    });
    setOwnerSubTab('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const availableAmenities = [
    '24/7 Water', 'Wi-Fi', 'Car Parking', 'Bike Parking', 
    'Lift', 'Power Backup', 'CCTV Security', 'Air Conditioner', 
    'Geyser', 'Balcony', 'Modular Kitchen', 'RO Drinking Water'
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        
        {/* ===================== EXPLORE TAB ===================== */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            
            {/* Hero Search & Value Proposition Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-xl">
              <div className="absolute inset-0 bg-radial at-top-right from-white/10 to-transparent pointer-events-none" />
              <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-12 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-bold uppercase tracking-wider backdrop-blur-xs mb-3 border border-blue-400/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  100% Free Rental Platform • Zero Commission
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                  Find Flats, Rooms & PG in Gondia
                </h1>
                <p className="text-sm sm:text-base text-blue-100 mb-6 font-normal">
                  Connect directly with verified local landlords via WhatsApp. Zero brokerage, no hidden charges.
                </p>

                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                    <input 
                      type="text"
                      placeholder="Search locality, title or street (e.g. Civil Lines)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
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
                  Showing {filteredProperties.length} available listings in Gondia
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

            {/* Properties Grid */}
            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">No properties found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  We couldn't find listings matching your filters. Try selecting a different locality or adjusting your rent range.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Reset Filters
                </button>
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
                    Explore rental hotspots around Gondia Junction, Civil Lines, Rail Toly, and Ram Nagar
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Available Listings</span>
                  <span className="w-3 h-3 rounded-full bg-blue-600 ml-2" />
                  <span>Key Hotspots</span>
                </div>
              </div>

              {/* Visual Map Canvas / Schematic */}
              <div className="relative w-full h-[450px] bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center p-4">
                <svg className="w-full h-full max-w-2xl" viewBox="0 0 600 400">
                  {/* Road Grid lines */}
                  <line x1="50" y1="200" x2="550" y2="200" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
                  <line x1="300" y1="40" x2="300" y2="360" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
                  <line x1="120" y1="80" x2="480" y2="320" stroke="#e2e8f0" strokeWidth="4" />
                  <line x1="120" y1="320" x2="480" y2="80" stroke="#e2e8f0" strokeWidth="4" />
                  
                  {/* Gondia Railway Junction Track */}
                  <line x1="280" y1="60" x2="280" y2="340" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6,4" />
                  
                  {/* Landmark: Gondia Junction */}
                  <g transform="translate(280, 190)">
                    <rect x="-40" y="-14" width="80" height="28" rx="6" fill="#1e293b" />
                    <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                      Gondia Jn.
                    </text>
                  </g>

                  {/* Localities Interactive Markers */}
                  {[
                    { name: 'Civil Lines', x: 180, y: 130, count: properties.filter(p => p.locality === 'Civil Lines').length },
                    { name: 'Rail Toly', x: 380, y: 140, count: properties.filter(p => p.locality === 'Rail Toly').length },
                    { name: 'Ram Nagar', x: 200, y: 280, count: properties.filter(p => p.locality === 'Ram Nagar').length },
                    { name: 'Kudwa Naka', x: 420, y: 270, count: properties.filter(p => p.locality === 'Kudwa Naka').length },
                    { name: 'Ring Road', x: 120, y: 200, count: properties.filter(p => p.locality === 'Ring Road').length },
                    { name: 'Station Road', x: 330, y: 215, count: properties.filter(p => p.locality === 'Station Road').length },
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
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200">
                <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">No saved properties yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Tap the heart icon on any listing to save it here for fast WhatsApp contact and rent comparison.
                </p>
                <button
                  onClick={() => navigateTo('explore')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Explore Stays in Gondia
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================== OWNER HUB TAB ===================== */}
        {activeTab === 'owner' && (
          <div className="space-y-6">
            
            {/* Active Owner Profile & Phone Sync Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
                    {currentOwner.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{currentOwner.name}</h2>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Verified Landlord
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      ID: {currentOwner.id} • Active Listings: {myProperties.length}
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp Phone Number Update Section */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-1 max-w-md">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Your Contact & WhatsApp Number
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Tenants will dial and message this number for your property enquiries:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+919823012345"
                      className="flex-1 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      onClick={() => {
                        updateOwnerPhone(phoneInput);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Phone
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="flex items-center gap-2 pt-4">
                <button
                  onClick={() => { setOwnerSubTab('listings'); setEditingProperty(null); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    ownerSubTab === 'listings'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  My Listings ({myProperties.length})
                </button>
                <button
                  onClick={() => setOwnerSubTab('new')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    ownerSubTab === 'new'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {editingProperty ? 'Edit Listing' : 'Post New Listing'}
                </button>
                <button
                  onClick={() => setOwnerSubTab('moderation')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    ownerSubTab === 'moderation'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin Approval Workflow
                  {pendingProperties.length > 0 && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {pendingProperties.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-tab 1: My Listings */}
            {ownerSubTab === 'listings' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Listings registered under {currentOwner.name}
                  </h3>
                  <button
                    onClick={() => { setEditingProperty(null); setOwnerSubTab('new'); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Property
                  </button>
                </div>

                {myProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myProperties.map(prop => (
                      <div key={prop.id} className="relative">
                        <PropertyCard 
                          property={prop} 
                          isOwnerView={true}
                          onEdit={handleEditClick}
                          onDelete={(p) => deleteProperty(p.id)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6">
                    <p className="text-xs text-slate-500 mb-3">You don't have any listings under this profile yet.</p>
                    <button
                      onClick={() => setOwnerSubTab('new')}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                    >
                      Post Your First Property in Gondia
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Post / Edit Listing Form */}
            {ownerSubTab === 'new' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-3xl mx-auto shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {editingProperty ? 'Edit Property Listing' : 'Post New Property (100% Free)'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Zero listing charges, direct WhatsApp inquiries from verified tenants
                    </p>
                  </div>
                  {editingProperty && (
                    <button
                      onClick={() => { setEditingProperty(null); setOwnerSubTab('listings'); }}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveListing} className="space-y-6">
                  
                  {/* Title */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1.5">
                      Property Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spacious 2 BHK with Balcony near Court Chowk"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Locality & Address */}
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
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
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
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      {editingProperty ? 'Update Listing' : 'Submit for Approval'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sub-tab 3: Admin Approval Workflow */}
            {ownerSubTab === 'moderation' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Moderation & Approval Workflow: </span>
                    New listings submitted by owners are placed in PENDING status to prevent spam and verify phone validity. As an administrator/moderator, you can review and approve them here to make them live on the Gondia Stay Explore tab.
                  </div>
                </div>

                {pendingProperties.length > 0 ? (
                  <div className="space-y-3">
                    {pendingProperties.map(prop => (
                      <div key={prop.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              Pending Approval
                            </span>
                            <span className="text-xs font-bold text-slate-500">{prop.locality}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{prop.title}</h4>
                          <p className="text-xs text-slate-500">{prop.address}</p>
                          <div className="text-xs text-slate-600 font-medium pt-1">
                            Owner: <span className="font-bold">{prop.ownerName}</span> ({formatDisplayPhone(prop.ownerPhone)}) • Rent: <span className="font-extrabold text-blue-700">₹{prop.monthlyRent}/mo</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
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
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">All listings are approved!</p>
                    <p className="text-xs text-slate-500">There are no pending submissions awaiting review.</p>
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
                  src={selectedProperty.photos?.[0] || '/hero_gondia_stays.jpg'}
                  alt={selectedProperty.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-900/30" />
                
                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="bg-blue-600/95 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                    <Building2 className="w-3.5 h-3.5" />
                    {selectedProperty.propertyType}
                  </span>

                  <span className="bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    0% Brokerage
                  </span>
                </div>

                {/* Price Bar on Hero */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                  <div>
                    <span className="text-3xl font-black text-amber-300">
                      ₹{selectedProperty.monthlyRent.toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-200 text-xs font-semibold ml-1">/ month</span>
                    <div className="text-xs text-slate-300">
                      Deposit: ₹{selectedProperty.securityDeposit.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: selectedProperty.title,
                          text: `Check out ${selectedProperty.title} in Gondia on GondiaStay:`,
                          url: window.location.href,
                        });
                      } else {
                        showToast("Listing link copied!");
                      }
                    }}
                    className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Detail Content */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                    {selectedProperty.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    {selectedProperty.address}, {selectedProperty.locality}, Gondia
                  </p>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block">Bedrooms</span>
                    <span className="text-sm font-black text-slate-800">{selectedProperty.bedrooms} BHK / Room</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block">Bathrooms</span>
                    <span className="text-sm font-black text-slate-800">{selectedProperty.bathrooms} Bath</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block">Furnishing</span>
                    <span className="text-sm font-black text-slate-800">{selectedProperty.furnishing}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-semibold block">Available</span>
                    <span className="text-sm font-black text-emerald-700">{selectedProperty.availableFrom}</span>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 mb-3">Amenities & Facilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.amenities.map(am => (
                      <span key={am} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                        {am}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Verified Owner Contact & Direct WhatsApp Card */}
                <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/40 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center">
                        {selectedProperty.ownerName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-sm">{selectedProperty.ownerName}</h4>
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          {formatDisplayPhone(selectedProperty.ownerPhone)}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                      Verified Landlord
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Connect directly without intermediaries or commission fees. Inquire about rent negotiation, visit timing, and room rules:
                  </p>

                  {/* Contact Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <button
                      onClick={() => {
                        const msg = `Hello ${selectedProperty.ownerName}, I saw your property '${selectedProperty.title}' in ${selectedProperty.locality}, Gondia on Gondia Stay. Is it available for rent?`;
                        openWhatsApp(selectedProperty.ownerPhone, msg);
                      }}
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
