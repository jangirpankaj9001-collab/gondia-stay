import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  Shirt, 
  Zap, 
  Wrench, 
  Droplets, 
  ShieldCheck, 
  ChefHat, 
  Sparkles,
  ArrowLeft,
  Star, 
  MapPin, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  CreditCard,
  Plus,
  X,
  SlidersHorizontal,
  Search,
  ChevronRight
} from 'lucide-react';
import { ServiceItem, ServiceCategory, SERVICE_CATEGORIES, isApproved } from '../types';
import { openWhatsApp, formatDisplayPhone } from '../utils/contact';

interface SubCategoryConfig {
  id: ServiceCategory;
  name: string;
  badge: string;
  gradient: string;
  glow: string;
  accentColor: string;
  subIcon: React.ReactNode;
  tagline: string;
  typicalCharge: string;
}

const SUBCATEGORIES: SubCategoryConfig[] = [
  {
    id: 'MESS_TIFFIN',
    name: 'Mess/Tiffin',
    badge: 'Popular',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/25',
    accentColor: 'text-amber-600 bg-amber-50 border-amber-200',
    subIcon: <UtensilsCrossed className="w-6 h-6 text-white" />,
    tagline: 'Fresh daily homestyle meals & tiffin delivery in Gondia',
    typicalCharge: 'From ₹2,500 / month'
  },
  {
    id: 'LAUNDRY',
    name: 'Laundry',
    badge: 'Doorstep Pickup',
    gradient: 'from-purple-500 to-indigo-500',
    glow: 'shadow-purple-500/25',
    accentColor: 'text-purple-600 bg-purple-50 border-purple-200',
    subIcon: <Shirt className="w-6 h-6 text-white" />,
    tagline: 'Steam press, washing, blanket wash & dry cleaning',
    typicalCharge: 'From ₹10 / piece'
  },
  {
    id: 'ELECTRICIAN',
    name: 'Electrician',
    badge: '24x7 Emergency',
    gradient: 'from-amber-400 to-yellow-500',
    glow: 'shadow-yellow-500/25',
    accentColor: 'text-amber-700 bg-amber-50 border-amber-200',
    subIcon: <Zap className="w-6 h-6 text-white" />,
    tagline: 'MCB repair, cooler/fan rewinding, inverter wiring & appliance repair',
    typicalCharge: '₹150 visiting fee'
  },
  {
    id: 'PLUMBER',
    name: 'Plumber',
    badge: '30-Min Fast Arrival',
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'shadow-cyan-500/25',
    accentColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    subIcon: <Wrench className="w-6 h-6 text-white" />,
    tagline: 'Concealed leak repairs, tap fitting, flush valves & water tank repair',
    typicalCharge: '₹150 inspection'
  },
  {
    id: 'WATER_CANS',
    name: 'Water Cans',
    badge: 'Chilled RO 20L',
    gradient: 'from-sky-400 to-blue-600',
    glow: 'shadow-sky-500/25',
    accentColor: 'text-sky-700 bg-sky-50 border-sky-200',
    subIcon: <Droplets className="w-6 h-6 text-white" />,
    tagline: 'Multi-stage RO + UV purified 20L chilled water cans delivered to floor',
    typicalCharge: '₹30 / 20-Litre can'
  },
  {
    id: 'SECURITY',
    name: 'Security (CCTV/Guard)',
    badge: 'HD Live View',
    gradient: 'from-slate-700 to-slate-900',
    glow: 'shadow-slate-500/25',
    accentColor: 'text-slate-800 bg-slate-100 border-slate-300',
    subIcon: <ShieldCheck className="w-6 h-6 text-white" />,
    tagline: 'Color night vision CCTV camera installation & background-verified night guards',
    typicalCharge: 'Starting ₹1,200'
  },
  {
    id: 'COOK',
    name: 'Cook',
    badge: 'Police Verified',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/25',
    accentColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    subIcon: <ChefHat className="w-6 h-6 text-white" />,
    tagline: 'Trustworthy homestyle Maharashtrian & North Indian cooking & maid help',
    typicalCharge: 'From ₹1,800 / month'
  },
  {
    id: 'HOUSEKEEPING',
    name: 'Housekeeping',
    badge: 'Deep Sanitization',
    gradient: 'from-blue-600 to-indigo-700',
    glow: 'shadow-indigo-500/25',
    accentColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    subIcon: <Sparkles className="w-6 h-6 text-white" />,
    tagline: 'Mechanized tile scrubbing, bathroom descaling, sofa steam & move-in clean',
    typicalCharge: 'From ₹699 / room'
  }
];

