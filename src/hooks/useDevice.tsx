import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

interface DeviceState {
  // Breakpoints
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  // PWA
  isStandalone: boolean;
  // Platform
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isMacOS: boolean;
  isWindows: boolean;
  // Capabilities
  supportsApplePay: boolean;
  supportsGooglePay: boolean;
  // Keyboard
  isKeyboardVisible: boolean;
  // Accessibility
  prefersReducedMotion: boolean;
}

const defaults: DeviceState = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isStandalone: false,
  isIOS: false,
  isAndroid: false,
  isSafari: false,
  isMacOS: false,
  isWindows: false,
  supportsApplePay: false,
  supportsGooglePay: false,
  isKeyboardVisible: false,
  prefersReducedMotion: false,
};

const DeviceContext = createContext<DeviceState>(defaults);

function detectPlatform() {
  if (typeof navigator === 'undefined') return { isIOS: false, isAndroid: false, isSafari: false, isMacOS: false, isWindows: false };
  const ua = navigator.userAgent;
  const plat = navigator.platform;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (plat === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMacOS = /Mac/.test(plat) && !isIOS;
  const isWindows = /Win/.test(plat);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return { isIOS, isAndroid, isSafari, isMacOS, isWindows };
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function getBreakpoint(width: number) {
  return {
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
  };
}

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [platform] = useState(detectPlatform);
  const [standalone] = useState(detectStandalone);
  const [breakpoint, setBreakpoint] = useState(() => getBreakpoint(typeof window !== 'undefined' ? window.innerWidth : 1200));
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Breakpoint listener
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const tql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const update = () => setBreakpoint(getBreakpoint(window.innerWidth));
    mql.addEventListener('change', update);
    tql.addEventListener('change', update);
    update();
    return () => {
      mql.removeEventListener('change', update);
      tql.removeEventListener('change', update);
    };
  }, []);

  // Keyboard visibility via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let baseHeight = vv.height;
    const handleResize = () => {
      const active = document.activeElement as HTMLElement | null;
      const isText = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true');
      if (!isText) baseHeight = Math.max(baseHeight, vv.height);
      setIsKeyboardVisible(isText && baseHeight - vv.height > 80);
    };
    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  // Reduced motion listener
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReducedMotion(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const value = useMemo<DeviceState>(() => ({
    ...breakpoint,
    isStandalone: standalone,
    ...platform,
    supportsApplePay: platform.isIOS || (platform.isMacOS && platform.isSafari),
    supportsGooglePay: platform.isAndroid,
    isKeyboardVisible,
    prefersReducedMotion,
  }), [breakpoint, standalone, platform, isKeyboardVisible, prefersReducedMotion]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceState {
  return useContext(DeviceContext);
}
