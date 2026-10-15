/**
 * GondiaStay Image Optimizer Utility
 * Handles client-side photo resizing, progressive compression, duplicate detection,
 * and visual quality preservation targeting 200–400 KB per photo.
 */

export interface OptimizeOptions {
  maxDimension?: number;    // Maximum width or height in pixels (default: 1600px)
  targetMaxBytes?: number;  // Upper bound target in bytes (default: 400 KB = 400 * 1024)
  targetMinBytes?: number;  // Lower bound target in bytes (default: 200 KB = 200 * 1024)
  initialQuality?: number;  // Initial JPEG quality between 0 and 1 (default: 0.82)
  minQuality?: number;      // Minimum quality threshold to preserve visual clarity (default: 0.65)
}

export interface OptimizedImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  savedPercentage: number;
  width: number;
  height: number;
  previewUrl: string;
}

/**
 * Format raw byte count into human-readable string (KB / MB).
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Creates a unique fingerprint for a file based on name, size, and last modified date.
 * Used to detect and prevent duplicate photo uploads.
 */
export const getFileFingerprint = (file: File): string => {
  const cleanName = (file.name || 'photo').trim().toLowerCase();
  return `${cleanName}_${file.size}_${file.lastModified || 0}`;
};

/**
 * Checks if a file has already been added to the selected list by fingerprint.
 */
export const isDuplicateFile = (file: File, existingFingerprints: Set<string>): boolean => {
  const fp = getFileFingerprint(file);
  return existingFingerprints.has(fp);
};

/**
 * Compresses and resizes an image file using browser Canvas with high smoothing quality.
 * Targets 200 KB – 400 KB while preserving good visual quality.
 */
export const compressAndResizeImage = async (
  file: File,
  options: OptimizeOptions = {}
): Promise<OptimizedImageResult> => {
  const {
    maxDimension = 1600,
    targetMaxBytes = 400 * 1024, // 400 KB
    initialQuality = 0.82,
    minQuality = 0.65
  } = options;

  const originalSize = file.size;

  // If the file is not an image, return as-is
  if (!file.type || !file.type.startsWith('image/')) {
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      originalSizeFormatted: formatBytes(originalSize),
      compressedSizeFormatted: formatBytes(originalSize),
      savedPercentage: 0,
      width: 0,
      height: 0,
      previewUrl
    };
  }

  // Load image into an Image element or ImageBitmap with EXIF orientation awareness
  const { img, width: originalWidth, height: originalHeight } = await loadImage(file);

  // Calculate new dimensions preserving aspect ratio
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  // Draw onto canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    // If canvas context unavailable, return original
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      originalSizeFormatted: formatBytes(originalSize),
      compressedSizeFormatted: formatBytes(originalSize),
      savedPercentage: 0,
      width: originalWidth,
      height: originalHeight,
      previewUrl
    };
  }

  // Apply high quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill canvas with white background in case of transparent PNGs converted to JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Iteratively adjust quality to hit target <= 400 KB while preserving good visual quality
  let currentQuality = initialQuality;
  let blob: Blob | null = await canvasToBlob(canvas, 'image/jpeg', currentQuality);

  // If initial compression exceeds 400 KB, try lower quality down to minQuality (0.65)
  if (blob && blob.size > targetMaxBytes && currentQuality > minQuality) {
    currentQuality = 0.74;
    blob = await canvasToBlob(canvas, 'image/jpeg', currentQuality);
  }

  if (blob && blob.size > targetMaxBytes && currentQuality > minQuality) {
    currentQuality = minQuality;
    blob = await canvasToBlob(canvas, 'image/jpeg', currentQuality);
  }

  // If still slightly over targetMaxBytes (for very dense/complex photos), reduce dimensions by 15%
  if (blob && blob.size > targetMaxBytes) {
    const scaledWidth = Math.round(targetWidth * 0.85);
    const scaledHeight = Math.round(targetHeight * 0.85);
    const secondCanvas = document.createElement('canvas');
    secondCanvas.width = scaledWidth;
    secondCanvas.height = scaledHeight;
    const secondCtx = secondCanvas.getContext('2d', { alpha: false });
    if (secondCtx) {
      secondCtx.imageSmoothingEnabled = true;
      secondCtx.imageSmoothingQuality = 'high';
      secondCtx.fillStyle = '#FFFFFF';
      secondCtx.fillRect(0, 0, scaledWidth, scaledHeight);
      secondCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
      const secondBlob = await canvasToBlob(secondCanvas, 'image/jpeg', 0.72);
      if (secondBlob) {
        blob = secondBlob;
        targetWidth = scaledWidth;
        targetHeight = scaledHeight;
      }
    }
  }

  // If compression failed or is larger than the original image (unlikely for camera photos, but possible for tiny images),
  // decide best outcome
  let finalFile: File;
  let finalSize: number;

  if (blob && (blob.size < originalSize || originalSize > targetMaxBytes)) {
    const sanitizedName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
    finalFile = new File([blob], sanitizedName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
    finalSize = blob.size;
  } else {
    finalFile = file;
    finalSize = originalSize;
  }

  const savedBytes = Math.max(0, originalSize - finalSize);
  const savedPercentage = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;
  const previewUrl = URL.createObjectURL(finalFile);

  return {
    file: finalFile,
    originalSize,
    compressedSize: finalSize,
    originalSizeFormatted: formatBytes(originalSize),
    compressedSizeFormatted: formatBytes(finalSize),
    savedPercentage,
    width: targetWidth,
    height: targetHeight,
    previewUrl
  };
};

/**
 * Loads an image from a File, using createImageBitmap if supported for automatic EXIF orientation,
 * or standard HTMLImageElement as fallback.
 */
const loadImage = async (file: File): Promise<{ img: CanvasImageSource; width: number; height: number }> => {
  // Check if createImageBitmap with imageOrientation is supported
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { img: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // Fallback to standard Image loading
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
};

/**
 * Helper to convert canvas to Blob using Promise.
 */
const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> => {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      type,
      quality
    );
  });
};
