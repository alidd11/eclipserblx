import { toast } from 'sonner';

/**
 * Copy text to clipboard with a success toast.
 * Falls back gracefully when the Clipboard API is unavailable.
 *
 * @param text  The string to copy.
 * @param label Optional label for the toast, e.g. "Referral link". Defaults to "Copied!".
 */
export async function copyToClipboard(text: string, label = 'Copied!'): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text);
    toast.success(label);
    return true;
  } catch {
    // Fallback for older browsers / insecure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    try {
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      if (!copied) throw new Error('Copy command failed');
      toast.success(label);
      return true;
    } catch {
      toast.error('Could not copy the link. Please copy it from the address bar.');
      return false;
    } finally {
      textarea.remove();
    }
  }
}
