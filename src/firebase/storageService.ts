import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  getStorage, 
  FirebaseStorage 
} from 'firebase/storage';
import { 
  storage, 
  isStorageConfigured, 
  getStorageInstance, 
  app, 
  getActiveFirebaseConfig 
} from './config';
import { 
  compressAndResizeImage, 
  formatBytes, 
  getFileFingerprint,
  getCachedPhotoUrl,
  setCachedPhotoUrl,
  OptimizedImageResult 
} from '../utils/imageOptimizer';

export interface UploadProgressInfo {
  fileName: string;
  percent: number;        // Overall progress percentage (0 - 100)
  completed: number;      // Number of completed files
  total: number;          // Total number of files
  bytesTransferred?: number;
  totalBytes?: number;
  phase?: 'optimizing' | 'uploading' | 'complete';
}

const MAX_ORIGINAL_FILE_SIZE_BYTES = 25 * 1024 * 1024; // Up to 25 MB before compression
const UPLOAD_TIMEOUT_MS = 20000; // 20-second timeout prevents endless loading

/**
 * Validates that the selected file is an image and is within acceptable initial limits.
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Must be an image MIME type
  if (!file.type || !file.type.startsWith('image/')) {
    return {
      valid: false,
      error: `"${file.name}" is not a recognized image. Please select JPG, PNG, or WebP photos.`
    };
  }

  // Initial raw size check before compression
  if (file.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is too large (${sizeInMb} MB). Maximum allowed size before optimization is 25 MB.`
    };
  }

  return { valid: true };
};

/**
 * Uploads a single property photo to Firebase Storage with ultra-fast direct upload.
 * Automatically compresses to ~150-250 KB prior to sending, checks persistent duplicate cache,
 * and enforces a 20-second timeout to prevent endless loading.
 */
export const uploadPropertyPhoto = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Retrieve or initialize the Storage instance on the existing Firebase app instance
  const storageInstance = getStorageInstance();
  if (!storageInstance) {
    throw new Error(
      'Firebase Storage is not initialized. Please verify your Firebase project configuration.'
    );
  }

  // 1. Check persistent duplicate upload cache (0ms instant return)
  const fingerprint = getFileFingerprint(file);
  const cachedUrl = getCachedPhotoUrl(fingerprint);
  if (cachedUrl) {
    if (onProgress) onProgress(100);
    return cachedUrl;
  }

  // 2. Compress & resize photo to target 150–300 KB if not already optimized JPEG
  let uploadableFile = file;
  if (file.size > 350 * 1024 || file.type !== 'image/jpeg') {
    try {
      const optimized = await compressAndResizeImage(file, {
        maxDimension: 1280,
        targetMaxBytes: 350 * 1024,
        initialQuality: 0.78,
        minQuality: 0.65
      });
      uploadableFile = optimized.file;
    } catch (compressErr) {
      console.warn('Image compression fallback to original:', compressErr);
      uploadableFile = file;
    }
  }

  if (onProgress) onProgress(25);

  // 3. Unique storage path with sanitized name
  const sanitizedName = uploadableFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const storagePath = `property_photos/${uniqueId}_${sanitizedName}`;

  const metadata = {
    contentType: uploadableFile.type || 'image/jpeg',
    customMetadata: {
      source: 'GondiaStay Fast Upload',
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      optimizedSize: `${Math.round(uploadableFile.size / 1024)}KB`
    }
  };

  const executeFastUpload = async (inst: FirebaseStorage, isRetry = false): Promise<string> => {
    const fileRef = ref(inst, storagePath);

    // Watchdog timer promise to guarantee no endless loading
    let timeoutId: any = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Upload timed out for "${file.name}" after ${UPLOAD_TIMEOUT_MS / 1000}s. Please check your network connection and Firebase Storage bucket.`
          )
        );
      }, UPLOAD_TIMEOUT_MS);
    });

    try {
      const uploadPromise = (async () => {
        if (onProgress) onProgress(45);
        // Direct non-chunked uploadBytes executes in a single HTTP request in < 1 second for 150-250KB
        const result = await uploadBytes(fileRef, uploadableFile, metadata);
        if (onProgress) onProgress(80);
        const downloadUrl = await getDownloadURL(result.ref);
        if (onProgress) onProgress(100);
        return downloadUrl;
      })();

      const finalUrl = await Promise.race([uploadPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      // Persist in cache to prevent duplicate uploads in future edits/submissions
      setCachedPhotoUrl(fingerprint, finalUrl);
      return finalUrl;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Firebase Storage upload error:', error);

      // If bucket-not-found, automatically try alternate bucket (.appspot.com vs .firebasestorage.app)
      if (!isRetry && (error.code === 'storage/bucket-not-found' || error.message?.includes('bucket-not-found'))) {
        const cfg = getActiveFirebaseConfig();
        if (cfg?.projectId && app) {
          const currentBucket = (inst as any)?._bucket?.bucket || '';
          const altBucket = currentBucket.includes('firebasestorage.app')
            ? `${cfg.projectId}.appspot.com`
            : `${cfg.projectId}.firebasestorage.app`;

          if (altBucket !== currentBucket) {
            console.log(`[GondiaStay] Retrying photo upload with alternative bucket "${altBucket}"...`);
            try {
              const altStorage = getStorage(app, `gs://${altBucket}`);
              return await executeFastUpload(altStorage, true);
            } catch (altErr) {
              console.warn('[GondiaStay] Alternative bucket switch failed:', altErr);
            }
          }
        }
      }

      let errorMsg = `Failed to upload "${file.name}".`;
      if (error.code === 'storage/unauthorized') {
        errorMsg = 'Permission denied by Firebase Storage security rules. Please check storage.rules in Firebase Console.';
      } else if (error.code === 'storage/bucket-not-found') {
        errorMsg = 'Firebase Storage bucket not found. Please enable Firebase Storage in Firebase Console (Build > Storage).';
      } else if (error.code === 'storage/quota-exceeded') {
        errorMsg = 'Firebase Storage quota exceeded. Please check your Firebase plan.';
      } else if (error.code === 'storage/canceled') {
        errorMsg = 'Photo upload was canceled.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      throw new Error(errorMsg);
    }
  };

  return executeFastUpload(storageInstance);
};

