import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface NativeAppInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Hook to detect if running inside Capacitor native app
 * Use this to enable native-only features or disable PWA workarounds
 */
export function useNativeApp(): NativeAppInfo {
  const [info, setInfo] = useState<NativeAppInfo>(() => detectNativeApp());

  useEffect(() => {
    setInfo(detectNativeApp());
  }, []);

  return info;
}

function detectNativeApp(): NativeAppInfo {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  
  return {
    isNative,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    platform,
  };
}

/**
 * Utility function (non-hook) for use outside React components
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the native platform
 */
export function getNativePlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
