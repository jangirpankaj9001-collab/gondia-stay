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
 * Unpacks and formats raw Firebase errors to surface the actual root cause directly to users.
 * Never masks Firebase server, rule, or bucket rejections with misleading network messages.
 */
export const formatStorageError = (error: any, bucketName: string, fileName: string): string => {
  const code = error?.code || '';
  const message = error?.message || 'Upload failed.';
  const serverResponse = error?.customData?.serverResponse || error?.serverResponse || '';
  const status = error?.status_ ? ` (HTTP ${error.status_})` : '';

  let actionableHelp = '';
  if (
    code === 'storage/bucket-not-found' || 
    message.includes('bucket-not-found') || 
    serverResponse.includes('NoSuchBucket') ||
    error?.status_ === 404
  ) {
    actionableHelp = `Firebase Storage bucket "${bucketName}" was not found (HTTP 404). Please ensure Firebase Storage is enabled in Firebase Console (Build > Storage) and check the bucket name in Settings.`;
  } else if (
    code === 'storage/unauthorized' || 
    message.includes('unauthorized') || 
    serverResponse.includes('AccessDenied') ||
    error?.status_ === 403
  ) {
    actionableHelp = `Permission denied by Firebase Storage security rules for "${fileName}" (HTTP 403). Check storage.rules in Firebase Console to ensure write access is allowed for /property_photos/.`;
  } else if (code === 'storage/quota-exceeded') {
    actionableHelp = `Firebase Storage quota exceeded. Please check your Firebase billing plan and storage usage in the Firebase Console.`;
  } else if (code === 'storage/unauthenticated') {
    actionableHelp = `User is unauthenticated. Please verify Firebase Authentication is initialized and check storage.rules.`;
  } else if (code === 'storage/retry-limit-exceeded') {
    actionableHelp = `Firebase connection to bucket "${bucketName}" timed out after retry limit. Please check if Firebase Storage is enabled in Firebase Console.`;
  } else if (code === 'storage/invalid-checksum') {
    actionableHelp = `Checksum mismatch during transfer of "${fileName}".`;
  } else if (code === 'storage/canceled') {
    actionableHelp = `Photo upload was canceled.`;
  } else if (code === 'storage/unknown') {
    if (serverResponse) {
      actionableHelp = `Server response: ${serverResponse}`;
    } else {
      actionableHelp = `Firebase Storage returned an unknown error connecting to bucket "${bucketName}". Please ensure Firebase Storage is enabled in Firebase Console (Build > Storage).`;
    }
  }

  const prefix = code ? `[${code}]${status} ` : '';
  const serverInfo = serverResponse && !actionableHelp.includes(serverResponse) ? ` [Server: ${serverResponse}]` : '';

  if (actionableHelp) {
    return `${prefix}${actionableHelp}${serverInfo}`;
  }
  return `${prefix}${message}${serverInfo}`;
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
 * Uploads a single property photo to Firebase Storage with fast direct upload.
 * Automatically compresses to ~150-250 KB prior to sending, checks persistent duplicate cache,
 * enforces sensible 15s max retry times so errors fail fast, and reports real Firebase errors.
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
      'Firebase Storage is not initialized because Firebase is not connected. Please open Settings and configure your Firebase project credentials.'
    );
  }

  // Ensure reasonable retry limits so errors fail fast (15s) rather than hanging 10 minutes
  storageInstance.maxUploadRetryTime = 15000;
  storageInstance.maxOperationRetryTime = 15000;

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
      source: 'GondiaStay Fast Upload',
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      optimizedSize: `${Math.round(uploadableFile.size / 1024)}KB`
    }
  };

  const executeUpload = async (inst: FirebaseStorage, isRetry = false): Promise<string> => {
    inst.maxUploadRetryTime = 15000;
    inst.maxOperationRetryTime = 15000;
    const fileRef = ref(inst, storagePath);
    const activeBucket = getStorageBucketName(inst, getActiveFirebaseConfig());

    try {
      if (onProgress) onProgress(50);

      // Direct uploadBytes: sends data directly in a single request.
      // Avoids browser resumable session CORS issues (Location header) and completes in milliseconds for 150-250KB images.
      const result = await uploadBytes(fileRef, uploadableFile, metadata);

      if (onProgress) onProgress(85);
      const downloadUrl = await getDownloadURL(result.ref);

      if (onProgress) onProgress(100);
      setCachedPhotoUrl(fingerprint, downloadUrl);
      return downloadUrl;
    } catch (error: any) {
      console.error('[GondiaStay] Firebase Storage upload error:', {
        code: error?.code,
        message: error?.message,
        serverResponse: error?.customData?.serverResponse || error?.serverResponse,
        status: error?.status_,
        bucket: activeBucket,
        file: file.name
      });

      // If bucket-not-found, automatically try alternate bucket (.appspot.com vs .firebasestorage.app)
      const isBucketNotFound = 
        error?.code === 'storage/bucket-not-found' ||
        error?.message?.includes('bucket-not-found') ||
        error?.customData?.serverResponse?.includes('NoSuchBucket') ||
        error?.status_ === 404;

      if (!isRetry && isBucketNotFound) {
        const cfg = getActiveFirebaseConfig();
        if (cfg?.projectId && app) {
          const altBucket = activeBucket.includes('firebasestorage.app')
            ? `${cfg.projectId}.appspot.com`
            : `${cfg.projectId}.firebasestorage.app`;

          if (altBucket !== activeBucket) {
            console.log(`[GondiaStay] Retrying photo upload with alternative bucket "${altBucket}"...`);
            try {
              const altStorage = getStorage(app, `gs://${altBucket}`);
              const res = await executeUpload(altStorage, true);
              updateActiveStorageInstance(altStorage, altBucket);
              return res;
            } catch (altErr) {
              console.warn('[GondiaStay] Alternative bucket switch failed:', altErr);
            }
          }
        }
      }

      // Format the REAL Firebase error directly without misleading network messages
      const formatted = formatStorageError(error, activeBucket, file.name);
      throw new Error(formatted);
    }
  };

  return executeUpload(storageInstance);
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

  // Run with controlled concurrency (default: 2 to prevent mobile uplink congestion)
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
