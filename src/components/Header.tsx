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
  MoreVertical,
  X,
  Database,
  MessageCircle,
  Plus
} from 'lucide-react';
import { useApp, useBackHandler } from '../context/AppContext';
import { formatDisplayPhone, openWhatsApp } from '../utils/contact';
import { ServicesHouseIcon } from './BottomNav';

export const Header: React.FC = () => {
  const { 
    activeTab, 
    navigateTo, 
    currentOwner, 
    favorites,
    properties,
    isFirebaseConnected,
    isFirestoreLoading,
    setIsFirebaseModalOpen,
    isOwnerAuthenticated,
    authUser,
    logoutOwner,
    openPostListing,
    isAdminAuthenticated,
    ownerSubTab,
    setOwnerSubTab
  } = useApp();

  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close open menus first when pressing Android back button
  useBackHandler(mobileMenuOpen, () => setMobileMenuOpen(false), 'mobile-menu');
  useBackHandler(showOwnerMenu, () => setShowOwnerMenu(false), 'owner-menu');

  const pendingCount = properties.filter(p => (p.status || '').toLowerCase() === 'pending').length;

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
              onClick={() => navigateTo('owner')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'owner' && ownerSubTab !== 'moderation'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Owner Dashboard</span>
            </button>

            <button
              onClick={() => navigateTo('services')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'services' || activeTab === 'tiffin'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ServicesHouseIcon className="w-6 h-6" isActive={activeTab === 'services' || activeTab === 'tiffin'} />
              <span>Home Services</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.2 rounded-full uppercase">
                Mess & More
              </span>
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

            {isAdminAuthenticated && (
              <button
                onClick={() => {
                  navigateTo('owner');
                  setOwnerSubTab('moderation');
                }}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'owner' && ownerSubTab === 'moderation'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
                title="GondiaStay Admin Moderation Console"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>

          {/* Right Action: Post Property, Firebase Sync & Owner Profile Switcher dropdown */}
          <div className="flex items-center gap-2">
            

            {/* Cloud Firestore Status Button - Restricted strictly to verified Admin */}
            {isAdminAuthenticated && (
              <button
                onClick={() => setIsFirebaseModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  isFirebaseConnected 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 animate-pulse'
                }`}
                title="Cloud Database & Multi-Device Sync Settings (Admin Only)"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isFirestoreLoading 
                    ? 'Syncing...' 
                    : isFirebaseConnected 
                      ? 'Cloud Sync' 
                      : 'Connect DB'}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  isFirebaseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowOwnerMenu(!showOwnerMenu)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 transition-colors"
                title="Landlord Profile"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                  {currentOwner.name[0] || 'O'}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="leading-tight">{currentOwner.name.startsWith('Mr.') ? currentOwner.name : `Mr. ${currentOwner.name}`}</div>
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
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 space-y-3">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {currentOwner.name[0] || 'O'}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          {currentOwner.name.startsWith('Mr.') ? currentOwner.name : `Mr. ${currentOwner.name}`}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Verified Property Owner
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Contact Phone:</span>
                        <span className="font-bold text-slate-800">{formatDisplayPhone(currentOwner.phone)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">WhatsApp:</span>
                        <span className="font-bold text-emerald-700">{formatDisplayPhone(currentOwner.whatsappNumber || currentOwner.phone)}</span>
                      </div>
                    </div>

                    {/* Quick WhatsApp button */}
                    <button
                      type="button"
                      onClick={() => {
                        openWhatsApp(currentOwner.whatsappNumber || currentOwner.phone, `Hello Mr. ${currentOwner.name}, regarding GondiaStay owner account.`);
                        setShowOwnerMenu(false);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp Chat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigateTo('owner');
                        setShowOwnerMenu(false);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Owner Hub & My Properties</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 3-dot menu button - accessible on any phone or computer */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
              aria-label="Toggle Menu"
              title="Menu & Admin Panel"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
              <span className="hidden sm:inline text-xs font-bold text-slate-700">Menu</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Dot Drawer Menu - Accessible on phone or computer */}
      {mobileMenuOpen && (
        <div className="bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2 shadow-lg">
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
            onClick={() => { navigateTo('owner'); setMobileMenuOpen(false); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4 text-slate-600" />
              Owner Dashboard
            </div>
            {pendingCount > 0 && !isAdminAuthenticated && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => { navigateTo('services'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold ${
              activeTab === 'services' || activeTab === 'tiffin' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <ServicesHouseIcon className="w-5 h-5" isActive={activeTab === 'services' || activeTab === 'tiffin'} />
              <span>Home Services</span>
            </div>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Mess, Maid, Repair
            </span>
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
            onClick={() => { navigateTo('map'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
              activeTab === 'map' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4 text-blue-600" />
            Interactive Gondia Map
          </button>

          {/* Admin Panel Entry - Moved into menu, protected & accessible on any device */}
          <button
            onClick={() => { 
              navigateTo('owner'); 
              setOwnerSubTab('moderation'); 
              setMobileMenuOpen(false); 
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'owner' && ownerSubTab === 'moderation' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'owner' && ownerSubTab === 'moderation' ? 'text-amber-400' : 'text-amber-600'}`} />
              <span>Admin Panel</span>
              {isAdminAuthenticated && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  Signed In
                </span>
              )}
            </div>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                {pendingCount} Pending
              </span>
            )}
          </button>
        </div>
      )}
    </header>
  );
};
