import React, { useState } from 'react';
import { X, Lock, Key, UserCheck, AlertCircle, Loader2, Zap, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface OwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { loginOwnerWithEmailPassword, registerOwnerWithEmailPassword, isOwnerAuthenticated, authUser, logoutOwner } = useApp();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!email.trim() || !password.trim()) {
          setError('Please provide email and password.');
          setIsLoading(false);
          return;
        }
        const res = await registerOwnerWithEmailPassword(
          email.trim(),
          password,
          name.trim() || 'Property Owner',
          phone.trim() || '+91 98230 12345'
        );
        if (res.success) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError(res.error || 'Failed to create landlord account.');
        }
      } else {
        const res = await loginOwnerWithEmailPassword(email.trim(), password);
        if (res.success) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setError(res.error || 'Failed to sign in. Please verify credentials.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSignIn = async () => {
    setError(null);
    setIsLoading(true);
    const demoEmail = 'rajesh.sharma@gondiastay.com';
    const demoPass = 'rajesh12345';

    try {
      // First try signing in
      const loginRes = await loginOwnerWithEmailPassword(demoEmail, demoPass);
      if (loginRes.success) {
        if (onSuccess) onSuccess();
        onClose();
        return;
      }
      
      // If user doesn't exist yet, create the verified landlord account
      const regRes = await registerOwnerWithEmailPassword(
        demoEmail,
        demoPass,
        'Rajesh Sharma',
        '+91 98230 12345'
      );
      if (regRes.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(regRes.error || 'Quick sign-in encountered an issue.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {isOwnerAuthenticated ? 'Landlord Session Active' : isRegister ? 'Register Landlord Account' : 'Landlord Secure Sign In'}
              </h2>
              <p className="text-[11px] text-slate-300">
                Cryptographic Firebase Authentication
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isOwnerAuthenticated && authUser ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Signed In Successfully</h3>
                <p className="text-xs text-slate-600 font-mono mt-0.5">{authUser.email}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">UID: {authUser.uid}</p>
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                Your listings and photo updates in Cloud Firestore are cryptographically authenticated under this UID.
              </p>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    logoutOwner();
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                >
                  Continue to Listings
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-3.5 text-xs text-blue-900 leading-relaxed">
                <strong>Why Sign In?</strong> To protect landlords against unauthorized edits, GondiaStay requires Firebase Authentication so only the verified listing owner can edit details and upload property photos.
              </div>

              {/* 1-Click Demo / Test Sign-In */}
              <button
                type="button"
                onClick={handleQuickSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current text-amber-300" />
                <span>1-Click Sign In as Rajesh Sharma (Verified Owner)</span>
              </button>

              <div className="flex items-center gap-2 my-2">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">or with credentials</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {isRegister && (
                  <>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98230 12345"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Landlord Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="landlord@gondiastay.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Key className="w-4 h-4 text-blue-400" />
                  )}
                  <span>{isRegister ? 'Register & Authenticate' : 'Sign In as Landlord'}</span>
                </button>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  {isRegister ? 'Already have an account? Sign In' : 'New landlord? Create Account'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
