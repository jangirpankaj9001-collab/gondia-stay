/**
 * Media Storage Service for GondiaStay
 * Uses Cloudinary (cloud: basiw3sf, preset: gondiastay_upload) for free-tier photo uploads
 * without requiring Firebase Storage Blaze billing.
 * Preserves existing signatures and Firestore integration.
 */

import { 
  uploadImageToCloudinary, 
  uploadMultipleImagesToCloudinary, 
  getCloudinaryConfig,
  saveCloudinaryConfig,
  CloudinaryConfig,
  UploadProgressInfo
} from '../services/cloudinaryService';

import { 
  compressAndResizeImage, 
  formatBytes, 
  getFileFingerprint,
  getCachedPhotoUrl,
  setCachedPhotoUrl,
  validateImageFile,
  OptimizedImageResult 
} from '../utils/imageOptimizer';

export type { UploadProgressInfo, CloudinaryConfig, OptimizedImageResult };
export { 
  compressAndResizeImage, 
  formatBytes, 
  getFileFingerprint,
  getCachedPhotoUrl,
  setCachedPhotoUrl,
  validateImageFile,
  getCloudinaryConfig,
  saveCloudinaryConfig
};

/**
 * Uploads a single property photo to Cloudinary CDN with fast compression and caching.
 * Automatically saves secure HTTPS URLs directly into Firestore property records.
 */
export const uploadPropertyPhoto = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  return uploadImageToCloudinary(file, onProgress, 'gondiastay_properties');
};

/**
 * Uploads a service photo or visiting card to Cloudinary CDN under gondiastay_services.
 */
export const uploadServicePhoto = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  return uploadImageToCloudinary(file, onProgress, 'gondiastay_services');
};

/**
 * Uploads multiple service photos to Cloudinary CDN with progress tracking.
 */
export const uploadMultipleServicePhotos = async (
  files: File[],
  onProgress?: (info: UploadProgressInfo) => void,
  concurrencyLimit = 2,
  onFileComplete?: (file: File, url: string, index: number) => void
): Promise<string[]> => {
  return uploadMultipleImagesToCloudinary(files, onProgress, concurrencyLimit, onFileComplete, 'gondiastay_services');
};

/**
 * Uploads multiple property photos in parallel to Cloudinary CDN with controlled concurrency (default: 2),
 * aggregate progress tracking, and instant duplicate prevention.
 */
export const uploadMultiplePropertyPhotos = async (
  files: File[],
  onProgress?: (info: UploadProgressInfo) => void,
  concurrencyLimit = 2,
  onFileComplete?: (file: File, url: string, index: number) => void
): Promise<string[]> => {
  return uploadMultipleImagesToCloudinary(files, onProgress, concurrencyLimit, onFileComplete, 'gondiastay_properties');
};

export const isCloudinaryConfigured = (): boolean => {
  const cfg = getCloudinaryConfig();
  return Boolean(cfg.cloudName && cfg.uploadPreset);
};
