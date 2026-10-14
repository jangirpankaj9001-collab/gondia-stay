import React, { useState } from 'react';
import { 
  Star, 
  Utensils, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  MessageCircle, 
  Phone,
  ShieldCheck,
  Bike
} from 'lucide-react';
import { TiffinService } from '../types';
import { openWhatsApp } from '../utils/contact';
import { ContactModal } from './ContactModal';

interface TiffinCardProps {
  tiffin: TiffinService;
}

export const TiffinCard: React.FC<TiffinCardProps> = ({ tiffin }) => {
  const [showContactModal, setShowContactModal] = useState(false);

  const defaultMsg = `Hello ${tiffin.ownerName}, I saw your '${tiffin.name}' mess listing in ${tiffin.locality}, Gondia on Gondia Stay. Can I get details regarding monthly tiffin/food service?`;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col group">
        
        {/* Banner Image */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
          <img 
            src="/hero_tiffin_mess.jpg" 
            alt={tiffin.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = '/hero_tiffin_mess.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-900/40" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="bg-blue-600/95 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-xs">
              <Utensils className="w-3.5 h-3.5" />
              {tiffin.mealType}
            </span>

            {/* Rating */}
            <div className="bg-black/75 backdrop-blur-xs text-white text-xs font-extrabold px-2 py-1 rounded-lg flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>{tiffin.rating}</span>
              <span className="text-slate-400 text-[10px]">({tiffin.reviewCount})</span>
            </div>
          </div>

          {/* Bottom Price Bar */}
          <div className="absolute bottom-3 left-3 text-white">
            <span className="text-2xl font-black text-amber-300">
              ₹{tiffin.monthlyPayment.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-medium text-slate-200 ml-1">/ month</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
              {tiffin.name}
            </h3>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold text-blue-700">{tiffin.locality}, Gondia</span>
              <span className="truncate">• {tiffin.address}</span>
            </div>

            {/* Timings */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-2.5 bg-slate-50 p-2 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-medium">{tiffin.timing}</span>
            </div>

            {/* Menu Highlights */}
            <div className="mt-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Typical Thali Includes:
              </div>
              <ul className="text-xs text-slate-700 space-y-1">
                {tiffin.menuItems.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Facilities Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
              {tiffin.facilities.slice(0, 2).map((fac, idx) => (
                <span key={idx} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {fac}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            {/* Direct WhatsApp Message Button */}
            <button
              type="button"
              onClick={() => openWhatsApp(tiffin.ownerPhone, defaultMsg)}
              className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp</span>
            </button>

            {/* View & Contact Button */}
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Contact</span>
            </button>
          </div>
        </div>
      </div>

      {showContactModal && (
        <ContactModal
          ownerName={tiffin.ownerName}
          ownerPhone={tiffin.ownerPhone}
          preferredMethod={tiffin.ownerPreferredContact}
          itemTitle={tiffin.name}
          isMess={true}
          onClose={() => setShowContactModal(false)}
        />
      )}
    </>
  );
};
