import { 
  ref, 
  uploadBytesResumable, 
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
  getActiveFirebaseConfig,
  updateActiveStorageInstance 
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
// Generous 120-second safety ceiling to reliably handle slow mobile/broadband networks
const MAX_UPLOAD_TIMEOUT_MS = 120000;
// Inactivity timeout: 45 seconds without any bytes transferred or progress updates
const INACTIVITY_TIMEOUT_MS = 45000;

/**
 * Safely extracts the active bucket name from the FirebaseStorage instance or active config.
 */
export const getStorageBucketName = (
  inst: FirebaseStorage,
  cfg?: ReturnType<typeof getActiveFirebaseConfig>
): string => {
  return (
    (inst as any)?._bucket?.bucket ||
    (inst as any)?._location?.bucket ||
    inst.app?.options?.storageBucket ||
    cfg?.storageBucket ||
    ''
  );
};

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
 * Uploads a single property photo to Firebase Storage with resumable chunked upload.
 * Automatically compresses to ~150-250 KB prior to sending, checks persistent duplicate cache,
 * streams real-time byte progress, and accommodates slow networks with an activity-based watchdog timer.
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

  // 1. Check persistent duplicate upload cache (0ms instant return, avoids redundant network)
  const fingerprint = getFileFingerprint(file);
  const cachedUrl = getCachedPhotoUrl(fingerprint);
  if (cachedUrl) {
    if (onProgress) onProgress(100);
    return cachedUrl;
  }

  // 2. Compress & resize photo to target 150–300 KB if not already optimized JPEG
  let uploadableFile = file;
  if (file.size > 350 * 1024 || file.type !== 'image/jpeg') {
    if (onProgress) onProgress(15);
    try {
      const optimized = await compressAndResizeImage(file, {
        maxDimension: 1280,
        targetMaxBytes: 350 * 1024,
        initialQuality: 0.78,
        minQuality: 0.65
      });
      uploadableFile = optimized.file;
    } catch (compressErr) {
      console.warn('[GondiaStay] Image compression fallback to original:', compressErr);
      uploadableFile = file;
    }
  }

  if (onProgress) onProgress(30);

  // 3. Unique storage path with sanitized name
  const sanitizedName = uploadableFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const storagePath = `property_photos/${uniqueId}_${sanitizedName}`;

  const metadata = {
    contentType: uploadableFile.type || 'image/jpeg',
    customMetadata: {
      source: 'GondiaStay Resumable Upload',
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      optimizedSize: `${Math.round(uploadableFile.size / 1024)}KB`
    }
  };

  const executeResumableUpload = (inst: FirebaseStorage, isRetry = false): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const fileRef = ref(inst, storagePath);
      let isFinalized = false;
      let inactivityTimer: any = null;
      let maxTimeoutTimer: any = null;

      const clearAllTimers = () => {
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
          inactivityTimer = null;
        }
        if (maxTimeoutTimer) {
          clearTimeout(maxTimeoutTimer);
          maxTimeoutTimer = null;
        }
      };

      const resetInactivityWatchdog = () => {
        if (isFinalized) return;
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          if (isFinalized) return;
          console.warn(
            `[GondiaStay] Photo upload for "${file.name}" stalled with no network progress for ${INACTIVITY_TIMEOUT_MS / 1000}s`
          );
          try {
            uploadTask.cancel();
          } catch {}
          clearAllTimers();
          reject(
            new Error(
              `Upload stalled for "${file.name}" after ${INACTIVITY_TIMEOUT_MS / 1000}s of network inactivity. Please check your internet connection.`
            )
          );
        }, INACTIVITY_TIMEOUT_MS);
      };

      // Maximum safety ceiling timer (120s) to prevent endless hang
      maxTimeoutTimer = setTimeout(() => {
        if (isFinalized) return;
        try {
          uploadTask.cancel();
        } catch {}
        clearAllTimers();
        reject(
          new Error(
            `Upload timed out for "${file.name}" after ${MAX_UPLOAD_TIMEOUT_MS / 1000}s. Please check your network connection and Firebase Storage bucket.`
          )
        );
      }, MAX_UPLOAD_TIMEOUT_MS);

      if (onProgress) onProgress(35);
      // Use uploadBytesResumable to enable chunked transfer, real-time byte tracking, and slow network resilience
      const uploadTask = uploadBytesResumable(fileRef, uploadableFile, metadata);

      resetInactivityWatchdog();

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (isFinalized) return;
          // Every time bytes are transferred, reset the inactivity watchdog so slow uploads don't abort
          resetInactivityWatchdog();

          const transferred = snapshot.bytesTransferred;
          const total = snapshot.totalBytes;
          const progressRatio = total > 0 ? transferred / total : 0;

          // Granular smooth progress mapped from 35% to 88%
          const currentPercent = Math.round(35 + progressRatio * 53);
          if (onProgress) {
            onProgress(Math.min(88, Math.max(35, currentPercent)));
          }
        },
        async (error: any) => {
          if (isFinalized) return;
          clearAllTimers();
          console.error('[GondiaStay] Firebase Storage upload error details:', {
            code: error?.code,
            message: error?.message,
            serverResponse: error?.customData?.serverResponse || error?.serverResponse,
            file: file.name
          });

          // If bucket-not-found, automatically try alternate bucket (.appspot.com vs .firebasestorage.app)
          if (!isRetry && (error?.code === 'storage/bucket-not-found' || error?.message?.includes('bucket-not-found'))) {
            const cfg = getActiveFirebaseConfig();
            if (cfg?.projectId && app) {
              const currentBucket = getStorageBucketName(inst, cfg);
              const altBucket = currentBucket.includes('firebasestorage.app')
                ? `${cfg.projectId}.appspot.com`
                : `${cfg.projectId}.firebasestorage.app`;

              if (altBucket !== currentBucket) {
                console.log(`[GondiaStay] Retrying photo upload with alternative bucket "${altBucket}"...`);
                try {
                  const altStorage = getStorage(app, `gs://${altBucket}`);
                  const res = await executeResumableUpload(altStorage, true);
                  // Update active storage instance so future uploads use the working bucket directly
                  updateActiveStorageInstance(altStorage, altBucket);
                  resolve(res);
                  return;
                } catch (altErr) {
                  console.warn('[GondiaStay] Alternative bucket switch failed:', altErr);
                }
              }
            }
          }

          let errorMsg = `Failed to upload "${file.name}".`;
          if (error?.code === 'storage/unauthorized') {
            errorMsg = `Permission denied by Firebase Storage security rules for "${file.name}". Please verify storage.rules allows uploads to /property_photos/ in Firebase Console.`;
          } else if (error?.code === 'storage/bucket-not-found') {
            const bucketName = getStorageBucketName(inst, getActiveFirebaseConfig());
            errorMsg = `Firebase Storage bucket "${bucketName || 'default'}" not found. Please enable Firebase Storage in Firebase Console (Build > Storage).`;
          } else if (error?.code === 'storage/quota-exceeded') {
            errorMsg = `Firebase Storage quota exceeded for "${file.name}". Please check your Firebase plan and usage limits.`;
          } else if (error?.code === 'storage/canceled') {
            errorMsg = `Upload of "${file.name}" was canceled.`;
          } else if (error?.code === 'storage/retry-limit-exceeded') {
            errorMsg = `Upload timed out for "${file.name}" due to unstable network connection. Please check your internet connection.`;
          } else if (error?.message) {
            const serverResponse = error.customData?.serverResponse || error.serverResponse;
            if (serverResponse && typeof serverResponse === 'string') {
              errorMsg = `${error.message} (${serverResponse})`;
            } else {
              errorMsg = error.message;
            }
          }
          reject(new Error(errorMsg));
        },
        async () => {
          if (isFinalized) return;
          isFinalized = true;
          clearAllTimers();
          if (onProgress) onProgress(90);

          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);

            // Persist in cache to prevent duplicate uploads in future edits/submissions
            setCachedPhotoUrl(fingerprint, downloadUrl);
            resolve(downloadUrl);
          } catch (urlErr: any) {
            console.error('[GondiaStay] Failed to retrieve download URL:', urlErr);
            reject(
              new Error(
                `Photo uploaded successfully but failed to retrieve public URL: ${urlErr?.message || 'Check storage.rules read permission'}`
              )
            );
          }
        }
      );
    });
  };

  return executeResumableUpload(storageInstance);
};

/**
 * Uploads multiple property photos in parallel with controlled concurrency (default: 2),
 * aggregate progress tracking, and persistent duplicate prevention.
 * Returns an array of download URLs for the uploaded photos.
 */
export const uploadMultiplePropertyPhotos = async (
  files: File[],
  onProgress?: (info: UploadProgressInfo) => void,
  concurrencyLimit = 2,
  onFileComplete?: (file: File, url: string, index: number) => void
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

  // Run with controlled concurrency (default 2 to prevent cellular uplink congestion)
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
      if (onFileComplete) {
        onFileComplete(file, url, currentIndex);
      }
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
