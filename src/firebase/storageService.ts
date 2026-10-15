import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, isStorageConfigured } from './config';

export interface UploadProgressInfo {
  fileName: string;
  percent: number;
  completed: number;
  total: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per photo

/**
 * Validates that the selected file is an image and is within acceptable size limits.
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

  // Size check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is too large (${sizeInMb} MB). Maximum allowed size per photo is 10 MB.`
    };
  }

  return { valid: true };
};

/**
 * Uploads a single property photo to Firebase Storage and returns its public HTTPS download URL.
 */
export const uploadPropertyPhoto = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> => {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (!storage || !isStorageConfigured()) {
    throw new Error(
      'Firebase Storage is not initialized. Please verify your Firebase project settings.'
    );
  }

  // Sanitize file name and create a unique storage path
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `property_photos/${uniqueId}_${sanitizedName}`;
  const fileRef = ref(storage, storagePath);

  const metadata = {
    contentType: file.type || 'image/jpeg',
    customMetadata: {
      source: 'GondiaStay Owner Submission',
      uploadedAt: new Date().toISOString()
    }
  };

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, file, metadata);

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
      (error) => {
        console.error('Firebase Storage upload error:', error);
        let errorMsg = `Failed to upload "${file.name}".`;
        if (error.code === 'storage/unauthorized') {
          errorMsg = 'Permission denied by Firebase Storage rules. Please check your storage rules.';
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
          resolve(downloadUrl);
        } catch (err: any) {
          reject(new Error(`Failed to retrieve photo download URL: ${err.message || ''}`));
        }
      }
    );
  });
};

/**
 * Uploads multiple property photos in batch and calls onProgress with the batch status.
 * Returns an array of download URLs for the uploaded photos.
 */
export const uploadMultiplePropertyPhotos = async (
  files: File[],
  onProgress?: (info: UploadProgressInfo) => void
): Promise<string[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  // Pre-validate all files first
  for (const file of files) {
    const val = validateImageFile(file);
    if (!val.valid) {
      throw new Error(val.error);
    }
  }

  const uploadedUrls: string[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const url = await uploadPropertyPhoto(file, (percent) => {
      if (onProgress) {
        onProgress({
          fileName: file.name,
          percent,
          completed: i,
          total
        });
      }
    });

    uploadedUrls.push(url);

    if (onProgress) {
      onProgress({
        fileName: file.name,
        percent: 100,
        completed: i + 1,
        total
      });
    }
  }

  return uploadedUrls;
};
