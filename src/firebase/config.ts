import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

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
 * Normalizes and derives the correct Firebase Storage bucket name.
 * Firebase projects typically use either <projectId>.firebasestorage.app (standard since late 2023)
 * or <projectId>.appspot.com (legacy default).
 * Strips leading 'gs://' or 'https://' prefixes if present.
 */
export const normalizeStorageBucket = (bucketRaw?: string, projectId?: string): string => {
  if (bucketRaw && typeof bucketRaw === 'string') {
    let clean = bucketRaw.trim();
    if (clean.startsWith('gs://')) {
      clean = clean.substring(5);
    }
    if (clean.startsWith('https://')) {
      const match = clean.match(/\/b\/([^/]+)/);
      if (match && match[1]) {
        clean = match[1];
      }
    }
    clean = clean.replace(/\/+$/, '');
    if (clean.length > 0) {
      return clean;
    }
  }

  if (projectId && typeof projectId === 'string') {
    const cleanProject = projectId.trim();
    if (cleanProject) {
      return `${cleanProject}.firebasestorage.app`;
    }
  }

  return '';
};

/**
 * Retrieves Firebase configuration from environment variables or stored settings.
 * Ensures storageBucket and authDomain are always populated if projectId exists.
 */
export const getActiveFirebaseConfig = (): FirebaseConfigParams | null => {
  // 1. Check environment variables (Vite / Vercel / AI Studio secrets)
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId && envApiKey !== 'your_api_key_here') {
    const envStorageBucket = normalizeStorageBucket(
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      envProjectId
    );

    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      projectId: envProjectId,
      storageBucket: envStorageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    };
  }

  // 2. Check localStorage for user-configured credentials
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        parsed.storageBucket = normalizeStorageBucket(parsed.storageBucket, parsed.projectId);
        if (!parsed.authDomain) {
          parsed.authDomain = `${parsed.projectId}.firebaseapp.com`;
        }
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
    const normalizedConfig: FirebaseConfigParams = {
      ...config,
      storageBucket: normalizeStorageBucket(config.storageBucket, config.projectId),
      authDomain: config.authDomain || (config.projectId ? `${config.projectId}.firebaseapp.com` : undefined)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedConfig));
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
let storage: FirebaseStorage | null = null;

const config = getActiveFirebaseConfig();

if (config && config.apiKey && config.projectId) {
  try {
    // Ensure bucket is normalized and attached to config options
    const bucket = normalizeStorageBucket(config.storageBucket, config.projectId);
    config.storageBucket = bucket;

    // Use existing Firebase app instance or initialize with configuration
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
      // Ensure existing app instance has storageBucket configured in its options
      if (app && app.options && !app.options.storageBucket && bucket) {
        (app.options as any).storageBucket = bucket;
      }
    }

    // Initialize Firestore using the same app instance
    try {
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true
      });
    } catch {
      db = getFirestore(app);
    }

    // Initialize Auth using the same app instance
    auth = getAuth(app);

    // Initialize Firebase Storage using the same app instance and configured bucket
    try {
      storage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);
    } catch (storageErr) {
      try {
        storage = bucket ? getStorage(app, bucket) : getStorage(app);
      } catch (err2) {
        try {
          storage = getStorage(app);
        } catch (err3) {
          console.warn('[GondiaStay] Firebase Storage initial setup warning:', err3);
        }
      }
    }

    console.log('[GondiaStay] Connected to Firebase Project:', config.projectId, 'Storage bucket:', bucket || '(default)');
  } catch (error) {
    console.error('[GondiaStay] Firebase initialization error:', error);
  }
} else {
  console.info('[GondiaStay] Firebase configuration pending. App will prompt to connect.');
}

/**
 * Returns the active Firebase Storage instance using the existing Firebase project and app instance.
 * Dynamically initializes storage on the active app if needed.
 * Throws a clear, descriptive error if Storage configuration is missing.
 */
export const getStorageInstance = (): FirebaseStorage => {
  if (storage) {
    return storage;
  }

  // Attempt dynamic initialization on the existing Firebase app instance
  const activeApp = app || (getApps().length > 0 ? getApp() : null);
  const activeCfg = config || getActiveFirebaseConfig();

  if (!activeCfg || !activeCfg.apiKey || !activeCfg.projectId) {
    throw new Error(
      'Firebase Storage is not initialized because Firebase is not connected. ' +
      'Please open Settings and configure your Firebase project credentials.'
    );
  }

  if (activeApp) {
    const bucket = normalizeStorageBucket(activeCfg.storageBucket, activeCfg.projectId);
    if (bucket && activeApp.options && !activeApp.options.storageBucket) {
      (activeApp.options as any).storageBucket = bucket;
    }

    try {
      const initializedStorage = bucket 
        ? getStorage(activeApp, `gs://${bucket}`) 
        : getStorage(activeApp);
      storage = initializedStorage;
      return initializedStorage;
    } catch (e1) {
      try {
        const initializedStorage = bucket 
          ? getStorage(activeApp, bucket) 
          : getStorage(activeApp);
        storage = initializedStorage;
        return initializedStorage;
      } catch (e2) {
        try {
          const fallback = getStorage(activeApp);
          storage = fallback;
          return fallback;
        } catch (e3: any) {
          throw new Error(
            `Firebase Storage initialization failed for project "${activeCfg.projectId}": ${e3.message || 'Storage bucket not accessible'}. ` +
            'Please verify that Firebase Storage is enabled in the Firebase Console (Build > Storage).'
          );
        }
      }
    }
  }

  throw new Error(
    'Firebase Storage is not initialized. Please verify your Firebase project configuration.'
  );
};

export { app, db, auth, storage };
export const isFirebaseConfigured = (): boolean => db !== null;
export const isStorageConfigured = (): boolean => {
  if (storage !== null) return true;
  try {
    return getStorageInstance() !== null;
  } catch {
    return false;
  }
};
export const getActiveProjectId = (): string => config?.projectId || '';
export const getActiveStorageBucket = (): string => {
  return config?.storageBucket || normalizeStorageBucket(undefined, config?.projectId);
};
