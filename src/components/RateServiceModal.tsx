import React, { useState } from 'react';
import { Star, X, CheckCircle2, Award } from 'lucide-react';
import { ServiceItem } from '../types';
import { useApp, useBackHandler } from '../context/AppContext';

interface RateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
}

const SCORE_LABELS: Record<number, string> = {
  1: '1 Star - Poor',
  2: '2 Stars - Fair',
  3: '3 Stars - Good',
  4: '4 Stars - Very Good',
  5: '5 Stars - Excellent'
};

export const RateServiceModal: React.FC<RateServiceModalProps> = ({
  isOpen,
  onClose,
  service
}) => {
  useBackHandler(isOpen, onClose, 'rate-service-modal');

  const { rateService, hasUserRatedService, getUserRatingForService } = useApp();
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [hoveredScore, setHoveredScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !service) return null;

  const alreadyRated = hasUserRatedService(service.id);
  const userPreviousScore = getUserRatingForService(service.id);
  const activeScore = hoveredScore || selectedScore;
  const hasRatings = Boolean(typeof service.rating === 'number' && service.rating > 0 && typeof service.reviewCount === 'number' && service.reviewCount > 0);
  const currentAvgRating = hasRatings ? service.rating!.toFixed(1) : null;
  const reviewCount = hasRatings ? service.reviewCount! : 0;

  const handleSubmit = async () => {
    if (selectedScore < 1 || selectedScore > 5 || isSubmitting || alreadyRated) return;
    setIsSubmitting(true);
    try {
      await rateService(service.id, selectedScore);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-200">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {alreadyRated ? 'Your Rating' : 'Rate Service Provider'}
              </h3>
              <p className="text-[11px] text-amber-100 truncate max-w-[200px]">
                {service.providerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-center">
          {/* Current Average Rating Badge */}
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 flex items-center justify-between text-left">
            <div>
              <span className="text-[11px] font-bold text-slate-600 block">Current Average</span>
              <span className="text-xs text-slate-500">
                {hasRatings ? `Based on ${reviewCount} ${reviewCount === 1 ? 'rating' : 'ratings'}` : 'No ratings submitted yet'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-xs">
              <Star className={`w-4 h-4 ${hasRatings ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
              <span className="text-sm font-black text-slate-900">
                {hasRatings ? currentAvgRating : 'No ratings yet.'}
              </span>
            </div>
          </div>

          {/* Already Rated Status */}
          {alreadyRated ? (
            <div className="py-2 space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>You have rated this provider {userPreviousScore}★</span>
              </div>

              <div className="flex items-center justify-center gap-1 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-7 h-7 ${
                      userPreviousScore && star <= userPreviousScore
                        ? 'fill-amber-400 text-amber-500'
                        : 'fill-slate-100 text-slate-300'
                    }`}
                  />
                ))}
              </div>

              <p className="text-[11px] text-slate-500">
                To keep ratings fair, each user can submit one rating per service. Thank you for your review!
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            /* Interactive Star Rating Form */
            <div className="space-y-4 py-1">
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">
                  How would you rate this service?
                </p>
                <p className="text-[11px] text-slate-500">
                  Tap stars to select (1 = Poor, 5 = Excellent)
                </p>
              </div>

              {/* 5-Star Selection Buttons */}
              <div 
                className="flex items-center justify-center gap-1.5 py-2"
                onMouseLeave={() => setHoveredScore(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = activeScore ? star <= activeScore : false;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedScore(star)}
                      onMouseEnter={() => setHoveredScore(star)}
                      className="p-2 rounded-xl hover:bg-amber-50 transition-transform active:scale-90 cursor-pointer"
                      title={SCORE_LABELS[star]}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                            : 'fill-slate-100 text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Score Description Label */}
              <div className="h-6 flex items-center justify-center">
                <span className={`text-xs font-black transition-opacity ${
                  activeScore ? 'text-amber-700' : 'text-slate-400'
                }`}>
                  {activeScore ? SCORE_LABELS[activeScore] : 'Tap a star to rate'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedScore === 0 || isSubmitting}
                  onClick={handleSubmit}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedScore === 0 || isSubmitting
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Submit Rating</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
