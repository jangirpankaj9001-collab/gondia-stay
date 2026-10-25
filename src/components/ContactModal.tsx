import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  Lock, 
  Phone, 
  MessageCircle, 
  CheckCircle,
  Eye,
  UserCheck
} from 'lucide-react';
import { formatDisplayPhone, openWhatsApp, dialPhone } from '../utils/contact';
import { ContactMethod } from '../types';
import { useBackHandler } from '../context/AppContext';

interface ContactModalProps {
  ownerName: string;
  ownerPhone: string;
  preferredMethod: ContactMethod;
  itemTitle: string;
  isMess?: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  ownerName,
  ownerPhone,
  preferredMethod,
  itemTitle,
  isMess = false,
  onClose
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  // Close Contact Modal when Android back button is pressed
  useBackHandler(true, onClose, 'contact-modal');

  const defaultMsg = isMess 
    ? `Hello ${ownerName}, I saw your '${itemTitle}' mess listing in Gondia on Gondia Stay app. Can I get details regarding monthly tiffin service?`
    : `Hello ${ownerName}, I saw your listing for '${itemTitle}' on Gondia Stay app. Is it currently available for rent?`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              {isMess ? "Mess Vendor Contact" : "Owner Verified Contact"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!isRevealed ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Contact Protected by Gondia Stay
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  To protect owners from automated spam, verified contact details are revealed upon your request. Connect directly without any middleman or brokerage fees.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-semibold text-slate-700 truncate">
                Listing: {itemTitle}
              </div>

              <button
                onClick={() => setIsRevealed(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:shadow-none active:scale-[0.99]"
              >
                <Eye className="w-4 h-4" />
                Reveal Contact Details
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <UserCheck className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-slate-900">{ownerName}</h4>
                <div className="text-xl font-black text-blue-600 tracking-wide mt-0.5">
                  {formatDisplayPhone(ownerPhone)}
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> WhatsApp Verified
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Pref: {preferredMethod}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                {/* WhatsApp Chat Button */}
                <button
                  onClick={() => openWhatsApp(ownerPhone, defaultMsg)}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-transform active:scale-[0.99]"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  Chat on WhatsApp
                </button>

                {/* Call Button */}
                <button
                  onClick={() => dialPhone(ownerPhone)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-transform active:scale-[0.99]"
                >
                  <Phone className="w-4 h-4" />
                  Call Now ({formatDisplayPhone(ownerPhone)})
                </button>

                <button
                  onClick={onClose}
                  className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
