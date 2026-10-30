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
  MapPin, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  CreditCard,
  Plus,
  X,
  SlidersHorizontal,
  Pencil,
  Clock,
  Camera,
  Trash2,
  KeyRound
} from 'lucide-react';
import { ServiceItem, ServiceCategory, SERVICE_CATEGORIES, isApproved } from '../types';
import { openWhatsApp, formatDisplayPhone } from '../utils/contact';
import { useBackHandler, useApp } from '../context/AppContext';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ServiceGalleryModal, extractServicePhotos } from './ServiceGalleryModal';
import { verifyServiceOwnershipSecurely } from '../firebase/servicesService';

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
    subIcon: <UtensilsCrossed className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />,
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
    subIcon: <Shirt className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />,
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
    subIcon: <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />,
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
    subIcon: <Wrench className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />,
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
    subIcon: <Droplets className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />,
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
    subIcon: <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />,
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
    subIcon: <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />,
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
    subIcon: <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2]" />,
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
  onEdit?: (service: ServiceItem) => void;
}

export const ServiceCategoryGrid: React.FC<ServiceCategoryGridProps> = ({
  services,
  selectedCategory,
  onSelectCategory,
  isAdmin = false,
  onModerate,
  onDelete,
  onEdit
}) => {
  const { 
    isServiceOwner, 
    saveServiceId, 
    saveServiceToken, 
    showToast 
  } = useApp();



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

  // Provider ownership verification state to unlock editing or deleting from another device
  const [verifyingService, setVerifyingService] = useState<ServiceItem | null>(null);
  const [verifyingAction, setVerifyingAction] = useState<'edit' | 'delete'>('edit');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Delete confirmation dialog state
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);

  // Swipeable photo gallery modal state
  const [selectedGalleryProvider, setSelectedGalleryProvider] = useState<ServiceItem | null>(null);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const handleProviderEditClick = (provider: ServiceItem) => {
    if (isAdmin || isServiceOwner(provider)) {
      if (onEdit) onEdit(provider);
      return;
    }
    // Need ownership verification via Owner ID or Edit Token
    setVerifyingService(provider);
    setVerifyingAction('edit');
    setVerifyInput('');
    setVerifyError(null);
  };

  const handleProviderDeleteClick = (provider: ServiceItem) => {
    if (isAdmin || isServiceOwner(provider)) {
      // Ask for confirmation before deletion
      setServiceToDelete(provider);
      return;
    }
    // Need ownership verification via Owner ID or Edit Token before asking for delete confirmation
    setVerifyingService(provider);
    setVerifyingAction('delete');
    setVerifyInput('');
    setVerifyError(null);
  };

  const handleVerifyOwnershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingService) return;
    const cleanInput = verifyInput.trim();
    if (!cleanInput) {
      setVerifyError('Please enter the private Edit Token for this service.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const isOwner = await verifyServiceOwnershipSecurely(verifyingService, cleanInput);
      if (isOwner) {
        saveServiceId(verifyingService.id);
        saveServiceToken(verifyingService.id, cleanInput);
        showToast(`Ownership verified for "${verifyingService.title}"!`);
        const target = verifyingService;
        const action = verifyingAction;
        setVerifyingService(null);
        if (action === 'delete') {
          // Ask for confirmation before deletion
          setServiceToDelete(target);
        } else if (onEdit) {
          onEdit(target);
        }
      } else {
        setVerifyError('Verification failed: The entered Edit Token does not match this service listing. Only the verified listing owner or admin can edit or delete this service.');
      }
    } catch {
      setVerifyError('Error checking service ownership. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

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

  // Android Phone Back-Button & Browser History Handlers:
  // Close gallery, visiting card preview modal first, or exit dedicated category view back to main grid
  useBackHandler(Boolean(selectedGalleryProvider), () => setSelectedGalleryProvider(null), 'service-gallery-view');
  useBackHandler(Boolean(selectedVisitingCard), () => setSelectedVisitingCard(null), 'visiting-card-preview');
  useBackHandler(Boolean(verifyingService), () => setVerifyingService(null), 'verify-service-owner');
  useBackHandler(Boolean(activeDedicatedCategory), handleBackToGrid, 'service-subcategory-view');

  // If a dedicated category is selected, get its configuration
  const currentConfig = activeDedicatedCategory 
    ? SUBCATEGORIES.find(c => c.id === activeDedicatedCategory) || SUBCATEGORIES[0]
    : null;

  // Filter approved providers (and owner's pending listings) for the dedicated view
  const dedicatedProviders = activeDedicatedCategory
    ? services.filter(service => {
        if (!isAdmin && !isApproved(service.status) && !isServiceOwner(service)) return false;
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
        <div>
          {/* Clean 2–4 Column Grid of Subcategory Icons */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {SUBCATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryIconClick(cat.id)}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-blue-500 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center text-center group cursor-pointer relative overflow-hidden active:scale-95"
              >
                {/* Large & Attractive Gradient Icon Container */}
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg ${cat.glow} group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 shrink-0 ring-4 ring-white/70`}>
                  {cat.subIcon}
                </div>

                {/* Only the Relevant Category Name in Bold Below Each Icon */}
                <span className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight mt-3.5 text-center leading-snug">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: DEDICATED VIEW SHOWING ONLY THAT CATEGORY'S SERVICE PROVIDERS
            Opens when any category icon is clicked
           ========================================================================= */
        <div className="space-y-6 animate-fadeIn">
          
          {/* Subcategory Quick Selector */}
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
                
                // Collect all uploaded photos
                const allPhotos = extractServicePhotos(provider);
                const primaryPhoto = allPhotos.length > 0 ? allPhotos[0] : null;
                const visitingCard = provider.businessCardPhoto || (allPhotos.length > 1 ? allPhotos[1] : null);

                return (
                  <div
                    key={provider.id}
                    onClick={() => {
                      setSelectedGalleryProvider(provider);
                      setGalleryInitialIndex(0);
                    }}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group cursor-pointer"
                    title={`Tap to view all photos for ${provider.providerName}`}
                  >
                    <div>
                      {/* Photo Header */}
                      <div 
                        className="h-44 w-full bg-slate-100 relative overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGalleryProvider(provider);
                          setGalleryInitialIndex(0);
                        }}
                      >
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
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                          <span className="bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                            {currentConfig?.name}
                          </span>
                          {provider.hasPendingEdit && (
                            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-950" />
                              <span>Edit Pending</span>
                            </span>
                          )}
                          {provider.isFeatured && (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                              Featured
                            </span>
                          )}
                        </div>



                        {/* Charges Bottom Pill on Image */}
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1 rounded-xl shadow-sm">
                          <span className="text-xs font-black text-amber-800">
                            {provider.charges}
                          </span>
                        </div>

                        {/* Photos count badge */}
                        {allPhotos.length > 0 && (
                          <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                            <Camera className="w-3 h-3 text-blue-400" />
                            <span>{allPhotos.length} {allPhotos.length === 1 ? 'Photo' : 'Photos'}</span>
                          </div>
                        )}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(provider.whatsappNumber || provider.phone, whatsappMsg);
                          }}
                          className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                          title={`WhatsApp ${provider.providerName}`}
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Phone Call Button */}
                        <a
                          href={`tel:${provider.phone}`}
                          onClick={(e) => e.stopPropagation()}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            const cardIndex = allPhotos.indexOf(visitingCard);
                            setSelectedGalleryProvider(provider);
                            setGalleryInitialIndex(cardIndex >= 0 ? cardIndex : 0);
                          }}
                          className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          <span>View Visiting / Business Card</span>
                        </button>
                      )}

                      {/* Admin Moderation or Provider Controls */}
                      {isAdmin ? (
                        <div className="pt-2 flex items-center gap-1.5 border-t border-slate-100">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(provider);
                              }}
                              className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                              title="Edit service details (Admin Direct Publish)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}
                          {onModerate && !isApproved(provider.status) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onModerate(provider.id, true);
                              }}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Approve Listing
                            </button>
                          ) : onModerate ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onModerate(provider.id, false);
                              }}
                              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Reject Listing
                            </button>
                          ) : null}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setServiceToDelete(provider);
                              }}
                              className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      ) : onEdit ? (
                        <div className="pt-2 flex items-center gap-2 border-t border-slate-100 flex-wrap sm:flex-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProviderEditClick(provider);
                            }}
                            className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                            title="Edit Service Listing (Provider)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit Service Listing</span>
                          </button>

                          {onDelete && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProviderDeleteClick(provider);
                              }}
                              className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 shrink-0"
                              title="Delete Service Listing (Owner)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Service Listing</span>
                            </button>
                          )}

                          {provider.hasPendingEdit && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-1 rounded-lg border border-amber-300 shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Edit Pending</span>
                            </span>
                          )}
                        </div>
                      ) : null}
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

      {/* Provider Ownership Verification Modal to Unlock Editing or Deleting from Another Device */}
      {verifyingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl ${verifyingAction === 'delete' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center`}>
                  {verifyingAction === 'delete' ? <Trash2 className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {verifyingAction === 'delete' ? 'Verify Ownership to Delete' : 'Verify Service Ownership'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingService(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-800">
                Service: <span className="font-extrabold text-blue-700">{verifyingService.title}</span>
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                To {verifyingAction === 'delete' ? 'delete' : 'edit'} this service listing on this device, please enter your private Edit Token.
              </p>
              <p className="text-[11px] text-slate-400 leading-normal">
                Only the listing owner and admin can {verifyingAction === 'delete' ? 'delete' : 'edit'} it; other owners cannot modify someone else's service.
              </p>
            </div>

            {verifyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {verifyError}
              </div>
            )}

            <form onSubmit={handleVerifyOwnershipSubmit} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Private Service Edit Token *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder="Enter Edit Token (e.g. gst_srv_...)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white outline-none"
                />
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Your private token provided upon creating this service. Once verified, this device will remember ownership.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingService(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className={`px-5 py-2 ${verifyingAction === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5`}
                >
                  {isVerifying ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      {verifyingAction === 'delete' ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{verifyingAction === 'delete' ? 'Verify & Delete' : 'Verify & Edit'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationModal
        isOpen={Boolean(serviceToDelete)}
        itemType="service"
        itemTitle={serviceToDelete?.title}
        onConfirm={() => {
          if (serviceToDelete && onDelete) {
            onDelete(serviceToDelete.id);
            setServiceToDelete(null);
          }
        }}
        onCancel={() => setServiceToDelete(null)}
      />

      {/* Swipeable Photo Gallery Modal */}
      <ServiceGalleryModal
        isOpen={Boolean(selectedGalleryProvider)}
        provider={selectedGalleryProvider}
        initialIndex={galleryInitialIndex}
        onClose={() => {
          setSelectedGalleryProvider(null);
          setGalleryInitialIndex(0);
        }}
      />

    </div>
  );
};
