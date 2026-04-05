import { useEffect } from 'react';

interface IOSChatKeyboardOptions {
  closedSafeBottom?: string;
  openSafeBottom?: string;
}

const isTextInput = (el: Element | null): el is HTMLElement => {
  if (!el || !(el instanceof HTMLElement)) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.isContentEditable
  );
};

/**
 * Manages iOS PWA visual-viewport keyboard handling for chat-like pages.
 * Sets CSS custom properties --chat-vvh and --chat-safe-bottom on <html>.
 */
export function useIOSChatKeyboard(
  active: boolean,
  options: IOSChatKeyboardOptions = {},
) {
  const {
    closedSafeBottom = 'env(safe-area-inset-bottom)',
    openSafeBottom = '4px',
  } = options;

  useEffect(() => {
    const html = document.documentElement;

    if (!active) {
      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
      return;
    }

    const vv = window.visualViewport;
    const getViewportHeight = () => vv?.height ?? window.innerHeight;
    let baseHeight = getViewportHeight();
    let settleTimer: number | undefined;

    const applyState = (keyboardOpen: boolean, viewportHeight: number) => {
      html.style.setProperty('--chat-vvh', `${viewportHeight}px`);
      html.style.setProperty(
        '--chat-safe-bottom',
        keyboardOpen ? openSafeBottom : closedSafeBottom,
      );
      html.dataset.chatKeyboard = keyboardOpen ? 'open' : 'closed';
    };

    const update = () => {
      const viewportHeight = getViewportHeight();
      const inputFocused = isTextInput(document.activeElement);

      if (!inputFocused) {
        baseHeight = Math.max(baseHeight, viewportHeight);
      }

      const keyboardOpen = inputFocused && baseHeight - viewportHeight > 80;
      applyState(keyboardOpen, viewportHeight);
    };

    const queueSettleUpdate = (delay: number) => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(update, delay);
    };

    const handleFocusIn = () => {
      if (!isTextInput(document.activeElement)) return;
      applyState(true, getViewportHeight());
      requestAnimationFrame(update);
      queueSettleUpdate(180);
    };

    const handleFocusOut = () => {
      requestAnimationFrame(update);
      queueSettleUpdate(160);
    };

    applyState(false, getViewportHeight());
    requestAnimationFrame(update);

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
    };
  }, [active, closedSafeBottom, openSafeBottom]);
}
