import React from 'react';
import { Trash2, X } from 'lucide-react';
import { useBackHandler } from '../context/AppContext';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  itemType: 'property' | 'service';
  itemTitle?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  itemType,
  itemTitle,
  onConfirm,
  onCancel
}) => {
  // Close confirmation modal on Android back button
  useBackHandler(isOpen, onCancel, 'delete-confirm-modal');

  if (!isOpen) return null;

  const isProperty = itemType === 'property';
  const questionText = isProperty 
    ? 'Are you sure you want to delete this property?' 
    : 'Are you sure you want to delete this service?';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 p-6 text-center">
        {/* Close X button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6" />
        </div>

        {/* Dialog Title */}
        <h3 id="delete-dialog-title" className="text-base font-extrabold text-slate-900">
          Delete {isProperty ? 'Property' : 'Service'}
        </h3>

        {/* Question Text */}
        <p className="text-sm text-slate-600 font-medium mt-2">
          {questionText}
        </p>

        {/* Item Title if available */}
        {itemTitle && (
          <div className="mt-3 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 truncate">
            {itemTitle}
          </div>
        )}

        {/* Action Buttons: Cancel and Yes, Delete */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Yes, Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
