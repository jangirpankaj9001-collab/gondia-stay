/**
 * Cloudinary Photo Storage Service for GondiaStay
 * Free-tier cloud media storage with global CDN delivery.
 * Replaces paid Firebase Storage Blaze requirements while keeping Firebase Firestore for data.
 */

import { 
  compressAndResizeImage, 
  getFileFingerprint, 
  getCachedPhotoUrl, 
  setCachedPhotoUrl,
  validateImageFile
} from '../utils/imageOptimizer';

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

export interface UploadProgressInfo {
  fileName: string;
  percent: number;        // Overall progress percentage (0 - 100)
  completed: number;      // Number of completed files
  total: number;          // Total number of files
  bytesTransferred?: number;
  totalBytes?: number;
  phase?: 'optimizing' | 'uploading' | 'complete';
}

const CLOUDINARY_CONFIG_KEY = 'gondiastay_cloudinary_config';

// User specified Cloudinary Credentials
export const DEFAULT_CLOUDINARY_CONFIG: CloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'basiw3sf',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gondiastay_upload'
};

/**
 * Retrieves the active Cloudinary configuration from localStorage, environment variables, or defaults.
 */
export const getCloudinaryConfig = (): CloudinaryConfig => {
  try {
    const saved = localStorage.getItem(CLOUDINARY_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.cloudName && parsed.uploadPreset) {
        return {
          cloudName: parsed.cloudName.trim(),
          uploadPreset: parsed.uploadPreset.trim()
        };
      }
    }
  } catch (err) {
    console.warn('[GondiaStay] Error reading Cloudinary config from localStorage:', err);
  }

  return { ...DEFAULT_CLOUDINARY_CONFIG };
};

/**
 * Persists customized Cloudinary configuration to localStorage.
 */
export const saveCloudinaryConfig = (config: CloudinaryConfig): void => {
  try {
    localStorage.setItem(CLOUDINARY_CONFIG_KEY, JSON.stringify({
      cloudName: config.cloudName.trim(),
      uploadPreset: config.uploadPreset.trim()
    }));
  } catch (err) {
    console.warn('[GondiaStay] Error saving Cloudinary config:', err);
  }
};

/**
 * Resets Cloudinary configuration to default parameters.
 */
export const resetCloudinaryConfig = (): void => {
  try {
    localStorage.removeItem(CLOUDINARY_CONFIG_KEY);
  } catch (err) {
    console.warn('[GondiaStay] Error clearing Cloudinary config:', err);
  }
};

/**
 * Uploads a single image to Cloudinary using an unsigned upload preset.
 * Automatically optimizes and compresses the file before sending, checks duplicate cache,
 * and streams real upload progress.
 */
export const uploadImageToCloudinary = async (
  file: File,
  onProgress?: (percent: number) => void,
  folder: string = 'gondiastay_properties'
): Promise<string> => {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const config = getCloudinaryConfig();
  if (!config.cloudName || !config.uploadPreset) {
    throw new Error(
      'Cloudinary configuration is missing. Please verify your Cloud Name and Upload Preset in Settings.'
    );
  }

  // 1. Check persistent duplicate upload cache (0ms instant return if already uploaded)
  const fingerprint = getFileFingerprint(file);
  const cachedUrl = getCachedPhotoUrl(fingerprint);
  if (cachedUrl) {
    if (onProgress) onProgress(100);
    return cachedUrl;
  }

  // 2. Client-side compression targeting 150-300 KB for fast mobile uplink
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
      console.warn('[GondiaStay] Image optimization fallback to original:', compressErr);
      uploadableFile = file;
    }
  }

  if (onProgress) onProgress(25);

  // 3. Prepare FormData for Cloudinary Unsigned Upload
  const formData = new FormData();
  formData.append('file', uploadableFile);
  formData.append('upload_preset', config.uploadPreset);
  formData.append('folder', folder);

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadEndpoint, true);

    // Track real network upload progress (mapped to 25% - 92%)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const ratio = e.loaded / e.total;
        const mappedPercent = Math.round(25 + ratio * 67);
        onProgress(Math.min(92, Math.max(25, mappedPercent)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          const secureUrl = response.secure_url || response.url;
          if (!secureUrl) {
            reject(new Error('Cloudinary response missing secure image URL.'));
            return;
          }

          if (onProgress) onProgress(100);
          // Cache URL so this photo is never re-uploaded
          setCachedPhotoUrl(fingerprint, secureUrl);
          resolve(secureUrl);
        } catch (parseErr) {
          reject(new Error('Failed to parse Cloudinary response.'));
        }
      } else {
        let errorDetails = `Cloudinary upload failed (HTTP ${xhr.status})`;
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error?.message) {
            const rawMsg = errRes.error.message;
            if (rawMsg.includes('Upload preset not found')) {
              errorDetails = `Cloudinary Error: Upload preset "${config.uploadPreset}" was not found in cloud "${config.cloudName}". Please ensure an "Unsigned" preset named "${config.uploadPreset}" is created in Cloudinary Console (Settings > Upload > Upload Presets).`;
            } else if (rawMsg.includes('whitelisted for unsigned uploads')) {
              errorDetails = `Cloudinary Error: Upload preset "${config.uploadPreset}" must be set to "Unsigned" mode in Cloudinary Console (Settings > Upload > Upload Presets > Edit > Signing Mode: Unsigned).`;
            } else {
              errorDetails = `Cloudinary Error: ${rawMsg}`;
            }
          }
        } catch {
          if (xhr.statusText) {
            errorDetails += `: ${xhr.statusText}`;
          }
        }
        reject(new Error(errorDetails));
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          `Network error connecting to Cloudinary endpoint (${uploadEndpoint}). Please check your internet connection.`
        )
      );
    };

    xhr.ontimeout = () => {
      reject(
        new Error(
          `Cloudinary photo upload timed out for "${file.name}". Please try again.`
        )
      );
    };

    // 90s timeout for safety on slow networks
    xhr.timeout = 90000;
    xhr.send(formData);
  });
};

/**
 * Uploads multiple property photos in parallel to Cloudinary with controlled concurrency (default: 2),
 * progress tracking, and instant deduplication.
 */
export const uploadMultipleImagesToCloudinary = async (
  files: File[],
  onProgress?: (info: UploadProgressInfo) => void,
  concurrencyLimit = 2,
  onFileComplete?: (file: File, url: string, index: number) => void,
  folder: string = 'gondiastay_properties'
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

  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < total) {
      const currentIndex = nextIndex++;
      const file = files[currentIndex];

      const url = await uploadImageToCloudinary(file, (singlePercent) => {
        fileProgress[currentIndex] = singlePercent;
        updateOverallProgress(file.name);
      }, folder);

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
