import { useCallback } from 'react';
import { toast } from 'sonner';

interface ShareData {
  title: string;
  text?: string;
  url: string;
}

/**
 * Returns a `share` function that uses the Web Share API on supported devices
 * and falls back to copying the URL to clipboard.
 */
export function useNativeShare() {
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const share = useCallback(async ({ title, text, url }: ShareData) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err: any) {
        // User cancelled — not an error
        if (err?.name === 'AbortError') return;
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      } catch {
        // Fallback for very old browsers
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        toast.success('Link copied to clipboard');
      }
    }
  }, []);

  return { share, canNativeShare: canShare };
}
