import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Camera, 
  Phone, 
  MessageCircle, 
  CheckCircle2,
  Loader2,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { ServiceItem, SERVICE_CATEGORIES } from '../types';
import { useBackHandler } from '../context/AppContext';
import { formatDisplayPhone, openWhatsApp } from '../utils/contact';

export interface ServiceGalleryModalProps {
  isOpen: boolean;
  provider: ServiceItem | null;
  onClose: () => void;
  initialIndex?: number;
}

/**
 * Extracts all valid, unique photo URLs uploaded for this service provider.
 * Handles arrays, single strings, Cloudinary URLs, visiting cards, and fallback templates.
 */
export const extractServicePhotos = (provider: ServiceItem | null): string[] => {
  if (!provider) return [];
  const photosList: string[] = [];

  const addValidPhoto = (raw: any) => {
    if (!raw) return;
    if (typeof raw === 'string') {
      const clean = raw.trim();
      if (
        clean.length > 0 && 
        clean !== 'null' && 
        clean !== 'undefined' && 
        !photosList.includes(clean)
      ) {
        photosList.push(clean);
      }
    } else if (typeof raw === 'object') {
      const possibleUrl = raw.url || raw.photoUrl || raw.imageUrl || raw.src;
      if (typeof possibleUrl === 'string') {
        const clean = possibleUrl.trim();
        if (clean.length > 0 && !photosList.includes(clean)) {
          photosList.push(clean);
        }
      }
    }
  };

  // 1. Photos array on service
  if (Array.isArray(provider.photos)) {
    provider.photos.forEach(addValidPhoto);
  } else if (typeof provider.photos === 'string') {
    try {
      const parsed = JSON.parse(provider.photos);
      if (Array.isArray(parsed)) parsed.forEach(addValidPhoto);
      else addValidPhoto(provider.photos);
    } catch {
      (provider.photos as string).split(',').forEach(addValidPhoto);
    }
  }

  // 2. Business card / Visiting card photo
  addValidPhoto(provider.businessCardPhoto);

  // 3. Alternative/legacy fields from Firestore
  addValidPhoto((provider as any).photoUrl);
  addValidPhoto((provider as any).photo);
  addValidPhoto((provider as any).imageUrl);
  if (Array.isArray((provider as any).images)) {
    (provider as any).images.forEach(addValidPhoto);
  }

  // 4. Proposed pending edit photos if under review
  if (provider.pendingEdit) {
    if (Array.isArray(provider.pendingEdit.photos)) {
      provider.pendingEdit.photos.forEach(addValidPhoto);
    }
    addValidPhoto(provider.pendingEdit.businessCardPhoto);
  }

  // 5. Default fallback if no photos were uploaded
  if (photosList.length === 0) {
    photosList.push(
      provider.category === 'MESS_TIFFIN' 
        ? '/hero_tiffin_mess.jpg' 
        : '/hero_gondia_stays.jpg'
    );
  }

  return photosList;
};

