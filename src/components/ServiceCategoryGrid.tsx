import React, { useState } from 'react';
import { 
  Utensils, 
  Sparkles, 
  Home, 
  Shirt, 
  Zap, 
  Wrench, 
  Droplets, 
  ShieldCheck, 
  Star, 
  MapPin, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  Award, 
  ChevronRight, 
  ChevronDown,
  CreditCard,
  UserCheck,
  Eye,
  SlidersHorizontal,
  X,
  Layers,
  Sparkle
} from 'lucide-react';
import { ServiceItem, ServiceCategory, SERVICE_CATEGORIES, isApproved } from '../types';
import { openWhatsApp, formatDisplayPhone } from '../utils/contact';

interface CategoryDesign {
  gradient: string;
  glow: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  tag: string;
  subIcons: Array<{ icon: React.ReactNode; label: string }>;
}

const CATEGORY_DESIGNS: Record<ServiceCategory, CategoryDesign> = {
  MESS_TIFFIN: {
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    glow: 'shadow-amber-500/25',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    badgeBg: 'bg-amber-100/90 border-amber-300',
    badgeText: 'text-amber-900',
    tag: 'Popular & Essential',
    subIcons: [
      { icon: <Clock className="w-3 h-3 text-amber-500" />, label: 'Daily Meals' },
      { icon: <Award className="w-3 h-3 text-orange-500" />, label: 'Homestyle Veg' },
      { icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />, label: 'Tiffin Box' }
    ]
  },
  MAID: {
    gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    glow: 'shadow-emerald-500/25',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    badgeBg: 'bg-emerald-100/90 border-emerald-300',
    badgeText: 'text-emerald-900',
    tag: 'Police Verified',
    subIcons: [
      { icon: <ShieldCheck className="w-3 h-3 text-emerald-600" />, label: 'Police Verified' },
      { icon: <Clock className="w-3 h-3 text-teal-600" />, label: 'Morning/Eve' },
      { icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />, label: 'Cook & Maid' }
    ]
  },
  HOUSEKEEPING: {
    gradient: 'from-blue-600 via-indigo-600 to-blue-700',
    glow: 'shadow-blue-500/25',
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    badgeBg: 'bg-indigo-100/90 border-indigo-300',
    badgeText: 'text-indigo-900',
    tag: 'Deep Clean',
    subIcons: [
      { icon: <Sparkles className="w-3 h-3 text-indigo-500" />, label: 'Tile Scrub' },
      { icon: <ShieldCheck className="w-3 h-3 text-blue-500" />, label: 'Eco Wash' },
      { icon: <CheckCircle2 className="w-3 h-3 text-indigo-500" />, label: 'Move-in Sanitized' }
    ]
  },
  LAUNDRY: {
    gradient: 'from-purple-500 via-violet-600 to-purple-700',
    glow: 'shadow-purple-500/25',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
    badgeBg: 'bg-purple-100/90 border-purple-300',
    badgeText: 'text-purple-900',
    tag: 'Doorstep Pickup',
    subIcons: [
      { icon: <Clock className="w-3 h-3 text-purple-500" />, label: 'Express Press' },
      { icon: <CheckCircle2 className="w-3 h-3 text-violet-500" />, label: 'Teflon Steam' },
      { icon: <MapPin className="w-3 h-3 text-purple-500" />, label: 'Pickup & Drop' }
    ]
  },
  ELECTRICIAN: {
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    glow: 'shadow-amber-500/25',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    badgeBg: 'bg-amber-100/90 border-amber-300',
    badgeText: 'text-amber-900',
    tag: '24x7 Emergency',
    subIcons: [
      { icon: <Clock className="w-3 h-3 text-amber-600" />, label: '24x7 On Call' },
      { icon: <Award className="w-3 h-3 text-yellow-600" />, label: 'Govt Certified' },
      { icon: <CheckCircle2 className="w-3 h-3 text-amber-600" />, label: 'Cooler/Inverter' }
    ]
  },
  PLUMBER: {
    gradient: 'from-cyan-500 via-blue-500 to-cyan-600',
    glow: 'shadow-cyan-500/25',
    iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    badgeBg: 'bg-cyan-100/90 border-cyan-300',
    badgeText: 'text-cyan-900',
    tag: '30-Min Arrival',
    subIcons: [
      { icon: <Clock className="w-3 h-3 text-cyan-600" />, label: '30 Min Arrival' },
      { icon: <CheckCircle2 className="w-3 h-3 text-blue-600" />, label: 'Leak Repair' },
      { icon: <Award className="w-3 h-3 text-cyan-600" />, label: 'Tank Cleaning' }
    ]
  },
  WATER_CANS: {
    gradient: 'from-sky-400 via-blue-500 to-cyan-500',
    glow: 'shadow-sky-500/25',
    iconBg: 'bg-sky-50 text-sky-600 border-sky-200',
    badgeBg: 'bg-sky-100/90 border-sky-300',
    badgeText: 'text-sky-900',
    tag: 'Chilled RO 20L',
    subIcons: [
      { icon: <CheckCircle2 className="w-3 h-3 text-sky-600" />, label: 'RO + UV Pure' },
      { icon: <Award className="w-3 h-3 text-blue-600" />, label: '20L Cans' },
      { icon: <MapPin className="w-3 h-3 text-sky-600" />, label: 'Floor Delivery' }
    ]
  },
  SECURITY: {
    gradient: 'from-slate-700 via-slate-800 to-slate-900',
    glow: 'shadow-slate-500/25',
    iconBg: 'bg-slate-100 text-slate-700 border-slate-300',
    badgeBg: 'bg-slate-200/90 border-slate-300',
    badgeText: 'text-slate-900',
    tag: 'CCTV & Guards',
    subIcons: [
      { icon: <Eye className="w-3 h-3 text-blue-500" />, label: 'Mobile Live View' },
      { icon: <ShieldCheck className="w-3 h-3 text-emerald-500" />, label: 'Night Guards' },
      { icon: <CheckCircle2 className="w-3 h-3 text-purple-500" />, label: 'HD Cameras' }
    ]
  }
};

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
  // Modal state for viewing visiting card
  const [selectedVisitingCard, setSelectedVisitingCard] = useState<{
    url: string;
    title: string;
    provider: string;
    phone: string;
    locality: string;
  } | null>(null);

  const renderCategoryIcon = (category: ServiceCategory) => {
    switch (category) {
      case 'MESS_TIFFIN':
        return <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'MAID':
        return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'HOUSEKEEPING':
        return <Home className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'LAUNDRY':
        return <Shirt className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'ELECTRICIAN':
        return <Zap className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'PLUMBER':
        return <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'WATER_CANS':
        return <Droplets className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'SECURITY':
        return <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />;
      default:
        return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  const totalVerifiedOwners = services.filter(s => isAdmin || isApproved(s.status)).length;

  // Active category metadata if not ALL
  const activeCategoryMeta = selectedCategory !== 'ALL' 
    ? SERVICE_CATEGORIES.find(c => c.id === selectedCategory) 
    : null;

  // Relevant owners for the selected category (or all if ALL)
  const relevantOwners = services.filter(s => {
    if (!isAdmin && !isApproved(s.status)) return false;
    if (selectedCategory === 'ALL') return true;
    return s.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          1. CATEGORY TILES IN ROWS & COLUMNS (Small Cards / Tiles)
         ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Service Categories
                <span className="text-[11px] font-bold text-slate-500">
                  (Tap any tile to view listed owners)
                </span>
              </h2>
            </div>
          </div>

          {selectedCategory !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectCategory('ALL')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Show All ({totalVerifiedOwners})</span>
            </button>
          )}
        </div>

        {/* Small Cards / Tiles Grid Layout in Rows & Columns */}
        {/* Mobile: 2 columns, Tablet: 3-4 columns, Desktop: 4 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* "All Services" Tile */}
          <button
            type="button"
            onClick={() => onSelectCategory('ALL')}
            className={`p-3 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg ring-2 ring-blue-500/50 scale-[1.02]'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between w-full gap-2">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105 ${
                selectedCategory === 'ALL'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                <Layers className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {totalVerifiedOwners} Total
              </span>
            </div>

            <div className="mt-3">
              <div className="font-extrabold text-xs sm:text-sm tracking-tight leading-snug">
                All Services
              </div>
              <div className={`text-[11px] font-medium mt-0.5 ${
                selectedCategory === 'ALL' ? 'text-slate-300' : 'text-slate-500'
              }`}>
                All categories across Gondia
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100/20 flex items-center justify-between text-[10px] font-bold">
              <span className={selectedCategory === 'ALL' ? 'text-blue-300' : 'text-blue-600'}>
                {selectedCategory === 'ALL' ? 'Active Selection' : 'Browse All'}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedCategory === 'ALL' ? 'translate-x-0.5 text-blue-300' : 'text-slate-400 group-hover:translate-x-0.5'}`} />
            </div>
          </button>

          {/* 8 Category Tiles in Rows and Columns */}
          {SERVICE_CATEGORIES.map(category => {
            const design = CATEGORY_DESIGNS[category.id];
            const isSelected = selectedCategory === category.id;
            
            // Count verified owners for this category
            const categoryOwners = services.filter(s => 
              s.category === category.id && (isAdmin || isApproved(s.status))
            );

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(isSelected ? 'ALL' : category.id)}
                className={`p-3 sm:p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-b from-blue-50/70 via-white to-white border-blue-600 shadow-lg ring-2 ring-blue-500/50 scale-[1.02]'
                    : category.isMainHighlighted
                      ? 'bg-white hover:bg-amber-50/40 border-amber-300 hover:border-amber-400 shadow-xs hover:shadow-md'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Top Row: Modern Sub-Icon + Badges */}
                <div className="flex items-start justify-between w-full gap-1.5">
                  
                  {/* Modern Sub-Icon in vibrant gradient tile */}
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${design.gradient} text-white flex items-center justify-center shadow-md ${design.glow} transition-transform group-hover:scale-110 shrink-0`}>
                    {renderCategoryIcon(category.id)}
                  </div>

                  {/* Owner count badge */}
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : `${design.badgeBg} ${design.badgeText}`
                    }`}>
                      {categoryOwners.length} {categoryOwners.length === 1 ? 'Owner' : 'Owners'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {category.defaultUnit}
                    </span>
                  </div>
                </div>

                {/* Middle: Title & Micro sub-tags */}
                <div className="mt-3">
                  <div className="flex items-center gap-1">
                    <h3 className={`font-extrabold text-xs sm:text-sm tracking-tight leading-snug line-clamp-1 ${
                      isSelected ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-600'
                    }`}>
                      {category.shortLabel}
                    </h3>
                  </div>

                  <p className="text-[11px] font-medium text-slate-500 line-clamp-1 mt-0.5">
                    {category.exampleCharge}
                  </p>
                </div>

                {/* Bottom: Modern Sub-Icons feature pills */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className={`font-bold inline-flex items-center gap-1 ${
                    isSelected ? 'text-blue-600' : 'text-slate-600'
                  }`}>
                    {design.subIcons[0]?.icon}
                    <span className="truncate max-w-[85px] sm:max-w-[110px]">{design.subIcons[0]?.label}</span>
                  </span>

                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                    isSelected ? 'rotate-90 text-blue-600 font-bold' : 'text-slate-400 group-hover:translate-x-0.5'
                  }`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          2. INSIDE THEM: RELEVANT OWNER LISTINGS SHOWCASE
         ======================================================== */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm space-y-5">
        
        {/* Section Header: Focused Category & Owners Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            {activeCategoryMeta ? (
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${CATEGORY_DESIGNS[activeCategoryMeta.id]?.gradient || 'from-blue-600 to-indigo-600'} text-white flex items-center justify-center shadow-md`}>
                {renderCategoryIcon(activeCategoryMeta.id)}
              </div>
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <UserCheck className="w-6 h-6 text-blue-400" />
              </div>
            )}
            
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {activeCategoryMeta 
                    ? `Relevant Owners for ${activeCategoryMeta.label}` 
                    : 'All Relevant Service Owners in Gondia'
                  }
                </h3>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {relevantOwners.length} {relevantOwners.length === 1 ? 'Owner Listed' : 'Owners Listed'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeCategoryMeta 
                  ? activeCategoryMeta.description 
                  : 'Direct connect with verified local cooks, maids, electricians, plumbers, laundry & water suppliers'
                }
              </p>
            </div>
          </div>

          {selectedCategory !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectCategory('ALL')}
              className="self-start sm:self-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Category Filter</span>
            </button>
          )}
        </div>

        {/* Relevant Owners Grid */}
        {relevantOwners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {relevantOwners.map(owner => {
              const categoryMeta = SERVICE_CATEGORIES.find(c => c.id === owner.category);
              const design = owner.category ? CATEGORY_DESIGNS[owner.category] : null;
              const whatsappMsg = `Hello ${owner.providerName}, I found your ${categoryMeta?.shortLabel || 'service'} listing '${owner.title}' on Gondia Stay. I would like to inquire about your availability in ${owner.locality || 'Gondia'}.`;
              const visitingCard = owner.businessCardPhoto || (owner.photos && owner.photos[1]) || null;

              return (
                <div
                  key={owner.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col justify-between space-y-3.5 group"
                >
                  <div className="space-y-3">
                    
                    {/* Top Row: Category tag + Rating */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 border ${
                        design ? `${design.badgeBg} ${design.badgeText}` : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {renderCategoryIcon(owner.category)}
                        <span>{categoryMeta?.shortLabel || owner.category}</span>
                      </span>

                      <div className="flex items-center gap-1 text-[11px] font-black bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-lg">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{owner.rating || '4.8'}</span>
                        <span className="text-slate-400 font-semibold text-[10px]">({owner.reviewCount || '25+'})</span>
                      </div>
                    </div>

                    {/* Owner / Provider Identity */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                          {owner.providerName}
                        </h4>
                        <span title="Verified Owner" className="inline-flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </span>
                      </div>
                      
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 line-clamp-1">
                        {owner.title}
                      </p>
                    </div>

                    {/* Pricing & Locality Chips */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium text-[11px]">Charges:</span>
                        <span className="font-black text-amber-700 text-xs sm:text-sm">
                          {owner.charges}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200/50 pt-1">
                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate font-semibold">{owner.locality || 'All Gondia'}</span>
                        </div>
                        {owner.experienceYears && (
                          <span className="text-slate-400 font-medium">
                            {owner.experienceYears}+ yrs exp
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {owner.description}
                    </p>

                    {/* Specialties / Highlights */}
                    {owner.specialties && owner.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {owner.specialties.slice(0, 2).map((spec, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md"
                          >
                            ✓ {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions: Direct WhatsApp, Call, and Card Preview */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* WhatsApp Button */}
                      <button
                        type="button"
                        onClick={() => openWhatsApp(owner.whatsappNumber || owner.phone, whatsappMsg)}
                        className="py-2 px-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                        title={`WhatsApp ${owner.providerName}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>WhatsApp</span>
                      </button>

                      {/* Call Button */}
                      <a
                        href={`tel:${owner.phone}`}
                        className="py-2 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 text-center cursor-pointer"
                        title={`Call ${owner.providerName}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call ({formatDisplayPhone(owner.phone).split(' ')[1] || 'Now'})</span>
                      </a>
                    </div>

                    {/* Visiting Card trigger if available */}
                    {visitingCard && (
                      <button
                        type="button"
                        onClick={() => setSelectedVisitingCard({
                          url: visitingCard,
                          title: owner.title,
                          provider: owner.providerName,
                          phone: owner.phone,
                          locality: owner.locality || 'Gondia'
                        })}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Visiting / Business Card</span>
                      </button>
                    )}

                    {/* Admin Moderation Controls if in moderation mode */}
                    {isAdmin && onModerate && (
                      <div className="pt-2 flex items-center gap-1.5 border-t border-slate-100">
                        {!isApproved(owner.status) ? (
                          <button
                            type="button"
                            onClick={() => onModerate(owner.id, true)}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onModerate(owner.id, false)}
                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Reject</span>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(owner.id)}
                            className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
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
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-slate-900">No Relevant Owners Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No verified owner listings match the selected category or filters. Reset filters or check other service categories.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('ALL')}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
            >
              View All Service Categories
            </button>
          </div>
        )}
      </div>

      {/* Visiting Card Modal */}
      {selectedVisitingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h4 className="font-extrabold text-sm text-slate-900 truncate">
                  Business Card • {selectedVisitingCard.provider}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedVisitingCard(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
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
