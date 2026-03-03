/**
 * Verifies file content against known magic byte signatures.
 * Prevents disguised file uploads (e.g. a .exe renamed to .png).
 */

export interface MagicByteResult {
  isValid: boolean;
  isSuspicious: boolean;
  detectedType: string | null;
  expectedType: string | null;
  reason: string | null;
}

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'image/svg+xml': [[0x3c, 0x73, 0x76, 0x67], [0x3c, 0x3f, 0x78, 0x6d]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'application/zip': [[0x50, 0x4b, 0x03, 0x04]],
  'video/mp4': [[0x00, 0x00, 0x00]],
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
};

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.js', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.dll', '.sys', '.drv',
  '.sh', '.bash', '.csh',
];

export function isBlockedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return BLOCKED_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export async function verifyMagicBytes(file: File): Promise<MagicByteResult> {
  const buffer = await file.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (sig.every((byte, i) => bytes[i] === byte)) {
        const typeMatches = file.type === '' || file.type === mimeType || file.type.startsWith(mimeType.split('/')[0]);
        if (!typeMatches) {
          return {
            isValid: false,
            isSuspicious: true,
            detectedType: mimeType,
            expectedType: file.type || null,
            reason: `File claims to be ${file.type} but magic bytes indicate ${mimeType}`,
          };
        }
        return { isValid: true, isSuspicious: false, detectedType: mimeType, expectedType: file.type || null, reason: null };
      }
    }
  }

  return { isValid: true, isSuspicious: false, detectedType: null, expectedType: file.type || null, reason: null };
}

export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
