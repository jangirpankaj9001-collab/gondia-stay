import React from 'react';
import { Building2, MapPin, Bookmark, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ServicesHouseIconProps {
  className?: string;
  isActive?: boolean;
}

export const ServicesHouseIcon: React.FC<ServicesHouseIconProps> = ({ 
  className = "w-[33px] h-[33px]",
  isActive = false 
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center transition-all duration-200 ${isActive ? 'scale-105' : 'hover:scale-105'}`}>
      <svg 
        viewBox="0 0 36 36" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} transition-all`}
        aria-hidden="true"
      >
        <defs>
          <filter id="services-icon-glow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#0F172A" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Outer Shadow & White House Frame Container */}
        <g filter="url(#services-icon-glow)">
          {/* Chimney on Right Slope */}
          <rect x="25.2" y="7" width="3.2" height="6.5" rx="1.2" fill="#1565C0" />
          <rect x="24.4" y="6" width="4.8" height="1.8" rx="0.9" fill="#1976D2" />

          {/* White House Body Background */}
          <path 
            d="M6 15V29C6 30.66 7.34 32 9 32H27C28.66 32 30 30.66 30 29V15L18 5.8L6 15Z" 
            fill="#FFFFFF" 
            stroke="#CBD5E1" 
            strokeWidth="1" 
          />

          {/* Royal Blue Pitched Roof */}
          <path 
            d="M18 4.2C18.5 4.2 19 4.5 19.4 4.8L32.2 14.8C32.8 15.3 32.6 16.4 31.8 16.4H28.8L18 8L7.2 16.4H4.2C3.4 16.4 3.2 15.3 3.8 14.8L16.6 4.8C17 4.5 17.5 4.2 18 4.2Z" 
            fill="#1E88E5" 
          />
        </g>

        {/* 1. Top-Left: Food & Dining (Warm Coral-Orange) */}
        <path 
          d="M7.8 17.5L16.5 10.8C17 10.4 17.5 10.8 17.5 11.4V21.5C17.5 22 17.1 22.4 16.6 22.4H8.8C8.3 22.4 7.8 22 7.8 21.5V17.5Z" 
          fill="#FF5722" 
        />
        {/* Cutlery (White Fork & Spoon) */}
        <g>
          {/* Fork */}
          <path 
            d="M10.2 13.5v2.2c0 .4.3.7.7.7v3.2h.7v-3.2c.4 0 .7-.3.7-.7v-2.2h-.4v1.6h-.3v-1.6h-.3v1.6h-.3v-1.6h-.8z" 
            fill="#FFFFFF" 
          />
          {/* Spoon */}
          <path 
            d="M14.5 13.5c-.7 0-1.2.6-1.2 1.3 0 .5.3 1 .8 1.1v3.7h.8v-3.7c.5-.1.8-.6.8-1.1 0-.7-.5-1.3-1.2-1.3z" 
            fill="#FFFFFF" 
          />
        </g>

        {/* 2. Top-Right: Maintenance & Repair (Golden Amber) */}
        <path 
          d="M28.2 17.5L19.5 10.8C19 10.4 18.5 10.8 18.5 11.4V21.5C18.5 22 18.9 22.4 19.4 22.4H27.2C27.7 22.4 28.2 22 28.2 21.5V17.5Z" 
          fill="#FFB300" 
        />
        {/* Wrench (White) */}
        <path 
          d="M25.4 14.2l-2.6 2.6c-.3.3-.8.3-1.1 0l-.4-.4c-.3-.3-.3-.8 0-1.1l2.6-2.6c-.2-.4-.1-.9.2-1.2.4-.4 1-.5 1.4-.3l-.7.7.6.6.7-.7c.2.4.1 1-.3 1.4z" 
          fill="#FFFFFF" 
        />

        {/* 3. Bottom-Left: Laundry & Washing (Vibrant Blue) */}
        <rect x="7.8" y="23.2" width="9.7" height="7.3" rx="2" fill="#1E88E5" />
        {/* Front-Load Washing Machine (White) */}
        <g>
          <rect x="9.6" y="24.2" width="6.1" height="5.4" rx="1" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
          <line x1="10.2" y1="25.5" x2="15.1" y2="25.5" stroke="#FFFFFF" strokeWidth="0.5" />
          <circle cx="14" cy="24.8" r="0.3" fill="#FFFFFF" />
          <circle cx="14.8" cy="24.8" r="0.3" fill="#FFFFFF" />
          <circle cx="12.65" cy="27.35" r="1.3" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
          <circle cx="12.65" cy="27.35" r="0.65" fill="#90CAF9" />
        </g>

        {/* 4. Bottom-Right: Housekeeping & Cleaning (Vibrant Emerald Green) */}
        <rect x="18.5" y="23.2" width="9.7" height="7.3" rx="2" fill="#00C853" />
        {/* Broom & Sparkles (White) */}
        <g>
          <path d="M22.5 27.2l1.6-1.6 1.8 1.8-1 1.2-2.4-1.4z" fill="#FFFFFF" />
          <line x1="21" y1="24.2" x2="23.2" y2="26.6" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />
          {/* Sparkles */}
          <path d="M26.2 24.5c0 .7-.6 1.2-1.2 1.2.6 0 1.2.5 1.2 1.2 0-.7.6-1.2 1.2-1.2-.6 0-1.2-.5-1.2-1.2z" fill="#FFFFFF" />
          <path d="M27.8 27.2c0 .4-.3.7-.7.7.4 0 .7.3.7.7 0-.4.3-.7.7-.7-.4 0-.7-.3-.7-.7z" fill="#FFFFFF" />
        </g>

        {/* Clear Crisp White House Contour Stroke */}
        <path 
          d="M6 15V29C6 30.66 7.34 32 9 32H27C28.66 32 30 30.66 30 29V15L18 5.8L6 15Z" 
          fill="none" 
          stroke="#FFFFFF" 
          strokeWidth="1.5" 
          strokeLinejoin="round" 
        />
      </svg>
    </div>
  );
};

export const BottomNav: React.FC = () => {
  const { activeTab, navigateTo, favorites } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        <button
          onClick={() => navigateTo('explore')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
            activeTab === 'explore' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">Rentals</span>
        </button>

        <button
          onClick={() => navigateTo('owner')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
            activeTab === 'owner' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">Owner</span>
        </button>

        <button
          onClick={() => navigateTo('services')}
          className={`flex flex-col items-center py-0.5 px-2 rounded-xl transition-all duration-200 ${
            activeTab === 'services' || activeTab === 'tiffin' ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className={`relative transition-transform duration-200 ${
            activeTab === 'services' || activeTab === 'tiffin' ? '-translate-y-1' : ''
          }`}>
            <ServicesHouseIcon 
              className="w-[33px] h-[33px] sm:w-[35px] sm:h-[35px]" 
              isActive={activeTab === 'services' || activeTab === 'tiffin'} 
            />
          </div>
          <span className="text-[11px] mt-0.5 font-bold">Services</span>
        </button>

        <button
          onClick={() => navigateTo('saved')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors relative ${
            activeTab === 'saved' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">Saved</span>
          {favorites.length > 0 && (
            <span className="absolute top-0.5 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {favorites.length}
            </span>
          )}
        </button>

        <button
          onClick={() => navigateTo('map')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
            activeTab === 'map' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[11px] mt-0.5">Map</span>
        </button>
      </div>
    </nav>
  );
};
