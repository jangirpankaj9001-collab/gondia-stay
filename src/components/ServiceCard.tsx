import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  Utensils, 
  Sparkles, 
  Home, 
  Shirt, 
  Zap, 
  Wrench, 
  Droplets, 
  ShieldCheck, 
  CreditCard, 
  Eye, 
  X,
  ShieldAlert,
  Award,
  Pencil,
  Camera,
  Trash2
} from 'lucide-react';
import { ServiceItem, ServiceCategory, SERVICE_CATEGORIES, isApproved, isPending } from '../types';
import { openWhatsApp, formatDisplayPhone } from '../utils/contact';
import { useBackHandler, useApp } from '../context/AppContext';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ServiceGalleryModal, extractServicePhotos } from './ServiceGalleryModal';

interface ServiceCardProps {
  service: ServiceItem;
  isAdmin?: boolean;
  onModerate?: (serviceId: string, approve: boolean) => void;
  onDelete?: (serviceId: string) => void;
  onEdit?: (service: ServiceItem) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, 
  isAdmin = false,
  onModerate,
  onDelete,
  onEdit
}) => {
  const { isServiceOwner } = useApp();
  const canEdit = Boolean(onEdit && (isAdmin || isServiceOwner(service)));
  const [showVisitingCardModal, setShowVisitingCardModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Close gallery, visiting card or photo preview first when pressing Android back button
  useBackHandler(showGallery, () => setShowGallery(false), 'service-gallery-modal');
  useBackHandler(showVisitingCardModal, () => setShowVisitingCardModal(false), 'service-visiting-card');
  useBackHandler(Boolean(selectedPhoto), () => setSelectedPhoto(null), 'service-photo-preview');

  const categoryMeta = SERVICE_CATEGORIES.find(c => c.id === service.category) || {
    id: service.category,
    label: service.category,
    shortLabel: service.category,
    iconName: 'Sparkles',
    isMainHighlighted: false,
    defaultUnit: 'service',
    exampleCharge: service.charges,
    description: service.description
  };

  const isMessTiffin = service.category === 'MESS_TIFFIN';

  const defaultMsg = `Hello ${service.providerName || 'Sir/Ma\'am'}, I found your ${categoryMeta.label} '${service.title}' on Gondia Stay. I would like to inquire about your services and availability in ${service.locality || 'Gondia'}.`;

  // Extract all photos using shared robust extraction
  const allPhotos = extractServicePhotos(service);
  const heroPhoto = allPhotos.length > 0 
    ? allPhotos[0] 
    : isMessTiffin 
      ? '/hero_tiffin_mess.jpg' 
      : '/hero_gondia_stays.jpg';

  const visitingCard = service.businessCardPhoto || (allPhotos.length > 1 ? allPhotos[1] : null);

  const renderCategoryIcon = (category: ServiceCategory) => {
    switch (category) {
      case 'MESS_TIFFIN':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'MAID':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'HOUSEKEEPING':
        return <Home className="w-3.5 h-3.5" />;
      case 'LAUNDRY':
        return <Shirt className="w-3.5 h-3.5" />;
      case 'ELECTRICIAN':
        return <Zap className="w-3.5 h-3.5" />;
      case 'PLUMBER':
        return <Wrench className="w-3.5 h-3.5" />;
      case 'WATER_CANS':
        return <Droplets className="w-3.5 h-3.5" />;
      case 'SECURITY':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <>
      <div 
        onClick={() => setShowGallery(true)}
        className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col group relative cursor-pointer ${
        isMessTiffin 
          ? 'border-amber-300/80 shadow-md hover:shadow-2xl ring-1 ring-amber-400/30' 
          : 'border-slate-200/90 shadow-xs hover:shadow-xl'
      }`}>
        
        {/* Banner / Card Header Image */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
          <img 
            src={heroPhoto} 
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = isMessTiffin ? '/hero_tiffin_mess.jpg' : '/hero_gondia_stays.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-900/40" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            
            {/* Category Tag */}
            <span className={`text-xs font-black px-2.5 py-1 rounded-xl backdrop-blur-md flex items-center gap-1.5 shadow-sm ${
              isMessTiffin
                ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                : 'bg-blue-600/90 text-white'
            }`}>
              {renderCategoryIcon(service.category)}
              <span>{categoryMeta.shortLabel}</span>
            </span>
          </div>

          {/* Highlight Badge for Mess/Tiffin if highlighted */}
          {isMessTiffin && (
            <div className="absolute top-12 left-3">
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-200" />
                Main Gondia Food Service
              </span>
            </div>
          )}

          {/* Pending Status Banner if unapproved or has pending edit */}
          {!isApproved(service.status) ? (
            <div className="absolute top-12 right-3">
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm ${
                isPending(service.status)
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}>
                {isPending(service.status) ? 'Pending Approval' : 'Rejected'}
              </span>
            </div>
          ) : (service.hasPendingEdit && canEdit) ? (
            <div className="absolute top-12 right-3">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm bg-amber-400 text-slate-950 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-950" />
                <span>Pending Approval</span>
              </span>
            </div>
          ) : null}

          {/* Bottom Price / Charges Tag */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div className="text-white">
              <span className="text-xs text-slate-300 block font-medium">Standard Charges</span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
                {service.charges}
              </span>
            </div>

            {/* Business Card Button if available */}
            {visitingCard && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGallery(true);
                }}
                className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 transition-colors border border-white/30"
                title="View Visiting / Business Card"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                <span>Card</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            
            {/* Title & Provider */}
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
                {service.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap">
                <span className="font-semibold text-slate-900">
                  By: {service.providerName}
                </span>
                {service.experienceYears && (
                  <span className="text-slate-400">• {service.experienceYears}+ yrs exp</span>
                )}
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                </span>
              </div>
            </div>

            {/* Service Areas */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Service Areas in Gondia:</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {(service.serviceAreas || ['All Gondia']).slice(0, 4).map((area, idx) => (
                  <span 
                    key={idx} 
                    className="bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  >
                    {area}
                  </span>
                ))}
                {service.serviceAreas && service.serviceAreas.length > 4 && (
                  <span className="text-[10px] text-slate-400 font-bold self-center">
                    +{service.serviceAreas.length - 4} more
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
              {service.description}
            </p>

            {/* Timing / Availability */}
            {service.timing && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Hours: {service.timing}</span>
              </div>
            )}

            {/* Specialties / Highlights */}
            {service.specialties && service.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {service.specialties.slice(0, 3).map((spec, idx) => (
                  <span 
                    key={idx} 
                    className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {spec}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons: Phone & WhatsApp */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              
              {/* WhatsApp Contact Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openWhatsApp(service.whatsappNumber || service.phone, defaultMsg);
                }}
                className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-extrabold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                title={`WhatsApp ${service.providerName}`}
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>WhatsApp</span>
              </button>

              {/* Call Phone Button */}
              <a
                href={`tel:${service.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer text-center"
                title={`Call ${service.providerName}`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call ({formatDisplayPhone(service.phone).split(' ')[1] || 'Now'})</span>
              </a>
            </div>

            {/* Admin or Provider Controls */}
            {isAdmin ? (
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(service);
                    }}
                    className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Edit Service Details (Admin Direct Publish)"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                {onModerate && !isApproved(service.status) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onModerate(service.id, true);
                    }}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Publicly</span>
                  </button>
                )}
                {onModerate && isApproved(service.status) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onModerate(service.id, false);
                    }}
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            ) : canEdit ? (
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) onEdit(service);
                  }}
                  className={`flex-1 py-2 px-3 text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
                    service.hasPendingEdit
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black border border-amber-600 shadow-xs'
                      : isApproved(service.status)
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black border border-amber-600 shadow-xs'
                  }`}
                  title={
                    service.hasPendingEdit
                      ? 'Proposed changes pending admin approval. Click to view or edit.'
                      : isApproved(service.status)
                        ? 'Service approved & live. Click to edit.'
                        : 'Pending admin approval. Click to view or edit.'
                  }
                >
                  {service.hasPendingEdit ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                      <span>Pending Approval</span>
                    </>
                  ) : isApproved(service.status) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Approved ✓</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                      <span>Pending Approval</span>
                    </>
                  )}
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 shrink-0"
                    title="Delete Service Listing (Owner)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Visiting Card Preview Modal */}
      {showVisitingCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h4 className="font-extrabold text-sm text-slate-900">
                  Business / Visiting Card • {service.title}
                </h4>
              </div>
              <button 
                onClick={() => setShowVisitingCardModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-64">
              <img 
                src={visitingCard || heroPhoto} 
                alt={`${service.title} Visiting Card`}
                className="max-h-96 w-auto object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="p-4 bg-white flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-800">{service.providerName}</p>
                <p className="text-[11px] text-slate-500">{service.phone} • {service.locality}, Gondia</p>
              </div>
              <a
                href={`tel:${service.phone}`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
              >
                Call Directly
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        itemType="service"
        itemTitle={service.title}
        onConfirm={() => {
          if (onDelete) {
            onDelete(service.id);
          }
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Swipeable Photo Gallery Modal */}
      <ServiceGalleryModal
        isOpen={showGallery}
        provider={service}
        onClose={() => setShowGallery(false)}
      />
    </>
  );
};
