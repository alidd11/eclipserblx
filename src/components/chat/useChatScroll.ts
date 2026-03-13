import { useEffect, useCallback, useRef, type RefObject } from 'react';

/**
 * Deterministic auto-scroll for chat containers.
 *
 * Replaces staggered setTimeout hacks with:
 * - MutationObserver on the scroll container (auto-scroll when children change)
 * - ResizeObserver on visualViewport (keyboard open/close)
 * - Minimal focus handler (1 rAF + 1 fallback)
 */
export function useChatScroll(
  scrollRef: RefObject<HTMLDivElement | null>,
  inputRef: RefObject<HTMLInputElement | null>,
) {
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [scrollRef]);

  // Track whether user is near bottom (within 100px)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      isNearBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  // MutationObserver: auto-scroll when content changes (new messages rendered)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number | undefined;

    const observer = new MutationObserver(() => {
      // Only auto-scroll if user was near bottom
      if (!isNearBottomRef.current) return;

      cancelAnimationFrame(rafId!);
      rafId = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });

    observer.observe(el, { childList: true, subtree: true });

    // Initial scroll
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId!);
    };
  }, [scrollRef]);

  // VisualViewport resize (keyboard open/close)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let lastHeight = vv.height;
    let timer: number | undefined;

    const handleResize = () => {
      const delta = Math.abs(vv.height - lastHeight);
      if (delta > 50) {
        lastHeight = vv.height;
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          scrollToBottom();
        }, 120);
      }
    };

    vv.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      vv.removeEventListener('resize', handleResize);
    };
  }, [scrollToBottom]);

  /** Call on input focus to keep messages pinned */
  const handleInputFocus = useCallback(() => {
    const doScroll = () => {
      scrollToBottom();
      inputRef.current?.scrollIntoView({ block: 'end', behavior: 'instant' });
    };
    requestAnimationFrame(() => {
      doScroll();
      // Single fallback after keyboard animation
      setTimeout(doScroll, 200);
    });
  }, [scrollToBottom, inputRef]);

  return { scrollToBottom, handleInputFocus };
}
