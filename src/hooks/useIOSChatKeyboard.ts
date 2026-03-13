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
    let baseHeight = vv?.height ?? window.innerHeight;
    let blurTimer: number | undefined;

    const applyState = (keyboardOpen: boolean, viewportHeight: number) => {
      html.style.setProperty('--chat-vvh', `${viewportHeight}px`);
      html.style.setProperty(
        '--chat-safe-bottom',
        keyboardOpen ? openSafeBottom : closedSafeBottom,
      );
      html.dataset.chatKeyboard = keyboardOpen ? 'open' : 'closed';
    };

    const update = () => {
      const viewportHeight = vv?.height ?? window.innerHeight;
      const inputFocused = isTextInput(document.activeElement);

      if (!inputFocused) {
        baseHeight = Math.max(baseHeight, viewportHeight);
      }

      const keyboardOpen = inputFocused && baseHeight - viewportHeight > 80;
      applyState(keyboardOpen, viewportHeight);
    };

    const handleFocusIn = () => {
      if (!isTextInput(document.activeElement)) return;
      applyState(true, vv?.height ?? window.innerHeight);
      requestAnimationFrame(update);
    };

    const handleFocusOut = () => {
      window.clearTimeout(blurTimer);
      requestAnimationFrame(update);
      blurTimer = window.setTimeout(update, 120);
    };

    applyState(false, vv?.height ?? window.innerHeight);
    requestAnimationFrame(update);

    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    return () => {
      window.clearTimeout(blurTimer);
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
