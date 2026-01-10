import { useState, useEffect } from 'react';

interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isMacOS: boolean;
  isWindows: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isSafari: boolean;
  supportsApplePay: boolean;
  supportsGooglePay: boolean;
  platformName: 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';
}

export function usePlatform(): PlatformInfo {
  const [platform, setPlatform] = useState<PlatformInfo>(() => detectPlatform());

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return platform;
}

function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return getDefaultPlatform();
  }

  const ua = navigator.userAgent;
  const platform = navigator.platform;

  // iOS detection (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Android detection
  const isAndroid = /Android/.test(ua);

  // macOS detection (non-touch Mac)
  const isMacOS = /Mac/.test(platform) && !isIOS;

  // Windows detection
  const isWindows = /Win/.test(platform);

  // Safari detection
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // Mobile vs Desktop
  const isMobile = isIOS || isAndroid || /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isDesktop = !isMobile;

  // Apple Pay support (iOS or macOS with Safari)
  const supportsApplePay = isIOS || (isMacOS && isSafari);

  // Google Pay support (Android primarily, but also available on Chrome desktop)
  const supportsGooglePay = isAndroid;

  // Platform name
  let platformName: PlatformInfo['platformName'] = 'unknown';
  if (isIOS) platformName = 'ios';
  else if (isAndroid) platformName = 'android';
  else if (isMacOS) platformName = 'macos';
  else if (isWindows) platformName = 'windows';
  else if (/Linux/.test(platform)) platformName = 'linux';

  return {
    isIOS,
    isAndroid,
    isMacOS,
    isWindows,
    isMobile,
    isDesktop,
    isSafari,
    supportsApplePay,
    supportsGooglePay,
    platformName,
  };
}

function getDefaultPlatform(): PlatformInfo {
  return {
    isIOS: false,
    isAndroid: false,
    isMacOS: false,
    isWindows: false,
    isMobile: false,
    isDesktop: true,
    isSafari: false,
    supportsApplePay: false,
    supportsGooglePay: false,
    platformName: 'unknown',
  };
}
