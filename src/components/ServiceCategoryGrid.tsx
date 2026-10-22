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
  CreditCard,
  UserCheck,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { ServiceItem, ServiceCategory, SERVICE_CATEGORIES, isApproved } from '../types';
import { openWhatsApp, formatDisplayPhone } from '../utils/contact';

interface CategoryStyle {
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  tag: string;
  subIcon: React.ReactNode;
}

const CATEGORY_STYLES: Record<ServiceCategory, CategoryStyle> = {
  MESS_TIFFIN: {
    iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
    badgeText: 'text-amber-800',
    tag: 'Daily Meals & Tiffin',
    subIcon: <Utensils className="w-4 h-4 text-amber-600" />
  },
  MAID: {
    iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badgeText: 'text-emerald-800',
    tag: 'Police Verified Maid',
    subIcon: <Sparkles className="w-4 h-4 text-emerald-600" />
  },
  HOUSEKEEPING: {
    iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    badgeText: 'text-indigo-800',
    tag: 'Deep Home Cleaning',
    subIcon: <Home className="w-4 h-4 text-indigo-600" />
  },
  LAUNDRY: {
    iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-50 border-purple-200 text-purple-800',
    badgeText: 'text-purple-800',
    tag: 'Steam Press & Pickup',
    subIcon: <Shirt className="w-4 h-4 text-purple-600" />
  },
  ELECTRICIAN: {
    iconBg: 'bg-yellow-100 text-amber-700 border-yellow-200',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-yellow-50 border-yellow-200 text-amber-800',
    badgeText: 'text-amber-800',
    tag: '24x7 Electrician',
    subIcon: <Zap className="w-4 h-4 text-amber-600" />
  },
  PLUMBER: {
    iconBg: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    iconColor: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    badgeText: 'text-cyan-800',
    tag: 'Quick Leak Repair',
    subIcon: <Wrench className="w-4 h-4 text-cyan-600" />
  },
  WATER_CANS: {
    iconBg: 'bg-sky-100 text-sky-700 border-sky-200',
    iconColor: 'text-sky-600',
    badgeBg: 'bg-sky-50 border-sky-200 text-sky-800',
    badgeText: 'text-sky-800',
    tag: 'Pure RO 20L Cans',
    subIcon: <Droplets className="w-4 h-4 text-sky-600" />
  },
  SECURITY: {
    iconBg: 'bg-slate-200 text-slate-800 border-slate-300',
    iconColor: 'text-slate-700',
    badgeBg: 'bg-slate-100 border-slate-300 text-slate-800',
    badgeText: 'text-slate-800',
    tag: 'CCTV & Night Guards',
    subIcon: <ShieldCheck className="w-4 h-4 text-slate-700" />
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
  // Modal state for visiting card
  const [selectedVisitingCard, setSelectedVisitingCard] = useState<{
    url: string;
    title: string;
    provider: string;
    phone: string;
    locality: string;
  } | null>(null);

  // Expanded state for cards that have more than 2 owners
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

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

  // Filter categories to display (either single selected or all)
  const categoriesToDisplay = selectedCategory === 'ALL'
    ? SERVICE_CATEGORIES
    : SERVICE_CATEGORIES.filter(c => c.id === selectedCategory);

  const totalVerifiedOwners = services.filter(s => isAdmin || isApproved(s.status)).length;

  return (
    <div className="space-y-4">
      
      {/* Category Filter Pills (Simple and Clean) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        <button
          type="button"
          onClick={() => onSelectCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>All Categories ({totalVerifiedOwners})</span>
        </button>

        {SERVICE_CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const count = services.filter(s => 
            s.category === cat.id && (isAdmin || isApproved(s.status))
          ).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(isSelected ? 'ALL' : cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>{cat.shortLabel}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isSelected ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          GRID VIEW OF SERVICE CATEGORIES
          Each category card contains its relevant owner listings inside!
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {categoriesToDisplay.map(category => {
          const style = CATEGORY_STYLES[category.id];
          
          // Relevant owners for this category
          const categoryOwners = services.filter(s => 
            s.category === category.id && (isAdmin || isApproved(s.status))
          );

          const isExpanded = !!expandedCategories[category.id];
          const hasMoreThanTwo = categoryOwners.length > 2;
          const ownersToShow = (hasMoreThanTwo && !isExpanded)
            ? categoryOwners.slice(0, 2)
            : categoryOwners;

          return (
            <div
              key={category.id}
              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Category Card Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  
                  {/* Category Sub-Icon & Name */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${style.iconBg}`}>
                      {renderCategoryIcon(category.id)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                        {category.label}
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                        {category.exampleCharge}
                      </p>
                    </div>
                  </div>

                  {/* Owner count badge */}
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${style.badgeBg} ${style.badgeText} shrink-0`}>
                    {categoryOwners.length} {categoryOwners.length === 1 ? 'Owner' : 'Owners'}
                  </span>
                </div>

                {/* Short description */}
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {category.description}
                </p>
              </div>

              {/* Relevant Owner Listings INSIDE this Category Card */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-white">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Listed Owners & Contacts</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-extrabold normal-case">
                      Verified
                    </span>
                  </div>

                  {categoryOwners.length > 0 ? (
                    <div className="space-y-2.5">
                      {ownersToShow.map(owner => {
                        const whatsappMsg = `Hello ${owner.providerName}, I found your ${category.shortLabel} listing '${owner.title}' on Gondia Stay. I would like to inquire about your availability in ${owner.locality || 'Gondia'}.`;
                        const visitingCard = owner.businessCardPhoto || (owner.photos && owner.photos[1]) || null;

                        return (
                          <div 
                            key={owner.id}
                            className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 hover:border-slate-300 transition-colors space-y-2"
                          >
                            {/* Owner Row: Name & Rating */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                    {owner.providerName}
                                  </h4>
                                  <span title="Verified Owner" className="inline-flex items-center">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate font-medium">
                                  {owner.title}
                                </p>
                              </div>

                              <div className="flex items-center gap-0.5 text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 px-1.5 py-0.5 rounded shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                <span>{owner.rating || '4.8'}</span>
                              </div>
                            </div>

                            {/* Charges & Locality */}
                            <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-200/60 pt-1.5">
                              <div className="flex items-center gap-1 text-slate-500 truncate">
                                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                <span className="truncate">{owner.locality || 'All Gondia'}</span>
                              </div>
                              <span className="font-extrabold text-amber-800 shrink-0">
                                {owner.charges}
                              </span>
                            </div>

                            {/* Action Buttons: Direct WhatsApp & Phone Call */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => openWhatsApp(owner.whatsappNumber || owner.phone, whatsappMsg)}
                                className="py-1.5 px-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                                title={`WhatsApp ${owner.providerName}`}
                              >
                                <MessageCircle className="w-3 h-3 fill-current" />
                                <span>WhatsApp</span>
                              </button>

                              <a
                                href={`tel:${owner.phone}`}
                                className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors text-center cursor-pointer shadow-2xs"
                                title={`Call ${owner.providerName}`}
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call ({formatDisplayPhone(owner.phone).split(' ')[1] || 'Now'})</span>
                              </a>
                            </div>

                            {/* Visiting Card Button if available */}
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
                                className="w-full py-1 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CreditCard className="w-3 h-3 text-blue-600" />
                                <span>View Visiting Card</span>
                              </button>
                            )}

                            {/* Admin Controls */}
                            {isAdmin && onModerate && (
                              <div className="pt-1.5 flex items-center gap-1 border-t border-slate-200/60">
                                {!isApproved(owner.status) ? (
                                  <button
                                    type="button"
                                    onClick={() => onModerate(owner.id, true)}
                                    className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded"
                                  >
                                    Approve
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onModerate(owner.id, false)}
                                    className="flex-1 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded"
                                  >
                                    Reject
                                  </button>
                                )}
                                {onDelete && (
                                  <button
                                    type="button"
                                    onClick={() => onDelete(owner.id)}
                                    className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      No owners registered in this category yet.
                    </div>
                  )}
                </div>

                {/* Show More / Show Less toggle if more than 2 owners */}
                {hasMoreThanTwo && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpand(category.id)}
                      className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <span>Show Less</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Show All {categoryOwners.length} {category.shortLabel} Owners</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
