import React from 'react';
import { Building2, MapPin, Bookmark, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ServicesHouseIconProps {
  className?: string;
  isActive?: boolean;
}

export const ServicesHouseIcon: React.FC<ServicesHouseIconProps> = ({ 
  className = "w-6 h-6",
  isActive = false 
}) => {
  return (
    <svg 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform ${isActive ? 'scale-105' : 'hover:scale-105'}`}
      aria-hidden="true"
    >
      <defs>
        {/* Roof vibrant multi-color gradient */}
        <linearGradient id="services-roof-grad" x1="2" y1="2" x2="30" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>

      {/* Chimney */}
      <path 
        d="M22 6.5V10.5L25 12.8V6.5C25 6.22 24.78 6 24.5 6H22.5C22.22 6 22 6.22 22 6.5Z" 
        fill="#F97316" 
      />

      {/* Main House Wall / Frame Container */}
      <path 
        d="M6 13.5V26.5C6 28.16 7.34 29.5 9 29.5H23C24.66 29.5 26 28.16 26 26.5V13.5L16 4.8L6 13.5Z" 
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Roof Gable - Unified House Pitch */}
      <path 
        d="M16 2.5L2.6 13.2C2.1 13.6 2.4 14.5 3.1 14.5H5.8L16 5.8L26.2 14.5H28.9C29.6 14.5 29.9 13.6 29.4 13.2L16 2.5Z" 
        fill="url(#services-roof-grad)" 
      />

      {/* Attic Window / Warm Center Star */}
      <circle cx="16" cy="10" r="2.2" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="0.8" />
      <path 
        d="M16 11.2L15.2 10.4C14.7 9.9 14.7 9.3 15.1 8.9C15.4 8.6 15.9 8.7 16 9C16.1 8.7 16.6 8.6 16.9 8.9C17.3 9.3 17.3 9.9 16.8 10.4L16 11.2Z" 
        fill="#DC2626" 
      />

      {/* Quadrant Divider Grid */}
      <line x1="16" y1="14" x2="16" y2="28" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="1.5 1.5" />
      <line x1="7" y1="21" x2="25" y2="21" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="1.5 1.5" />

      {/* --- 1. FOOD & DINING / MESS (Top Left: Warm Amber/Orange) --- */}
      <rect x="7" y="14" width="8" height="6" rx="2" fill="#FFF7ED" />
      {/* Fork & Spoon */}
      <g>
        <path 
          d="M9 15.2V16.6C9 17.2 9.4 17.6 10 17.6V19.2H10.6V17.6C11.2 17.6 11.6 17.2 11.6 16.6V15.2H11V16.5H10.5V15.2H10.1V16.5H9.6V15.2H9Z" 
          fill="#EA580C" 
        />
        <path 
          d="M13.2 15.2C12.4 15.2 11.8 15.8 11.8 16.6C11.8 17.3 12.3 17.8 12.8 17.9V19.2H13.6V17.9C14.1 17.8 14.6 17.3 14.6 16.6C14.6 15.8 14 15.2 13.2 15.2Z" 
          fill="#F59E0B" 
        />
      </g>

      {/* --- 2. MAINTENANCE & REPAIRS (Top Right: Royal Blue) --- */}
      <rect x="17" y="14" width="8" height="6" rx="2" fill="#EFF6FF" />
      {/* Wrench / Spanner */}
      <path 
        d="M23.2 15.2C22.6 14.8 21.8 14.9 21.3 15.4C21 15.7 20.9 16.1 20.9 16.5L18.8 18.6C18.6 18.8 18.6 19.1 18.8 19.3L19.4 19.9C19.6 20.1 19.9 20.1 20.1 19.9L22.2 17.8C22.6 17.8 23 17.7 23.3 17.4C23.8 16.9 23.9 16.1 23.5 15.5L22.4 16.6L21.8 16L22.9 14.9C23 15 23.1 15.1 23.2 15.2Z" 
        fill="#2563EB" 
      />

      {/* --- 3. LAUNDRY & WASHING (Bottom Left: Cyan/Sky Blue) --- */}
      <rect x="7" y="22" width="8" height="6.2" rx="2" fill="#F0F9FF" />
      {/* Clean T-Shirt */}
      <path 
        d="M8.8 23L10.2 23C10.5 23.6 11.2 24 12 24C12.8 24 13.5 23.6 13.8 23L15.2 23L15.7 24.6L14.6 25L14.4 27.2H9.6L9.4 25L8.3 24.6L8.8 23Z" 
        fill="#0284C7" 
      />
      <circle cx="13.8" cy="23.2" r="0.8" fill="#38BDF8" />

      {/* --- 4. HOUSEKEEPING & CLEANING (Bottom Right: Emerald Green) --- */}
      <rect x="17" y="22" width="8" height="6.2" rx="2" fill="#ECFDF5" />
      {/* Sparkles / Clean Shine */}
      <g>
        <path 
          d="M21 23.2C21 24.2 20.2 25 19.2 25C20.2 25 21 25.8 21 26.8C21 25.8 21.8 25 22.8 25C21.8 25 21 24.2 21 23.2Z" 
          fill="#10B981" 
        />
        <path 
          d="M23.5 23C23.5 23.5 23.1 23.9 22.6 23.9C23.1 23.9 23.5 24.3 23.5 24.8C23.5 24.3 23.9 23.9 24.4 23.9C23.9 23.9 23.5 23.5 23.5 23Z" 
          fill="#059669" 
        />
      </g>
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
            className="w-6 h-6" 
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