export const ServiceGalleryModal: React.FC<ServiceGalleryModalProps> = ({
  isOpen,
  provider,
  onClose,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Android back button integration
  useBackHandler(isOpen, onClose, 'service-gallery-modal');

  // Extract all photos uploaded by this provider
  const allPhotos = React.useMemo(() => {
    return extractServicePhotos(provider);
  }, [provider]);

  // Synchronize initial index when modal opens or provider changes
  useEffect(() => {
    if (isOpen) {
      const safeIndex = initialIndex >= 0 && initialIndex < allPhotos.length ? initialIndex : 0;
      setCurrentIndex(safeIndex);
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, provider?.id, initialIndex, allPhotos.length]);

  const activeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, allPhotos.length - 1));

  // Reset loading & error state whenever active photo changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [activeIndex]);

  const handlePrev = useCallback(() => {
    if (allPhotos.length <= 1) return;
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : allPhotos.length - 1));
  }, [allPhotos.length]);

  const handleNext = useCallback(() => {
    if (allPhotos.length <= 1) return;
    setCurrentIndex(prev => (prev < allPhotos.length - 1 ? prev + 1 : 0));
  }, [allPhotos.length]);

  // Keyboard navigation (Arrow keys + Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Touch Swipe Handlers for mobile gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!isOpen || !provider) return null;

  const currentPhotoUrl = allPhotos[activeIndex] || '/hero_gondia_stays.jpg';
  const catMeta = SERVICE_CATEGORIES.find(c => c.id === provider.category);
  const whatsappMsg = `Hello ${provider.providerName}, I saw your ${catMeta?.label || 'service'} photos for '${provider.title}' on Gondia Stay app. I would like to inquire about your services in ${provider.locality || 'Gondia'}.`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto select-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Main Dialog Container */}
      <div 
        className="relative w-full max-w-3xl my-auto bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              {provider.providerName ? provider.providerName[0].toUpperCase() : 'S'}
            </div>
            <div className="truncate">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate flex items-center gap-1.5">
                <span className="truncate">{provider.title}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {provider.providerName} • {provider.locality || 'Gondia'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Photo Counter */}
            <div className="bg-slate-800/90 text-slate-200 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 border border-slate-700 shadow-xs">
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span>{activeIndex + 1} / {allPhotos.length}</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Gallery"
              title="Close Gallery (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Swipeable Photo Stage Area - Explicit Height so images NEVER collapse */}
        <div 
          className="relative w-full h-[52vh] sm:h-[62vh] min-h-[300px] bg-slate-950 flex items-center justify-center overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Loading Spinner Indicator */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 z-10 backdrop-blur-xs">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-semibold text-slate-300">Loading photo...</span>
            </div>
          )}

          {/* Error Notice & Safe Fallback Display */}
          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 z-10 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="text-sm font-bold text-white">{provider.title}</p>
                <p className="text-xs text-slate-400">Photo {activeIndex + 1} of {allPhotos.length}</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Unable to display this image preview directly. Tap below to retry loading or call the provider directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setHasError(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Photo</span>
              </button>
            </div>
          ) : (
            <img 
              key={`${currentPhotoUrl}-${activeIndex}`}
              src={currentPhotoUrl} 
              alt={`${provider.title} - Photo ${activeIndex + 1}`}
              onLoad={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onError={(e) => {
                const target = e.currentTarget;
                setIsLoading(false);
                // Safe single fallback without recursive error looping
                if (!target.src.endsWith('/hero_gondia_stays.jpg')) {
                  target.src = '/hero_gondia_stays.jpg';
                } else {
                  setHasError(true);
                }
              }}
              className={`max-h-[50vh] sm:max-h-[60vh] max-w-full w-auto h-auto object-contain mx-auto transition-opacity duration-200 select-none ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />
          )}

          {/* Left Arrow Button */}
          {allPhotos.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md transition-all shadow-lg active:scale-90 cursor-pointer border border-slate-700/80 z-20"
              title="Previous Photo (Swipe Right)"
              aria-label="Previous Photo"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Right Arrow Button */}
          {allPhotos.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md transition-all shadow-lg active:scale-90 cursor-pointer border border-slate-700/80 z-20"
              title="Next Photo (Swipe Left)"
              aria-label="Next Photo"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Swipe Hint indicator */}
          {allPhotos.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-slate-300 pointer-events-none border border-slate-700/60 shadow-xs">
              Swipe left or right
            </div>
          )}
        </div>

        {/* Thumbnail Navigation Strip */}
        {allPhotos.length > 1 && (
          <div className="bg-slate-950 px-3 py-2.5 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {allPhotos.map((photoUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsLoading(true);
                  setHasError(false);
                }}
                className={`relative w-14 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer bg-slate-900 ${
                  idx === activeIndex
                    ? 'border-blue-500 scale-105 shadow-md ring-2 ring-blue-500/40'
                    : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
                aria-label={`View photo ${idx + 1}`}
              >
                <img 
                  src={photoUrl} 
                  alt={`Thumbnail ${idx + 1}`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/hero_gondia_stays.jpg';
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Footer Bar with Provider Details & Contact Buttons */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Charges:</span>
              <span className="text-sm sm:text-base font-black text-amber-400">{provider.charges || 'Contact for rates'}</span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
              {provider.description || provider.title}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openWhatsApp(provider.whatsappNumber || provider.phone, whatsappMsg)}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </button>

            <a
              href={`tel:${provider.phone}`}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 text-center cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call ({formatDisplayPhone(provider.phone).split(' ')[1] || 'Now'})</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
