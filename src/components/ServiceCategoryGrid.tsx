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
  X
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
    glow: 'shadow-amber-500/20',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    badgeBg: 'bg-amber-100/90 border-amber-300',
    badgeText: 'text-amber-900',
    tag: 'Popular & Essential',
    subIcons: [
      { icon: <Clock className="w-3 h-3 text-amber-500" />, label: 'Daily Meals' },
      { icon: <Award className="w-3 h-3 text-orange-500" />, label: 'Homestyle Veg' },
      { icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />, label: 'Doorstep Tiffin' }
    ]
  },
  MAID: {
    gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    glow: 'shadow-emerald-500/20',
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
    glow: 'shadow-blue-500/20',
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    badgeBg: 'bg-indigo-100/90 border-indigo-300',
    badgeText: 'text-indigo-900',
    tag: 'Mechanized Deep Clean',
    subIcons: [
      { icon: <Sparkles className="w-3 h-3 text-indigo-500" />, label: 'Deep Tile Scrub' },
      { icon: <ShieldCheck className="w-3 h-3 text-blue-500" />, label: 'Eco Chemicals' },
      { icon: <CheckCircle2 className="w-3 h-3 text-indigo-500" />, label: 'Move-in Ready' }
    ]
  },
  LAUNDRY: {
    gradient: 'from-purple-500 via-violet-600 to-purple-700',
    glow: 'shadow-purple-500/20',
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
    glow: 'shadow-amber-500/20',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
    badgeBg: 'bg-amber-100/90 border-amber-300',
    badgeText: 'text-amber-900',
    tag: '24x7 Emergency',
    subIcons: [
      { icon: <Clock className="w-3 h-3 text-amber-600" />, label: '24x7 Emergency' },
      { icon: <Award className="w-3 h-3 text-yellow-600" />, label: 'Govt Certified' },
      { icon: <CheckCircle2 className="w-3 h-3 text-amber-600" />, label: 'Inverter/Cooler' }
    ]
  },
  PLUMBER: {
    gradient: 'from-cyan-500 via-blue-500 to-cyan-600',
    glow: 'shadow-cyan-500/20',
    iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    badgeBg: 'bg-cyan-100/90 border-cyan-300',
    badgeText: 'text-cyan-900',
    tag: '30-Min Fast Arrival',
    subIcons: [
      { icon: <Clock className="w-3 h-3 text-cyan-600" />, label: '30 Min Arrival' },
      { icon: <CheckCircle2 className="w-3 h-3 text-blue-600" />, label: 'Leak Repair' },
      { icon: <Award className="w-3 h-3 text-cyan-600" />, label: 'Tank Cleaning' }
    ]
  },
  WATER_CANS: {
    gradient: 'from-sky-400 via-blue-500 to-cyan-500',
    glow: 'shadow-sky-500/20',
    iconBg: 'bg-sky-50 text-sky-600 border-sky-200',
    badgeBg: 'bg-sky-100/90 border-sky-300',
    badgeText: 'text-sky-900',
    tag: 'Chilled RO 20L',
    subIcons: [
      { icon: <CheckCircle2 className="w-3 h-3 text-sky-600" />, label: 'RO + UV Pure' },
      { icon: <Award className="w-3 h-3 text-blue-600" />, label: '20L Jars' },
      { icon: <MapPin className="w-3 h-3 text-sky-600" />, label: 'Room Delivery' }
    ]
  },
  SECURITY: {
    gradient: 'from-slate-700 via-slate-800 to-slate-900',
    glow: 'shadow-slate-500/20',
    iconBg: 'bg-slate-100 text-slate-700 border-slate-300',
    badgeBg: 'bg-slate-200/90 border-slate-300',
    badgeText: 'text-slate-900',
    tag: 'CCTV & Guards',
    subIcons: [
      { icon: <Eye className="w-3 h-3 text-blue-500" />, label: 'Live Mobile App' },
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
}

export const ServiceCategoryGrid: React.FC<ServiceCategoryGridProps> = ({
  services,
  selectedCategory,
  onSelectCategory,
  isAdmin = false
}) => {
  // Track expanded categories on mobile/compact view if desired
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const renderCategoryIcon = (category: ServiceCategory) => {
    switch (category) {
      case 'MESS_TIFFIN':
        return <Utensils className="w-5 h-5" />;
      case 'MAID':
        return <Sparkles className="w-5 h-5" />;
      case 'HOUSEKEEPING':
        return <Home className="w-5 h-5" />;
      case 'LAUNDRY':
        return <Shirt className="w-5 h-5" />;
      case 'ELECTRICIAN':
        return <Zap className="w-5 h-5" />;
      case 'PLUMBER':
        return <Wrench className="w-5 h-5" />;
      case 'WATER_CANS':
        return <Droplets className="w-5 h-5" />;
      case 'SECURITY':
        return <ShieldCheck className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const totalVerifiedOwners = services.filter(s => isAdmin || isApproved(s.status)).length;

  return (
    <div className="space-y-4">
      {/* Grid Header & Quick Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Service Categories & Registered Owners
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tap any service category card below to browse its verified local owners and direct contact numbers
          </p>
        </div>

        {/* View All / Reset Filter Action */}
        <div className="flex items-center gap-2">
          {selectedCategory !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectCategory('ALL')}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 border border-blue-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Show All Categories ({totalVerifiedOwners} Owners)</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Responsive Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {SERVICE_CATEGORIES.map(category => {
          const design = CATEGORY_DESIGNS[category.id];
          const isSelected = selectedCategory === category.id;
          
          // Get appropriate owners listed for this category
          const categoryOwners = services.filter(s => 
            s.category === category.id && (isAdmin || isApproved(s.status))
          );

          const isExpanded = expandedCategoryId === category.id || isSelected;

          return (
            <div
              key={category.id}
              className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative group bg-white shadow-xs hover:shadow-xl ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-md bg-gradient-to-b from-blue-50/40 via-white to-white'
                  : category.isMainHighlighted
                    ? 'border-amber-300 hover:border-amber-400 hover:shadow-amber-500/10'
                    : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Category Top Banner */}
              <div className="p-4 sm:p-5 space-y-3.5 border-b border-slate-100">
                
                {/* Header row: Modern Sub-Icon + Badges */}
                <div className="flex items-start justify-between gap-2.5">
                  
                  {/* Modern Sub-Icon in glowing gradient box */}
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${design.gradient} text-white flex items-center justify-center shadow-lg ${design.glow} group-hover:scale-105 transition-transform duration-300`}>
                      {renderCategoryIcon(category.id)}
                    </div>
                    {/* Micro Verified Sub-badge */}
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs border border-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                    </div>
                  </div>

                  {/* Badge & Highlight */}
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${design.badgeBg} ${design.badgeText}`}>
                      {design.tag}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {category.exampleCharge}
                    </span>
                  </div>
                </div>

                {/* Title and Short Description */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
                      {category.label}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                    {category.description}
                  </p>
                </div>

                {/* Modern Sub-Icon Feature Pills */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {design.subIcons.map((sub, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] font-semibold text-slate-600"
                    >
                      {sub.icon}
                      <span>{sub.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Appropriate Owners Listed Inside This Category */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-slate-50/50">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      Appropriate Owners Listed ({categoryOwners.length})
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Direct Connect
                    </span>
                  </div>

                  {categoryOwners.length > 0 ? (
                    <div className="space-y-2">
                      {categoryOwners.map((owner) => {
                        const whatsappMsg = `Hello ${owner.providerName}, I found your ${category.shortLabel} listing '${owner.title}' on Gondia Stay. I would like to inquire about your availability in ${owner.locality || 'Gondia'}.`;

                        return (
                          <div 
                            key={owner.id}
                            className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs hover:border-blue-400 transition-colors space-y-2 group/owner"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-extrabold text-xs text-slate-900 truncate">
                                    {owner.providerName}
                                  </h4>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                  {owner.title}
                                </p>
                              </div>

                              {/* Rating */}
                              <div className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                <span>{owner.rating || '4.8'}</span>
                              </div>
                            </div>

                            {/* Locality & Pricing metadata */}
                            <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                              <div className="flex items-center gap-1 text-slate-500 truncate">
                                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="truncate">{owner.locality || 'All Gondia'}</span>
                              </div>
                              <span className="font-extrabold text-amber-700 text-xs shrink-0">
                                {owner.charges}
                              </span>
                            </div>

                            {/* Quick Call & WhatsApp Buttons for this owner */}
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(owner.whatsappNumber || owner.phone, whatsappMsg);
                                }}
                                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                title={`WhatsApp ${owner.providerName}`}
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600 fill-current" />
                                <span>WhatsApp</span>
                              </button>

                              <a
                                href={`tel:${owner.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center cursor-pointer"
                                title={`Call ${owner.providerName}`}
                              >
                                <Phone className="w-3 h-3 text-blue-600" />
                                <span>Call</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-1">
                      <p className="text-xs font-bold text-slate-700">No verified owners yet</p>
                      <p className="text-[10px] text-slate-400">Be the first to list this service in Gondia</p>
                    </div>
                  )}
                </div>

                {/* Footer Action: Filter/Focus category */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(isSelected ? 'ALL' : category.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>{isSelected ? 'Viewing All In This Category' : `Explore ${categoryOwners.length} ${category.shortLabel} Owners`}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
