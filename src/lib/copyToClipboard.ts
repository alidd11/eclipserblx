import { toast } from 'sonner';

/**
 * Copy text to clipboard with a success toast.
 * Falls back gracefully when the Clipboard API is unavailable.
 *
 * @param text  The string to copy.
 * @param label Optional label for the toast, e.g. "Referral link". Defaults to "Copied!".
 */
export async function copyToClipboard(text: string, label = 'Copied!'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    // Fallback for older browsers / insecure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    toast.success(label);
  }
}
