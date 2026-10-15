import React, { useState } from 'react';
import { 
  Database, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Key, 
  ShieldCheck, 
  Lock
} from 'lucide-react';
import { 
  isFirebaseConfigured, 
  getActiveProjectId, 
  saveFirebaseWebConfig, 
  resetFirebaseWebConfig, 
  getActiveFirebaseConfig,
  FirebaseConfigParams 
} from '../firebase/config';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeedRequested?: () => Promise<void>;
  propertiesCount: number;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  onSeedRequested,
  propertiesCount
}) => {
  const isConnected = isFirebaseConfigured();
  const currentProjectId = getActiveProjectId();
  const existingConfig = getActiveFirebaseConfig();

  const [apiKey, setApiKey] = useState(existingConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(existingConfig?.projectId || '');
  const [authDomain, setAuthDomain] = useState(existingConfig?.authDomain || '');
  const [storageBucket, setStorageBucket] = useState(existingConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(existingConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(existingConfig?.appId || '');

  const [jsonInput, setJsonInput] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'manual' | 'json'>('status');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParseJson = () => {
    try {
      setErrorMsg(null);
      // Clean JSON string or JS object syntax
      const cleaned = jsonInput
        .replace(/const\s+firebaseConfig\s*=\s*/, '')
        .replace(/;/g, '')
        .trim();
      
      const parsed = JSON.parse(cleaned);
      if (parsed.apiKey && parsed.projectId) {
        setApiKey(parsed.apiKey);
        setProjectId(parsed.projectId);
        setAuthDomain(parsed.authDomain || `${parsed.projectId}.firebaseapp.com`);
        setStorageBucket(parsed.storageBucket || `${parsed.projectId}.appspot.com`);
        setMessagingSenderId(parsed.messagingSenderId || '');
        setAppId(parsed.appId || '');
        setActiveSubTab('manual');
      } else {
        setErrorMsg('JSON is missing apiKey or projectId');
      }
    } catch {
      setErrorMsg('Invalid JSON format. Please paste valid JSON from Firebase Console.');
    }
  };

  const handleSave = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setErrorMsg('API Key and Project ID are required.');
      return;
    }

    setIsSaving(true);
    const newConfig: FirebaseConfigParams = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    saveFirebaseWebConfig(newConfig);
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect this Firebase project?')) {
      resetFirebaseWebConfig();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Database className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Cloud Firestore Connection</h3>
              <p className="text-xs text-blue-100">Live Cross-Device Synchronization for GondiaStay</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3 gap-2">
          <button
            onClick={() => setActiveSubTab('status')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeSubTab === 'status'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Connection Status
          </button>
          <button
            onClick={() => setActiveSubTab('manual')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeSubTab === 'manual'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Config Fields
          </button>
          <button
            onClick={() => setActiveSubTab('json')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeSubTab === 'json'
                ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Paste Firebase JSON
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeSubTab === 'status' && (
            <div className="space-y-4">
              {isConnected ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Firestore Cloud Connected!
                  </div>
                  <div className="text-xs text-emerald-700 space-y-1">
                    <p><span className="font-semibold">Project ID:</span> {currentProjectId}</p>
                    <p><span className="font-semibold">Synced Properties in Firestore:</span> {propertiesCount}</p>
                    <p><span className="font-semibold">Sync Mode:</span> Real-time Firestore onSnapshot</p>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    {onSeedRequested && propertiesCount === 0 && (
                      <button
                        onClick={onSeedRequested}
                        className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Seed Initial Gondia Stays
                      </button>
                    )}
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Disconnect Project
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Firebase Connection Required
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Connect your existing Firebase project to enable cross-device persistence. All users across mobile phones and desktop computers will see the exact same approved room listings.
                  </p>
                </div>
              )}

              {/* Vercel Environment Variables Guide */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Vercel Deployment Environment Variables:
                </div>
                <p className="text-slate-600">
                  In your Vercel Project Dashboard (<span className="font-mono">Settings &gt; Environment Variables</span>), add:
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-1 overflow-x-auto">
                  <p>VITE_FIREBASE_API_KEY=AIzaSy...</p>
                  <p>VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com</p>
                  <p>VITE_FIREBASE_PROJECT_ID=your-project-id</p>
                  <p>VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com</p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'json' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Paste Firebase Web SDK configuration:
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "gondia-stay.firebaseapp.com",\n  "projectId": "gondia-stay-12345",\n  "storageBucket": "gondia-stay.appspot.com"\n}`}
                rows={6}
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <button
                onClick={handleParseJson}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                Extract & Populate Configuration
              </button>
            </div>
          )}

          {activeSubTab === 'manual' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">API Key *</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Project ID *</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="e.g. gondia-stay-prod"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Auth Domain</label>
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="project-id.firebaseapp.com"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Storage Bucket</label>
                <input
                  type="text"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  placeholder="project-id.appspot.com"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">App ID</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:1234567890:web:abcdef..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSaving ? 'Connecting...' : 'Save & Connect to Firebase'}
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Open Firebase Console <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
