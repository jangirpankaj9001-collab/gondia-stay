import { 
  ref, 
  uploadBytesResumable, 
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

// In-memory cache of uploaded photo URLs keyed by file fingerprint to prevent duplicate uploads
const uploadedUrlCache = new Map<string, string>();

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
 * Uploads a single property photo to Firebase Storage using the same existing Firebase project and app instance.
 * Automatically compresses and resizes the photo to target 200–400 KB before upload if needed.
 * Prevents duplicate uploads by checking recent fingerprint cache.
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

  // Check duplicate upload cache first
  const fingerprint = getFileFingerprint(file);
  const cachedUrl = uploadedUrlCache.get(fingerprint);
  if (cachedUrl) {
    if (onProgress) onProgress(100);
    return cachedUrl;
  }

  // Compress & resize photo to target 200–400 KB if over 400KB or if not yet JPEG
  let uploadableFile = file;
  if (file.size > 400 * 1024 || file.type !== 'image/jpeg') {
    try {
      const optimized = await compressAndResizeImage(file, {
        maxDimension: 1600,
        targetMaxBytes: 400 * 1024,
        targetMinBytes: 200 * 1024,
        initialQuality: 0.82,
        minQuality: 0.65
      });
      uploadableFile = optimized.file;
    } catch (compressErr) {
      console.warn('Image compression fallback to original:', compressErr);
      uploadableFile = file;
    }
  }

  // Sanitize file name and create a unique storage path
  const sanitizedName = uploadableFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `property_photos/${uniqueId}_${sanitizedName}`;

  const metadata = {
    contentType: uploadableFile.type || 'image/jpeg',
    customMetadata: {
      source: 'GondiaStay Optimized Upload',
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      optimizedSize: `${(uploadableFile.size / 1024).toFixed(0)}KB`
    }
  };

  const executeUpload = (inst: FirebaseStorage, isRetry = false): Promise<string> => {
    const fileRef = ref(inst, storagePath);

    return new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, uploadableFile, metadata);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) {
              onProgress(percent);
            }
          }
        },
        (error: any) => {
          console.error('Firebase Storage upload error:', error);

          // If bucket-not-found, attempt alternate bucket (.appspot.com vs .firebasestorage.app)
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
                  executeUpload(altStorage, true).then(resolve).catch(reject);
                  return;
                } catch (altErr) {
                  console.warn('[GondiaStay] Alternative bucket switch failed:', altErr);
                }
              }
            }
          }

          let errorMsg = `Failed to upload "${file.name}".`;
          if (error.code === 'storage/unauthorized') {
            errorMsg = 'Permission denied by Firebase Storage security rules. Please check your Storage security rules.';
          } else if (error.code === 'storage/bucket-not-found') {
            errorMsg = 'Firebase Storage bucket not found. Please ensure Firebase Storage is enabled in your Firebase Console (Build > Storage).';
          } else if (error.code === 'storage/quota-exceeded') {
            errorMsg = 'Firebase Storage quota exceeded. Please check your Firebase plan.';
          } else if (error.code === 'storage/canceled') {
            errorMsg = 'Photo upload was canceled.';
          } else if (error.message) {
            errorMsg = `Upload error: ${error.message}`;
          }
          reject(new Error(errorMsg));
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            // Cache to prevent duplicate uploads
            uploadedUrlCache.set(fingerprint, downloadUrl);
            resolve(downloadUrl);
          } catch (err: any) {
            reject(new Error(`Failed to retrieve photo download URL: ${err.message || ''}`));
          }
        }
      );
    });
  };

  return executeUpload(storageInstance);
};

/**
 * Uploads multiple property photos efficiently with controlled concurrency (2 at a time),
 * aggregate progress tracking, and duplicate prevention.
 * Returns an array of download URLs for the uploaded photos.
 */
export const uploadMultiplePropertyPhotos = async (
  files: File[],
  onProgress?: (info: UploadProgressInfo) => void,
  concurrencyLimit = 2
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

  // Run with worker pool to upload efficiently without overwhelming mobile network
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
  getFileFingerprint
};
export type { OptimizedImageResult };
