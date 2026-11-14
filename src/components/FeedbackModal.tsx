import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageSquarePlus,
  ImagePlus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send
} from 'lucide-react';
import { useApp, useBackHandler } from '../context/AppContext';
import { FeedbackCategory } from '../types';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { validateImageFile } from '../utils/imageOptimizer';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEEDBACK_CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  description: string;
  placeholder: string;
}[] = [
  {
    id: 'bug_report',
    label: 'Bug Report',
    description: 'Something broken or not working',
    placeholder: 'Describe what went wrong, what you tapped, and what happened...'
  },
  {
    id: 'suggestion',
    label: 'Suggestion',
    description: 'Feature or improvement idea',
    placeholder: 'Share your idea to make GondiaStay better...'
  },
  {
    id: 'general_query',
    label: 'General Query',
    description: 'Question or help needed',
    placeholder: 'Ask us anything about listings, services, or using GondiaStay...'
  }
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { activeTab, currentOwner, submitFeedback } = useApp();

  const [category, setCategory] = useState<FeedbackCategory>('bug_report');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedCategory, setSubmittedCategory] = useState<FeedbackCategory | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useBackHandler(isOpen, onClose, 'feedback-modal');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSubmittedCategory(null);
      setContactName(prev => prev || currentOwner?.name || '');
      setContactInfo(prev => prev || currentOwner?.phone || currentOwner?.email || '');
    }
  }, [isOpen, currentOwner]);

  if (!isOpen) return null;

  const resetForm = () => {
    setCategory('bug_report');
    setSubject('');
    setMessage('');
    setScreenshotUrl('');
    setUploadProgress(0);
    setError(null);
    setSubmittedCategory(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Please choose a valid image file (JPG, PNG, or WebP).');
      return;
    }

    setError(null);
    setIsUploadingScreenshot(true);
    setUploadProgress(10);

    try {
      const url = await uploadImageToCloudinary(
        file,
        (pct) => setUploadProgress(pct),
        'gondiastay_feedback'
      );
      setScreenshotUrl(url);
      setUploadProgress(100);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload screenshot. You can still submit without it.');
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isUploadingScreenshot) return;

    const trimmedMsg = message.trim();
    if (trimmedMsg.length < 5) {
      setError('Please enter at least 5 characters describing your feedback or issue.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await submitFeedback({
        category,
        subject: subject.trim() || undefined,
        message: trimmedMsg,
        screenshotUrl: screenshotUrl || undefined,
        contactName: contactName.trim() || undefined,
        contactInfo: contactInfo.trim() || undefined,
        pageContext: activeTab
      });

      if (res.success) {
        setSubmittedCategory(category);
      } else {
        setError(res.error || 'Could not submit feedback. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error while submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategoryMeta =
    FEEDBACK_CATEGORIES.find(c => c.id === category) || FEEDBACK_CATEGORIES[0];

  const getCategoryIcon = (cat: FeedbackCategory, active: boolean) => {
    const color = active
      ? cat === 'bug_report'
        ? 'text-rose-600'
        : cat === 'suggestion'
          ? 'text-amber-600'
          : 'text-blue-600'
      : 'text-slate-500';
    if (cat === 'bug_report') return <Bug className={`w-4 h-4 ${color}`} />;
    if (cat === 'suggestion') return <Lightbulb className={`w-4 h-4 ${color}`} />;
    return <HelpCircle className={`w-4 h-4 ${color}`} />;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquarePlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="feedback-modal-title" className="text-sm sm:text-base font-extrabold text-slate-900">
                Feedback & Report a Problem
              </h2>
              <p className="text-[11px] text-slate-500">
                Direct & private to GondiaStay Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close Feedback Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {submittedCategory ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">
                  Thank You! Feedback Received
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Your{' '}
                  <strong className="font-bold text-slate-800">
                    {FEEDBACK_CATEGORIES.find(c => c.id === submittedCategory)?.label}
                  </strong>{' '}
                  has been saved securely for administrator review.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
                >
                  Submit Another
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-sm min-h-[44px]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Select Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FEEDBACK_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 min-h-[48px] ${
                          isSelected
                            ? cat.id === 'bug_report'
                              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 text-rose-950'
                              : cat.id === 'suggestion'
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 text-amber-950'
                                : 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 text-blue-950'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {getCategoryIcon(cat.id, isSelected)}
                          <span className="text-xs font-extrabold leading-tight">{cat.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-tight hidden sm:block">
                          {cat.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject (Optional) */}
              <div className="space-y-1">
                <label htmlFor="feedback-subject" className="text-xs font-bold text-slate-800 block">
                  Subject <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  id="feedback-subject"
                  type="text"
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium text-slate-900"
                />
              </div>

              {/* Details / Message */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="feedback-message" className="text-xs font-bold text-slate-800">
                    Message / Details <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {message.length}/2000
                  </span>
                </div>
                <textarea
                  id="feedback-message"
                  required
                  rows={4}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={activeCategoryMeta.placeholder}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium text-slate-900 resize-y"
                />
              </div>

              {/* Optional Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Screenshot <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />

                {screenshotUrl ? (
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2 flex items-center gap-3">
                    <img
                      src={screenshotUrl}
                      alt="Feedback screenshot preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Screenshot attached
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Ready to send with your feedback
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotUrl('');
                        setUploadProgress(0);
                      }}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      aria-label="Remove screenshot"
                      title="Remove screenshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploadingScreenshot}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/80 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                  >
                    {isUploadingScreenshot ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Uploading screenshot... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4 text-blue-600" />
                        <span>Attach Screenshot (Optional)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Optional Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="space-y-1">
                  <label htmlFor="feedback-name" className="text-[11px] font-bold text-slate-700 block">
                    Your Name <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    id="feedback-name"
                    type="text"
                    maxLength={100}
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="feedback-contact" className="text-[11px] font-bold text-slate-700 block">
                    Phone or Email <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    id="feedback-contact"
                    type="text"
                    maxLength={150}
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="For follow-up if needed"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium text-slate-900"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingScreenshot}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs sm:text-sm font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[48px] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
