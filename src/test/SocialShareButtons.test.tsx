import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SocialShareButtons } from '@/components/product/SocialShareButtons';
import { copyToClipboard } from '@/lib/copyToClipboard';

vi.mock('@/lib/copyToClipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

function renderShareButtons() {
  return render(
    <TooltipProvider>
      <SocialShareButtons
        productIdentifier={57}
        title="Fire Hose System"
        description="A realistic firefighting system"
      />
    </TooltipProvider>,
  );
}

describe('SocialShareButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
  });

  it('exposes a prominent accessible copy-link action using the preview domain', () => {
    renderShareButtons();

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(copyToClipboard).toHaveBeenCalledWith(
      'https://share.eclipserblx.com/products/57',
      'Product link copied!',
    );
    expect(screen.getByRole('group', { name: 'Share this product' })).toBeInTheDocument();
  });

  it('uses the branded preview URL for native sharing', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });
    renderShareButtons();

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(share).toHaveBeenCalledWith({
      title: 'Fire Hose System',
      text: 'A realistic firefighting system',
      url: 'https://share.eclipserblx.com/products/57',
    }));
  });

  it('copies the branded preview URL when native sharing is unavailable', async () => {
    renderShareButtons();

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(
      'https://share.eclipserblx.com/products/57',
      'Product link copied!',
    ));
  });
});
