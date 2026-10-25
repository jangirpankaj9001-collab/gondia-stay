import React from 'react';
import { Building2, MapPin, Bookmark, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ServicesHouseIconProps {
  className?: string;
  isActive?: boolean;
}

export const ServicesHouseIcon: React.FC<ServicesHouseIconProps> = ({ 
  className = "w-[26px] h-[26px]",
  isActive = false 
}) => {
  const housePath = "M 16 2.6 C 16.4 2.6 16.8 2.8 17.1 3.1 L 27.5 12.2 C 28 12.6 28 13.3 28 14 V 26.5 C 28 27.9 26.9 29 25.5 29 H 6.5 C 5.1 29 4 27.9 4 26.5 V 14 C 4 13.3 4 12.6 4.5 12.2 L 14.9 3.1 C 15.2 2.8 15.6 2.6 16 2.6 Z";

  return (
    <svg 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform ${isActive ? 'scale-105' : 'hover:scale-105'}`}
      aria-hidden="true"
    >
      <defs>
        {/* Crisp subtle shadow for contrast on white bottom nav */}
        <filter id="services-house-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="#0F172A" floodOpacity="0.22" />
        </filter>

        {/* Clip path defining the clean house silhouette */}
        <clipPath id="services-house-clip">
          <path d={housePath} />
        </clipPath>
      </defs>

      {/* Outer subtle keyline & drop shadow container */}
      <path 
        d={housePath} 
        fill="#FFFFFF" 
        stroke="#0F172A" 
        strokeOpacity="0.12" 
        strokeWidth="2.8" 
        strokeLinejoin="round" 
        filter="url(#services-house-shadow)"
      />

      {/* 4 Clean, Vibrant Quadrants clipped to the House Shape */}
      <g clipPath="url(#services-house-clip)">
        {/* 1. Food (Top-Left: Vibrant Orange) */}
        <rect x="0" y="0" width="16" height="16.5" fill="#F97316" />

        {/* 2. Maintenance (Top-Right: Vibrant Blue) */}
        <rect x="16" y="0" width="16" height="16.5" fill="#2563EB" />

        {/* 3. Laundry (Bottom-Left: Vibrant Ocean/Sky Blue) */}
        <rect x="0" y="16.5" width="16" height="16" fill="#0284C7" />

        {/* 4. Housekeeping (Bottom-Right: Vibrant Emerald Green) */}
        <rect x="16" y="16.5" width="16" height="16" fill="#10B981" />

        {/* Quadrant Divider Grid (Clean White) */}
        <line x1="3" y1="16.5" x2="29" y2="16.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="16" y1="2" x2="16" y2="30" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />

        {/* --- SYMBOLS (Clean, Crisp White Silhouettes) --- */}

        {/* 1. Food: Clean Fork & Spoon (Top-Left) */}
        <g>
          {/* Fork */}
          <path 
            d="M8.2 8.5v2c0 .4.3.7.7.7v3.2h.7v-3.2c.4 0 .7-.3.7-.7v-2h-.4v1.5h-.3V8.5h-.3v1.5h-.3V8.5H8.2z" 
            fill="#FFFFFF" 
          />
          {/* Spoon */}
          <path 
            d="M12.3 8.5c-.7 0-1.2.5-1.2 1.2 0 .5.3 1 .8 1.1v3.6h.7v-3.6c.5-.1.8-.6.8-1.1 0-.7-.5-1.2-1.1-1.2z" 
            fill="#FFFFFF" 
          />
        </g>

        {/* 2. Maintenance: Clean Wrench (Top-Right) */}
        <path 
          d="M23.2 12.4l-2.4-2.4c.2-.4.1-.9-.2-1.2-.4-.4-1-.5-1.4-.3l.7.7-.6.6-.7-.7c-.2.4-.1 1 .3 1.4.3.3.8.4 1.2.2l2.4 2.4c.2.2.5.2.7 0l.3-.3c.2-.2.2-.5 0-.7z" 
          fill="#FFFFFF" 
        />

        {/* 3. Laundry: Clean T-Shirt (Bottom-Left) */}
        <path 
          d="M8.8 19.8h1.1c.2.4.6.6 1.1.6s.9-.2 1.1-.6h1.1l.9 1.5-.8.4-.2 3.8H8.8l-.2-3.8-.8-.4.9-1.5z" 
          fill="#FFFFFF" 
        />

        {/* 4. Housekeeping: Clean Sparkles (Bottom-Right) */}
        <g>
          {/* Main 4-point sparkle */}
          <path 
            d="M21 19.8c0 1.4-1.1 2.5-2.5 2.5 1.4 0 2.5 1.1 2.5 2.5 0-1.4 1.1-2.5 2.5-2.5-1.4 0-2.5-1.1-2.5-2.5z" 
            fill="#FFFFFF" 
          />
          {/* Accent sparkle */}
          <path 
            d="M23.6 20.2c0 .6-.5 1.1-1.1 1.1.6 0 1.1.5 1.1 1.1 0-.6.5-1.1 1.1-1.1-.6 0-1.1-.5-1.1-1.1z" 
            fill="#FFFFFF" 
          />
        </g>
      </g>

      {/* Clear White House Outline (Crisp, High-Contrast Perimeter) */}
      <path 
        d={housePath} 
        fill="none" 
        stroke="#FFFFFF" 
        strokeWidth="1.8" 
        strokeLinejoin="round" 
      />
    </svg>
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
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg transition-colors ${
            activeTab === 'services' || activeTab === 'tiffin' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ServicesHouseIcon 
            className="w-[26px] h-[26px]" 
            isActive={activeTab === 'services' || activeTab === 'tiffin'} 
          />
          <span className="text-[11px] mt-0.5">Services</span>
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