interface ServiceCategoryGridProps {
  services: ServiceItem[];
  selectedCategory: 'ALL' | ServiceCategory;
  onSelectCategory: (category: 'ALL' | ServiceCategory) => void;
  isAdmin?: boolean;
  onModerate?: (serviceId: string, approve: boolean) => void;
  onDelete?: (serviceId: string) => void;
}

export const ServiceCategoryGrid: React.FC<ServiceCategoryGridProps> = ({
  services,
  selectedCategory,
  onSelectCategory,
  isAdmin = false,
  onModerate,
  onDelete
}) => {
  // Currently opened category in dedicated view (null means grid of 8 icons is shown)
  const [activeDedicatedCategory, setActiveDedicatedCategory] = useState<ServiceCategory | null>(
    selectedCategory !== 'ALL' ? selectedCategory : null
  );

  // Search & Locality filter inside dedicated view
  const [searchQuery, setSearchQuery] = useState('');
  const [localityFilter, setLocalityFilter] = useState('All');

  // Visiting card modal preview
  const [selectedVisitingCard, setSelectedVisitingCard] = useState<{
    url: string;
    title: string;
    provider: string;
    phone: string;
    locality: string;
  } | null>(null);

  // Helper to check if a service item belongs to a category (with COOK / MAID alias)
  const matchesSubcategory = (itemCategory: string, targetId: ServiceCategory): boolean => {
    if (targetId === 'COOK') {
      return itemCategory === 'COOK' || itemCategory === 'MAID';
    }
    return itemCategory === targetId;
  };

  // When clicking an icon in the 8-category grid
  const handleCategoryIconClick = (catId: ServiceCategory) => {
    setActiveDedicatedCategory(catId);
    onSelectCategory(catId);
    setSearchQuery('');
    setLocalityFilter('All');
  };

  // Back to full 8-icon grid
  const handleBackToGrid = () => {
    setActiveDedicatedCategory(null);
    onSelectCategory('ALL');
    setSearchQuery('');
    setLocalityFilter('All');
  };

  // If a dedicated category is selected, get its configuration
  const currentConfig = activeDedicatedCategory 
    ? SUBCATEGORIES.find(c => c.id === activeDedicatedCategory) || SUBCATEGORIES[0]
    : null;

  // Filter approved providers for the dedicated view
  const dedicatedProviders = activeDedicatedCategory
    ? services.filter(service => {
        if (!isAdmin && !isApproved(service.status)) return false;
        if (!matchesSubcategory(service.category, activeDedicatedCategory)) return false;

        // Locality filter
        if (localityFilter !== 'All') {
          const inAreas = (service.serviceAreas || []).some(area => 
            area.toLowerCase() === 'all gondia' || 
            area.toLowerCase() === localityFilter.toLowerCase()
          );
          const inLoc = (service.locality || '').toLowerCase() === localityFilter.toLowerCase();
          if (!inAreas && !inLoc) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = service.title.toLowerCase().includes(q);
          const matchName = service.providerName.toLowerCase().includes(q);
          const matchDesc = service.description.toLowerCase().includes(q);
          const matchLoc = (service.locality || '').toLowerCase().includes(q);
          if (!matchTitle && !matchName && !matchDesc && !matchLoc) return false;
        }

        return true;
      })
    : [];

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          VIEW 1: MODERN RESPONSIVE 2-4 COLUMN GRID OF CLICKABLE SUBCATEGORY ICONS
          Appears when activeDedicatedCategory is null
         ========================================================================= */}
      {!activeDedicatedCategory ? (
        <div className="space-y-4">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Explore Service Categories</span>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  8 Gondia Services
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tap any category icon to view verified local service providers, direct phone, and WhatsApp contacts
              </p>
            </div>
          </div>

          {/* Clean 2–4 Column Grid of Subcategory Icons */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {SUBCATEGORIES.map(cat => {
              // Count approved providers in this category from Firestore
              const count = services.filter(s => 
                (isAdmin || isApproved(s.status)) && matchesSubcategory(s.category, cat.id)
              ).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryIconClick(cat.id)}
                  className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between text-left group cursor-pointer relative overflow-hidden"
                >
                  {/* Category Card Top Row: Attractive Icon & Badge */}
                  <div className="flex items-start justify-between gap-2 w-full">
                    {/* Unique Gradient Icon Container */}
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-md ${cat.glow} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                      {cat.subIcon}
                    </div>

                    {/* Count / Badge Pill */}
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
                      {count} {count === 1 ? 'Provider' : 'Providers'}
                    </span>
                  </div>

                  {/* Category Title & Rates */}
                  <div className="mt-3.5">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight leading-snug">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5 truncate">
                      {cat.typicalCharge}
                    </p>
                  </div>

                  {/* Bottom Action Hint */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-600 group-hover:text-blue-700">
                    <span>View Providers</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: DEDICATED VIEW SHOWING ONLY THAT CATEGORY'S SERVICE PROVIDERS
            Opens when any category icon is clicked
           ========================================================================= */
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top Bar: Back Button & Subcategory Quick Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBackToGrid}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors self-start cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
              <span>← All Service Categories</span>
            </button>

            {/* Quick Switcher Pills for all 8 categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SUBCATEGORIES.map(cat => {
                const isCurrent = cat.id === activeDedicatedCategory;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryIconClick(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dedicated Category Header Banner */}
          {currentConfig && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${currentConfig.gradient} flex items-center justify-center shadow-lg ${currentConfig.glow} shrink-0`}>
                  {currentConfig.subIcon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      {currentConfig.name} in Gondia
                    </h1>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {dedicatedProviders.length} Verified {dedicatedProviders.length === 1 ? 'Provider' : 'Providers'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    {currentConfig.tagline}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                      Rates: {currentConfig.typicalCharge}
                    </span>
                    <span>• Direct 0% Brokerage Connect</span>
                  </div>
                </div>
              </div>

              {/* Category Search & Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${currentConfig.name}...`}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              LIST OF DEDICATED SERVICE PROVIDERS IN THIS CATEGORY
              Features: Photos, Description, Owner/Business Name, Service Area,
              Charges, Phone and WhatsApp Contact Buttons
             ========================================================================= */}
          {dedicatedProviders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dedicatedProviders.map(provider => {
                const whatsappMsg = `Hello ${provider.providerName}, I found your ${currentConfig?.name || 'service'} listing '${provider.title}' on Gondia Stay. I would like to inquire about your availability in ${provider.locality || 'Gondia'}.`;
                const primaryPhoto = (provider.photos && provider.photos.length > 0) ? provider.photos[0] : null;
                const visitingCard = provider.businessCardPhoto || (provider.photos && provider.photos[1]) || null;

                return (
                  <div
                    key={provider.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Photo Header */}
                      <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                        {primaryPhoto ? (
                          <img 
                            src={primaryPhoto} 
                            alt={provider.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback placeholder image
                              e.currentTarget.src = '/hero_gondia_stays.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 p-4 text-center">
                            {currentConfig?.subIcon}
                            <span className="text-xs font-bold text-slate-500 mt-2">{provider.title}</span>
                          </div>
                        )}

                        {/* Top Badges overlay */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                            {currentConfig?.name}
                          </span>
                          {provider.isFeatured && (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                              Featured
                            </span>
                          )}
                        </div>

                        {/* Rating Overlay */}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-xs flex items-center gap-1 text-[11px] font-extrabold text-slate-900">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{provider.rating || '4.8'}</span>
                          <span className="text-slate-400 text-[10px]">({provider.reviewCount || '25+'})</span>
                        </div>

                        {/* Charges Bottom Pill on Image */}
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1 rounded-xl shadow-sm">
                          <span className="text-xs font-black text-amber-800">
                            {provider.charges}
                          </span>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-4 sm:p-5 space-y-3">
                        
                        {/* Owner & Business Name */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                              {provider.providerName}
                            </h3>
                            <span title="Verified Service Provider">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5 line-clamp-1">
                            {provider.title}
                          </p>
                        </div>

                        {/* Service Area */}
                        <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-700">Service Area: </span>
                            <span>
                              {provider.serviceAreas && provider.serviceAreas.length > 0
                                ? provider.serviceAreas.join(', ')
                                : provider.locality || 'All Gondia'
                              }
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {provider.description}
                        </p>

                        {/* Specialties Pills */}
                        {provider.specialties && provider.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {provider.specialties.slice(0, 3).map((spec, i) => (
                              <span 
                                key={i}
                                className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md"
                              >
                                ✓ {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact Action Buttons & Details */}
                    <div className="p-4 sm:p-5 pt-0 space-y-2 border-t border-slate-100 mt-2">
                      <div className="grid grid-cols-2 gap-2 pt-3">
                        
                        {/* WhatsApp Contact Button */}
                        <button
                          type="button"
                          onClick={() => openWhatsApp(provider.whatsappNumber || provider.phone, whatsappMsg)}
                          className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                          title={`WhatsApp ${provider.providerName}`}
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Phone Call Button */}
                        <a
                          href={`tel:${provider.phone}`}
                          className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 text-center cursor-pointer"
                          title={`Call ${provider.providerName}`}
                        >
                          <Phone className="w-4 h-4" />
                          <span>Call ({formatDisplayPhone(provider.phone).split(' ')[1] || 'Now'})</span>
                        </a>
                      </div>

                      {/* Visiting Card trigger if available */}
                      {visitingCard && (
                        <button
                          type="button"
                          onClick={() => setSelectedVisitingCard({
                            url: visitingCard,
                            title: provider.title,
                            provider: provider.providerName,
                            phone: provider.phone,
                            locality: provider.locality || 'Gondia'
                          })}
                          className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          <span>View Visiting / Business Card</span>
                        </button>
                      )}

                      {/* Admin Moderation Controls if in admin mode */}
                      {isAdmin && onModerate && (
                        <div className="pt-2 flex items-center gap-1.5 border-t border-slate-100">
                          {!isApproved(provider.status) ? (
                            <button
                              type="button"
                              onClick={() => onModerate(provider.id, true)}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                            >
                              Approve Listing
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onModerate(provider.id, false)}
                              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg"
                            >
                              Reject Listing
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(provider.id)}
                              className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State for category */
            <div className="py-16 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-4 p-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto shadow-xs">
                {currentConfig?.subIcon || <SlidersHorizontal className="w-6 h-6" />}
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-extrabold text-slate-900">
                  No {currentConfig?.name} Providers Listed Yet
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Be the first verified {currentConfig?.name} provider in Gondia to reach hundreds of tenants and homeowners.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToGrid}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Browse Other Categories
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visiting Card Modal */}
      {selectedVisitingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h4 className="font-extrabold text-sm text-slate-900 truncate">
                  Visiting Card • {selectedVisitingCard.provider}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedVisitingCard(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-60">
              <img 
                src={selectedVisitingCard.url} 
                alt={`${selectedVisitingCard.title} Card`}
                className="max-h-80 w-auto object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="p-4 bg-white flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">{selectedVisitingCard.provider}</p>
                <p className="text-[11px] text-slate-500">{selectedVisitingCard.phone} • {selectedVisitingCard.locality}</p>
              </div>
              <a
                href={`tel:${selectedVisitingCard.phone}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
              >
                Call Directly
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
