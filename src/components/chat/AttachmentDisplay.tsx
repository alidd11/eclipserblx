import { memo } from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Paperclip, ImageIcon, FileText, Loader2 } from 'lucide-react';

interface AttachmentDisplayProps {
  url: string;
  bucket: string;
  /** Optional custom className for the container */
  className?: string;
  /** Max width for image preview */
  maxImageWidth?: string;
  /** Max height for image preview */
  maxImageHeight?: string;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url);
}

function getFileName(url: string): string {
  try {
    const path = url.split('?')[0];
    return path.split('/').pop() || 'Attachment';
  } catch {
    return 'Attachment';
  }
}

/**
 * Renders a chat/ticket attachment with signed URL resolution.
 * Handles both images (with preview) and files (with download link).
 * Works with both old public URLs and new path-based storage.
 */
export const AttachmentDisplay = memo(function AttachmentDisplay({
  url,
  bucket,
  className = '',
  maxImageWidth = '200px',
  maxImageHeight = '200px',
}: AttachmentDisplayProps) {
  const signedUrl = useSignedUrl(url, bucket);

  if (!signedUrl) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading attachment...</span>
      </div>
    );
  }

  if (isImageUrl(url)) {
    return (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer" className={className}>
        <ImageIcon className="h-3 w-3 inline mr-1" />
        <img
          src={signedUrl}
          alt="attachment"
          className="mt-1 rounded border object-cover"
          style={{ maxWidth: maxImageWidth, maxHeight: maxImageHeight }}
        />
      </a>
    );
  }

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 text-xs underline hover:opacity-80 ${className}`}
    >
      <FileText className="h-4 w-4 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{getFileName(url)}</span>
    </a>
  );
});
