import React from 'react';
import { Building2, MapPin, Bookmark, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ServicesHouseIconProps {
  className?: string;
  isActive?: boolean;
}

export const ServicesHouseIcon: React.FC<ServicesHouseIconProps> = ({ 
  className = "w-8 h-8",
  isActive = false 
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center transition-all duration-200 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
      <img 
        src="/assets/aistudio/IMG-20261025-WA0007_25af6bd0.jpg" 
        alt="Gondia Services" 
        className={`${className} object-contain rounded-xl shadow-xs drop-shadow-xs transition-all`}
        onError={(e) => {
          e.currentTarget.src = '/ic_services_unified.jpg';
        }}
        loading="eager"
      />
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
              className="w-8 h-8 sm:w-9 sm:h-9" 
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
