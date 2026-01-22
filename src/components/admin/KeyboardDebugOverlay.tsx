import { useState, useEffect } from 'react';

/**
 * Debug overlay for iOS PWA keyboard behavior.
 * Shows visualViewport.height, window.innerHeight, and keyboard state.
 * Only visible in standalone PWA mode on iOS.
 */
export function KeyboardDebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState({
    vvHeight: 0,
    innerHeight: 0,
    keyboardOpen: false,
    vvhVar: '',
    chatVvhVar: '',
    isStandalone: false,
    isIOS: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Only show on iOS PWA or when forced via localStorage
    const forceShow = localStorage.getItem('debug-keyboard') === 'true';
    setVisible(isStandalone || forceShow);

    const update = () => {
      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? window.innerHeight;
      const innerHeight = window.innerHeight;
      const vvhVar = getComputedStyle(document.documentElement).getPropertyValue('--vvh');
      const chatVvhVar = getComputedStyle(document.documentElement).getPropertyValue('--chat-vvh');
      
      // Keyboard is open if visualViewport is significantly smaller than innerHeight
      const keyboardOpen = vvHeight < innerHeight - 100;

      setData({
        vvHeight: Math.round(vvHeight),
        innerHeight: Math.round(innerHeight),
        keyboardOpen,
        vvhVar: vvhVar.trim(),
        chatVvhVar: chatVvhVar.trim(),
        isStandalone,
        isIOS,
      });
    };

    update();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('focusin', update);
    window.addEventListener('focusout', update);

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('focusin', update);
      window.removeEventListener('focusout', update);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+3.5rem)] right-2 z-[9999] bg-black/80 text-white text-[10px] font-mono p-2 rounded-lg shadow-lg pointer-events-none">
      <div className="space-y-0.5">
        <div>vv.height: <span className="text-green-400">{data.vvHeight}px</span></div>
        <div>innerHeight: <span className="text-blue-400">{data.innerHeight}px</span></div>
        <div>--vvh: <span className="text-yellow-400">{data.vvhVar || 'not set'}</span></div>
        <div>--chat-vvh: <span className="text-orange-400">{data.chatVvhVar || 'not set'}</span></div>
        <div>
          keyboard: <span className={data.keyboardOpen ? 'text-red-400' : 'text-green-400'}>
            {data.keyboardOpen ? 'OPEN' : 'closed'}
          </span>
        </div>
        <div className="text-muted-foreground/70 pt-1 border-t border-white/20 mt-1">
          {data.isIOS ? 'iOS' : 'other'} | {data.isStandalone ? 'PWA' : 'browser'}
        </div>
      </div>
    </div>
  );
}
