import React from 'react';
import { Building2, MapPin, Bookmark, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ServicesHouseIconProps {
  className?: string;
  isActive?: boolean;
}

export const ServicesGridIcon: React.FC<ServicesHouseIconProps> = ({ 
  className = "w-[26px] h-[26px]",
  isActive = false 
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center transition-transform duration-200 ${isActive ? 'scale-105' : 'hover:scale-105'}`}>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* 1. Top-Left: Blue (#2563EB) with white utensils icon */}
        <rect x="1.2" y="1.2" width="10.2" height="10.2" rx="2.5" fill="#2563EB" />
        {/* Fork */}
        <path d="M4.2 3.4v1.8c0 .4.3.7.7.7v3.3h.8v-3.3c.4 0 .7-.3.7-.7v-1.8h-.4v1.4h-.3v-1.4h-.3v1.4h-.3v-1.4h-.9z" fill="#FFFFFF" />
        {/* Spoon */}
        <path d="M7.9 3.4c-.8 0-1.3.6-1.3 1.4 0 .6.3 1.1.8 1.3v3.1h.8v-3.1c.5-.2.8-.7.8-1.3 0-.8-.5-1.4-1.3-1.4z" fill="#FFFFFF" />

        {/* 2. Top-Right: Green (#16A34A) with white shirt icon */}
        <rect x="12.6" y="1.2" width="10.2" height="10.2" rx="2.5" fill="#16A34A" />
        {/* Shirt */}
        <path 
          d="M16.5 3.5l-1.8 1.1-.9 1.8 1.4.7.7-1.1v3.4h3.6v-3.4l.7 1.1 1.4-.7-.9-1.8-1.8-1.1c-.4.5-1.9.5-2.4 0z" 
          fill="#FFFFFF" 
        />

        {/* 3. Bottom-Left: Orange (#F97316) with white lightning bolt */}
        <rect x="1.2" y="12.6" width="10.2" height="10.2" rx="2.5" fill="#F97316" />
        {/* Lightning Bolt */}
        <path 
          d="M7.1 14.3l-2.7 3.6h1.8l-1.0 3.3 3.0-4.0h-1.8l.7-2.9z" 
          fill="#FFFFFF" 
        />

        {/* 4. Bottom-Right: Teal (#16A6A1) with white water droplets */}
        <rect x="12.6" y="12.6" width="10.2" height="10.2" rx="2.5" fill="#16A6A1" />
        {/* Water Droplets */}
        <path d="M16.7 14.6c-.3.4-1.8 2.3-1.8 3.8 0 1.0.8 1.8 1.8 1.8s1.8-.8 1.8-1.8c0-1.5-1.5-3.4-1.8-3.8z" fill="#FFFFFF" />
        <path d="M19.4 15.6c-.2.3-1.2 1.6-1.2 2.6 0 .7.5 1.2 1.2 1.2s1.2-.5 1.2-1.2c0-1.0-1.0-2.3-1.2-2.6z" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const ServicesHouseIcon = ServicesGridIcon;

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
          <div className="flex items-center justify-center w-5 h-5">
            <ServicesGridIcon 
              className="w-[26px] h-[26px] shrink-0" 
              isActive={activeTab === 'services' || activeTab === 'tiffin'} 
            />
          </div>
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
