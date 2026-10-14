import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

export interface FirebaseConfigParams {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

const STORAGE_KEY = 'gondia_stay_firebase_config';

/**
 * Retrieves Firebase configuration from environment variables or stored settings
 */
export const getActiveFirebaseConfig = (): FirebaseConfigParams | null => {
  // 1. Check environment variables (Vite / Vercel)
  const envConfig: FirebaseConfigParams = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  if (envConfig.apiKey && envConfig.projectId && envConfig.apiKey !== 'your_api_key_here') {
    return envConfig;
  }

  // 2. Check localStorage for user-configured credentials
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading saved Firebase config:', err);
  }

  return null;
};

export const saveFirebaseWebConfig = (config: FirebaseConfigParams): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.location.reload();
  } catch (err) {
    console.error('Failed to save Firebase config:', err);
  }
};

export const resetFirebaseWebConfig = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  } catch (err) {
    console.error('Failed to clear Firebase config:', err);
  }
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

const config = getActiveFirebaseConfig();

if (config && config.apiKey && config.projectId) {
  try {
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    try {
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true
      });
    } catch {
      db = getFirestore(app);
    }
    auth = getAuth(app);
    console.log('[GondiaStay] Connected to Firebase Project:', config.projectId);
  } catch (error) {
    console.error('[GondiaStay] Firebase initialization error:', error);
  }
} else {
  console.info('[GondiaStay] Firebase configuration pending. App will prompt to connect.');
}

export { app, db, auth };
export const isFirebaseConfigured = (): boolean => db !== null;
export const getActiveProjectId = (): string => config?.projectId || '';
export const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || 'admin123';
