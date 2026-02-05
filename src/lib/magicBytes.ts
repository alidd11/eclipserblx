/**
 * Magic byte signatures for common file types
 * Used to verify actual file content matches claimed extension
 */

interface MagicSignature {
  bytes: number[];
  offset?: number;
  mask?: number[];
}

interface FileTypeSignature {
  extension: string;
  mimeType: string;
  signatures: MagicSignature[];
}

// Common file type signatures
const FILE_SIGNATURES: FileTypeSignature[] = [
  // Images
  {
    extension: '.png',
    mimeType: 'image/png',
    signatures: [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }]
  },
  {
    extension: '.jpg',
    mimeType: 'image/jpeg',
    signatures: [
      { bytes: [0xFF, 0xD8, 0xFF, 0xE0] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xE1] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xE2] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xE3] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xE8] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xDB] }
    ]
  },
  {
    extension: '.gif',
    mimeType: 'image/gif',
    signatures: [
      { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
      { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }  // GIF89a
    ]
  },
  {
    extension: '.webp',
    mimeType: 'image/webp',
    signatures: [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }] // RIFF header, WEBP at offset 8
  },
  {
    extension: '.bmp',
    mimeType: 'image/bmp',
    signatures: [{ bytes: [0x42, 0x4D] }] // BM
  },

  // Archives
  {
    extension: '.zip',
    mimeType: 'application/zip',
    signatures: [
      { bytes: [0x50, 0x4B, 0x03, 0x04] }, // Normal zip
      { bytes: [0x50, 0x4B, 0x05, 0x06] }, // Empty zip
      { bytes: [0x50, 0x4B, 0x07, 0x08] }  // Spanned zip
    ]
  },
  {
    extension: '.rar',
    mimeType: 'application/vnd.rar',
    signatures: [
      { bytes: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00] }, // RAR4
      { bytes: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00] } // RAR5
    ]
  },
  {
    extension: '.7z',
    mimeType: 'application/x-7z-compressed',
    signatures: [{ bytes: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C] }]
  },

  // Documents
  {
    extension: '.pdf',
    mimeType: 'application/pdf',
    signatures: [{ bytes: [0x25, 0x50, 0x44, 0x46] }] // %PDF
  },

  // Roblox files (XML-based)
  {
    extension: '.rbxm',
    mimeType: 'application/octet-stream',
    signatures: [
      { bytes: [0x3C, 0x72, 0x6F, 0x62, 0x6C, 0x6F, 0x78] }, // <roblox (XML)
      { bytes: [0x3C, 0x3F, 0x78, 0x6D, 0x6C] } // <?xml
    ]
  },
  {
    extension: '.rbxmx',
    mimeType: 'application/octet-stream',
    signatures: [
      { bytes: [0x3C, 0x72, 0x6F, 0x62, 0x6C, 0x6F, 0x78] },
      { bytes: [0x3C, 0x3F, 0x78, 0x6D, 0x6C] }
    ]
  },
  {
    extension: '.rbxl',
    mimeType: 'application/octet-stream',
    signatures: [
      { bytes: [0x3C, 0x72, 0x6F, 0x62, 0x6C, 0x6F, 0x78] },
      { bytes: [0x3C, 0x3F, 0x78, 0x6D, 0x6C] }
    ]
  },
  {
    extension: '.rbxlx',
    mimeType: 'application/octet-stream',
    signatures: [
      { bytes: [0x3C, 0x72, 0x6F, 0x62, 0x6C, 0x6F, 0x78] },
      { bytes: [0x3C, 0x3F, 0x78, 0x6D, 0x6C] }
    ]
  },

  // Executables (to BLOCK)
  {
    extension: '.exe',
    mimeType: 'application/x-msdownload',
    signatures: [{ bytes: [0x4D, 0x5A] }] // MZ
  },
  {
    extension: '.dll',
    mimeType: 'application/x-msdownload',
    signatures: [{ bytes: [0x4D, 0x5A] }]
  },
  {
    extension: '.msi',
    mimeType: 'application/x-msi',
    signatures: [{ bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }]
  },
  {
    extension: '.bat',
    mimeType: 'application/x-msdos-program',
    signatures: [] // Text-based, check content
  },
  {
    extension: '.cmd',
    mimeType: 'application/x-msdos-program',
    signatures: []
  },
  {
    extension: '.scr',
    mimeType: 'application/x-msdownload',
    signatures: [{ bytes: [0x4D, 0x5A] }]
  },

  // Scripts that could be dangerous
  {
    extension: '.ps1',
    mimeType: 'application/x-powershell',
    signatures: []
  },
  {
    extension: '.vbs',
    mimeType: 'text/vbscript',
    signatures: []
  },
  {
    extension: '.js',
    mimeType: 'text/javascript',
    signatures: []
  },

  // macOS executables
  {
    extension: '.app',
    mimeType: 'application/x-apple-diskimage',
    signatures: []
  },
  {
    extension: '.dmg',
    mimeType: 'application/x-apple-diskimage',
    signatures: [{ bytes: [0x78, 0x01, 0x73, 0x0D, 0x62, 0x62, 0x60] }]
  },

  // Linux executables
  {
    extension: '.elf',
    mimeType: 'application/x-executable',
    signatures: [{ bytes: [0x7F, 0x45, 0x4C, 0x46] }] // .ELF
  },
  {
    extension: '.so',
    mimeType: 'application/x-sharedlib',
    signatures: [{ bytes: [0x7F, 0x45, 0x4C, 0x46] }]
  }
];

