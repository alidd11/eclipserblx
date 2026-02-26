/**
 * Validates product image quality before upload.
 * Enforces minimum resolution, file size, and aspect ratio standards.
 */

export interface ImageQualityResult {
  valid: boolean;
  reason?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

// Minimum requirements
const MIN_WIDTH = 800;
const MIN_HEIGHT = 800;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIN_FILE_SIZE = 20 * 1024; // 20 KB — anything below is almost certainly garbage
const MAX_ASPECT_RATIO = 3; // max 3:1 or 1:3

/**
 * Loads a File as an HTMLImageElement to read its natural dimensions.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to read image'));
    };
    img.src = url;
  });
}

/**
 * Validates an image file against quality requirements.
 * Returns { valid: true } or { valid: false, reason: "..." }.
 */
export async function validateImageQuality(file: File): Promise<ImageQualityResult> {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, reason: 'File is not an image.' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      reason: `Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      fileSize: file.size,
    };
  }

  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      reason: `Image file is too small (${(file.size / 1024).toFixed(0)}KB). This usually means the image is very low quality.`,
      fileSize: file.size,
    };
  }

  // Check dimensions
  try {
    const img = await loadImage(file);
    const { naturalWidth: w, naturalHeight: h } = img;

    if (w < MIN_WIDTH || h < MIN_HEIGHT) {
      return {
        valid: false,
        reason: `Image resolution too low (${w}×${h}). Minimum required is ${MIN_WIDTH}×${MIN_HEIGHT} pixels.`,
        width: w,
        height: h,
        fileSize: file.size,
      };
    }

    // Check aspect ratio — prevent extreme panoramic/strip images
    const ratio = Math.max(w / h, h / w);
    if (ratio > MAX_ASPECT_RATIO) {
      return {
        valid: false,
        reason: `Image aspect ratio is too extreme (${w}×${h}). Maximum ratio is ${MAX_ASPECT_RATIO}:1.`,
        width: w,
        height: h,
        fileSize: file.size,
      };
    }

    return { valid: true, width: w, height: h, fileSize: file.size };
  } catch {
    return { valid: false, reason: 'Could not read image dimensions. The file may be corrupted.' };
  }
}
