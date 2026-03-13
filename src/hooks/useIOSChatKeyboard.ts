import { useEffect } from 'react';

/**
 * Manages iOS PWA visual-viewport keyboard handling for chat-like pages.
 * Sets CSS custom properties --chat-vvh and --chat-safe-bottom on <html>.
 *
 * Simplified: single resize listener, no staggered timeouts.
 */
export function useIOSChatKeyboard(active: boolean) {
  useEffect(() => {
    const html = document.documentElement;

    if (!active) {
      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
      return;
    }

    html.style.setProperty('--chat-safe-bottom', 'env(safe-area-inset-bottom)');
    html.style.setProperty('--chat-vvh', '100dvh');
    html.dataset.chatKeyboard = 'closed';

    const vv = window.visualViewport;
    if (!vv) return;

    let baseHeight = vv.height;

    const update = () => {
      const vvHeight = vv.height;
      const activeEl = document.activeElement;
      const isInputFocused =
        !!activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (!isInputFocused) baseHeight = Math.max(baseHeight, vvHeight);

      const keyboardOpen = isInputFocused && baseHeight - vvHeight > 80;

      html.style.setProperty('--chat-vvh', `${vvHeight}px`);
      html.style.setProperty(
        '--chat-safe-bottom',
        keyboardOpen ? '8px' : 'calc(env(safe-area-inset-bottom) + 4px)',
      );
      html.dataset.chatKeyboard = keyboardOpen ? 'open' : 'closed';
    };

    vv.addEventListener('resize', update);

    return () => {
      vv.removeEventListener('resize', update);
      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
    };
  }, [active]);
}