// Extensions that are always dangerous
const BLOCKED_EXTENSIONS = [
  '.exe', '.dll', '.msi', '.bat', '.cmd', '.scr',
  '.ps1', '.vbs', '.wsf', '.wsh',
  '.app', '.dmg', '.pkg',
  '.sh', '.bin', '.elf', '.so',
  '.com', '.pif', '.gadget', '.msp', '.cpl',
  '.jar', '.jnlp', '.inf', '.reg',
  '.hta', '.msc', '.lnk'
];

// Allowed extensions for seller uploads
const ALLOWED_EXTENSIONS = [
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
  // Roblox files
  '.lua', '.luau', '.rbxm', '.rbxmx', '.rbxl', '.rbxlx',
  // Archives
  '.zip', '.rar', '.7z',
  // Documents
  '.pdf', '.txt', '.md'
];

export interface MagicByteResult {
  isValid: boolean;
  detectedType: string | null;
  claimedType: string;
  isSuspicious: boolean;
  reason?: string;
}

/**
 * Read file header bytes
 */
async function readFileHeader(file: File, bytesToRead = 32): Promise<Uint8Array> {
  const slice = file.slice(0, bytesToRead);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Check if bytes match a signature
 */
function matchesSignature(header: Uint8Array, signature: MagicSignature): boolean {
  const offset = signature.offset || 0;
  
  if (header.length < offset + signature.bytes.length) {
    return false;
  }

  for (let i = 0; i < signature.bytes.length; i++) {
    const expected = signature.bytes[i];
    const actual = header[offset + i];
    const mask = signature.mask?.[i] ?? 0xFF;
    
    if ((actual & mask) !== (expected & mask)) {
      return false;
    }
  }

  return true;
}

/**
 * Detect file type from magic bytes
 */
function detectFileType(header: Uint8Array): FileTypeSignature | null {
  for (const fileType of FILE_SIGNATURES) {
    for (const signature of fileType.signatures) {
      if (matchesSignature(header, signature)) {
        return fileType;
      }
    }
  }
  return null;
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(lastDot).toLowerCase() : '';
}

/**
 * Check if extension is blocked
 */
export function isBlockedExtension(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return BLOCKED_EXTENSIONS.includes(ext);
}

/**
 * Check if extension is allowed
 */
export function isAllowedExtension(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Verify file magic bytes match claimed extension
 */
export async function verifyMagicBytes(file: File): Promise<MagicByteResult> {
  const fileName = file.name;
  const claimedExt = getFileExtension(fileName);
  
  // Check if extension is blocked
  if (isBlockedExtension(fileName)) {
    return {
      isValid: false,
      detectedType: null,
      claimedType: claimedExt,
      isSuspicious: true,
      reason: `Blocked file type: ${claimedExt}`
    };
  }

  // Read file header
  const header = await readFileHeader(file);
  const detectedType = detectFileType(header);

  // Check for executable magic bytes regardless of extension
  const executableSignatures = FILE_SIGNATURES.filter(f => 
    ['.exe', '.dll', '.msi', '.scr', '.dmg', '.elf', '.so'].includes(f.extension)
  );

  for (const execType of executableSignatures) {
    for (const sig of execType.signatures) {
      if (matchesSignature(header, sig)) {
        return {
          isValid: false,
          detectedType: execType.extension,
          claimedType: claimedExt,
          isSuspicious: true,
          reason: `Disguised executable detected: File claims to be ${claimedExt} but contains ${execType.extension} signature`
        };
      }
    }
  }

  // For text-based files (Lua, txt, md), we can't verify magic bytes
  const textExtensions = ['.lua', '.luau', '.txt', '.md'];
  if (textExtensions.includes(claimedExt)) {
    return {
      isValid: true,
      detectedType: claimedExt,
      claimedType: claimedExt,
      isSuspicious: false
    };
  }

  // If we detected a type, verify it matches the claimed extension
  if (detectedType) {
    const normalizedClaimed = claimedExt === '.jpeg' ? '.jpg' : claimedExt;
    const normalizedDetected = detectedType.extension;

    // Check if Roblox files (they share signatures)
    const robloxExts = ['.rbxm', '.rbxmx', '.rbxl', '.rbxlx'];
    if (robloxExts.includes(normalizedClaimed) && robloxExts.includes(normalizedDetected)) {
      return {
        isValid: true,
        detectedType: normalizedDetected,
        claimedType: claimedExt,
        isSuspicious: false
      };
    }

    if (normalizedClaimed !== normalizedDetected) {
      return {
        isValid: false,
        detectedType: normalizedDetected,
        claimedType: claimedExt,
        isSuspicious: true,
        reason: `File type mismatch: Claims to be ${claimedExt} but detected as ${normalizedDetected}`
      };
    }

    return {
      isValid: true,
      detectedType: normalizedDetected,
      claimedType: claimedExt,
      isSuspicious: false
    };
  }

  // No signature match - could be valid for some file types
  // For archives and images, we should have matched
  const strictTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.zip', '.rar', '.7z', '.pdf'];
  if (strictTypes.includes(claimedExt)) {
    return {
      isValid: false,
      detectedType: null,
      claimedType: claimedExt,
      isSuspicious: true,
      reason: `Could not verify ${claimedExt} file signature - file may be corrupted or misnamed`
    };
  }

  return {
    isValid: true,
    detectedType: null,
    claimedType: claimedExt,
    isSuspicious: false
  };
}

/**
 * Calculate SHA-256 hash of file
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
