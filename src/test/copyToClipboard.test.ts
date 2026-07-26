import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/copyToClipboard';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('uses the Clipboard API and confirms success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyToClipboard('https://example.com', 'Link copied!')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://example.com');
    expect(toast.success).toHaveBeenCalledWith('Link copied!');
  });

  it('falls back to execCommand when the Clipboard API is unavailable', async () => {
    vi.mocked(document.execCommand).mockReturnValue(true);

    await expect(copyToClipboard('fallback value')).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Copied!');
  });

  it('reports failure when neither copy mechanism succeeds', async () => {
    vi.mocked(document.execCommand).mockReturnValue(false);

    await expect(copyToClipboard('uncopyable value')).resolves.toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      'Could not copy the link. Please copy it from the address bar.',
    );
  });
});
