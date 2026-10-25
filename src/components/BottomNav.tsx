import React from 'react';
import { Building2, MapPin, Wrench, Bookmark, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

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
          <Wrench className="w-5 h-5" />
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
