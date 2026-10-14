import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Utensils, 
  Bookmark, 
  UserCheck, 
  ShieldCheck, 
  ChevronDown,
  Sparkles,
  PhoneCall,
  Menu,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OWNER_PROFILES } from '../types';
import { formatDisplayPhone } from '../utils/contact';

export const Header: React.FC = () => {
  const { 
    activeTab, 
    navigateTo, 
    currentOwner, 
    switchOwner, 
    favorites,
    properties 
  } = useApp();

  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingCount = properties.filter(p => p.status === 'PENDING').length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => navigateTo('explore')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform overflow-hidden">
              <img 
                src="/ic_gondia_stay_logo.jpg" 
                alt="Gondia Stay" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback icon if image not available
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                  Gondia<span className="text-blue-600">Stay</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  0% Brokerage
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                Direct Landlord & Tenant Connect in Gondia
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => navigateTo('explore')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'explore'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Explore Stays</span>
            </button>

            <button
              onClick={() => navigateTo('map')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'map'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Gondia Map</span>
            </button>

            <button
              onClick={() => navigateTo('tiffin')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'tiffin'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Tiffin & Mess</span>
            </button>

            <button
              onClick={() => navigateTo('saved')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 relative ${
                activeTab === 'saved'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved</span>
              {favorites.length > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                  {favorites.length}
                </span>
              )}
            </button>

            <button
              onClick={() => navigateTo('owner')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'owner'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Owner Dashboard</span>
            </button>
          </nav>

          {/* Right Action: Owner Profile Switcher dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowOwnerMenu(!showOwnerMenu)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 transition-colors"
                title="Switch owner mode"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                  {currentOwner.name[0]}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="leading-tight">{currentOwner.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-500">{formatDisplayPhone(currentOwner.phone)}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showOwnerMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowOwnerMenu(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-800">Owner Profiles (Demo Switcher)</p>
                      <p className="text-[11px] text-slate-500">Test multi-owner security isolation</p>
                    </div>
                    {OWNER_PROFILES.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          switchOwner(profile.id);
                          setShowOwnerMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                          currentOwner.id === profile.id ? 'bg-blue-50/80 font-bold text-blue-700' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{profile.name}</div>
                          <div className="text-[10px] text-slate-400">{formatDisplayPhone(profile.phone)}</div>
                        </div>
                        {currentOwner.id === profile.id && (
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">Active</span>
                        )}
                      </button>
                    ))}
                    
                    <div className="mt-2 pt-2 border-t border-slate-100 px-3">
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        100% Free Listing Policy Active
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2">
          <button
            onClick={() => { navigateTo('explore'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
              activeTab === 'explore' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            Explore Properties in Gondia
          </button>
          <button
            onClick={() => { navigateTo('map'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
              activeTab === 'map' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4 text-blue-600" />
            Interactive Gondia Map
          </button>
          <button
            onClick={() => { navigateTo('tiffin'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
              activeTab === 'tiffin' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Utensils className="w-4 h-4 text-blue-600" />
            Tiffin & Mess Services
          </button>
          <button
            onClick={() => { navigateTo('saved'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
              activeTab === 'saved' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bookmark className="w-4 h-4 text-blue-600" />
              Saved Properties
            </div>
            {favorites.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {favorites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { navigateTo('owner'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
              activeTab === 'owner' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4" />
              Owner Dashboard
            </div>
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            )}
          </button>
        </div>
      )}
    </header>
  );
};