/**
 * Uploads multiple property photos in parallel with controlled concurrency (up to 3 files),
 * aggregate progress tracking, and persistent duplicate prevention.
 * Returns an array of download URLs for the uploaded photos.
 */
export const uploadMultiplePropertyPhotos = async (
  files: File[],
  onProgress?: (info: UploadProgressInfo) => void,
  concurrencyLimit = 3
): Promise<string[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  // Pre-validate all files
  for (const file of files) {
    const val = validateImageFile(file);
    if (!val.valid) {
      throw new Error(val.error);
    }
  }

  const total = files.length;
  const results: string[] = new Array(total);
  const fileProgress: number[] = new Array(total).fill(0);
  let completedCount = 0;

  const updateOverallProgress = (activeFileName: string) => {
    if (!onProgress) return;
    const sumProgress = fileProgress.reduce((a, b) => a + b, 0);
    const overallPercent = Math.round(sumProgress / total);
    onProgress({
      fileName: activeFileName,
      percent: Math.min(100, Math.max(0, overallPercent)),
      completed: completedCount,
      total,
      phase: completedCount === total ? 'complete' : 'uploading'
    });
  };

  // Run with parallel worker pool (concurrency 3)
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < total) {
      const currentIndex = nextIndex++;
      const file = files[currentIndex];

      const url = await uploadPropertyPhoto(file, (singlePercent) => {
        fileProgress[currentIndex] = singlePercent;
        updateOverallProgress(file.name);
      });

      results[currentIndex] = url;
      fileProgress[currentIndex] = 100;
      completedCount++;
      updateOverallProgress(file.name);
    }
  };

  const poolSize = Math.min(concurrencyLimit, total);
  const workers: Promise<void>[] = [];
  for (let w = 0; w < poolSize; w++) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
  return results;
};

export { 
  compressAndResizeImage, 
  formatBytes, 
  getFileFingerprint,
  getCachedPhotoUrl,
  setCachedPhotoUrl
};
export type { OptimizedImageResult };
