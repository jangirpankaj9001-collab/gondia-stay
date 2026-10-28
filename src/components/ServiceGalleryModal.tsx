import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Camera, 
  Phone, 
  MessageCircle, 
  CheckCircle2
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

export const ServiceGalleryModal: React.FC<ServiceGalleryModalProps> = ({
  isOpen,
  provider,
  onClose,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Android back button integration
  useBackHandler(isOpen, onClose, 'service-gallery-modal');

  // Reset current index when modal opens or provider changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex >= 0 ? initialIndex : 0);
    }
  }, [isOpen, provider?.id, initialIndex]);

  if (!isOpen || !provider) return null;

  // Gather all unique photos uploaded by this provider
  const allPhotos: string[] = [];
  if (Array.isArray(provider.photos)) {
    provider.photos.forEach(p => {
      if (typeof p === 'string' && p.trim().length > 0 && !allPhotos.includes(p.trim())) {
        allPhotos.push(p.trim());
      }
    });
  }
  if (provider.businessCardPhoto && typeof provider.businessCardPhoto === 'string' && provider.businessCardPhoto.trim().length > 0) {
    if (!allPhotos.includes(provider.businessCardPhoto.trim())) {
      allPhotos.push(provider.businessCardPhoto.trim());
    }
  }

  // Fallback if no photos uploaded
  if (allPhotos.length === 0) {
    allPhotos.push(provider.category === 'MESS_TIFFIN' ? '/hero_tiffin_mess.jpg' : '/hero_gondia_stays.jpg');
  }

  const activeIndex = Math.min(Math.max(0, currentIndex), allPhotos.length - 1);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : allPhotos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < allPhotos.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allPhotos.length]);

  // Touch Swipe Handlers for mobile swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      // Swiped Left -> Next
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Previous
      handlePrev();
    }
  };

  const catMeta = SERVICE_CATEGORIES.find(c => c.id === provider.category);
  const whatsappMsg = `Hello ${provider.providerName}, I saw your ${catMeta?.label || 'service'} photos for '${provider.title}' on Gondia Stay app. Can you provide details?`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Container */}
      <div className="relative w-full max-w-3xl max-h-[95vh] bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden z-10">
        
        {/* Header Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {provider.providerName[0] || 'S'}
            </div>
            <div className="truncate">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate flex items-center gap-1.5">
                <span>{provider.title}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {provider.providerName} • {provider.locality || 'Gondia'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Photo Counter */}
            <div className="bg-slate-800/90 text-slate-200 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-slate-700">
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span>{activeIndex + 1} / {allPhotos.length}</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Gallery"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gallery Image Display & Swipe Area */}
        <div 
          className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] sm:min-h-[420px] max-h-[60vh] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            key={allPhotos[activeIndex]}
            src={allPhotos[activeIndex]} 
            alt={`${provider.title} - Photo ${activeIndex + 1}`}
            className="w-full h-full object-contain max-h-[60vh] transition-all duration-300 animate-in fade-in"
            onError={(e) => {
              e.currentTarget.src = provider.category === 'MESS_TIFFIN' ? '/hero_tiffin_mess.jpg' : '/hero_gondia_stays.jpg';
            }}
          />

          {/* Left Navigation Arrow */}
          {allPhotos.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-all shadow-lg active:scale-90 cursor-pointer border border-white/10"
              title="Previous Photo (Swipe Right)"
              aria-label="Previous Photo"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Right Navigation Arrow */}
          {allPhotos.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-all shadow-lg active:scale-90 cursor-pointer border border-white/10"
              title="Next Photo (Swipe Left)"
              aria-label="Next Photo"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {/* Swipe Hint indicator on mobile */}
          {allPhotos.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[10px] text-slate-300 pointer-events-none">
              Swipe left or right
            </div>
          )}
        </div>

        {/* Thumbnail Preview Strip */}
        {allPhotos.length > 1 && (
          <div className="bg-slate-950 px-3 py-2 border-t border-slate-850 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {allPhotos.map((photoUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  idx === activeIndex
                    ? 'border-blue-500 scale-105 shadow-md ring-2 ring-blue-500/40'
                    : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img 
                  src={photoUrl} 
                  alt={`Thumbnail ${idx + 1}`} 
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Footer Info & Direct Contact Actions */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Standard Charges:</span>
              <span className="text-sm sm:text-base font-black text-amber-400">{provider.charges}</span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
              {provider.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openWhatsApp(provider.whatsappNumber || provider.phone, whatsappMsg)}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </button>

            <a
              href={`tel:${provider.phone}`}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 text-center cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Provider</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
