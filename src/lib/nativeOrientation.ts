/**
 * Native Screen Orientation utilities for Capacitor
 * Locks the device to portrait mode at the OS level on native platforms
 */

import { Capacitor } from '@capacitor/core';

/**
 * Initialize native orientation lock on app startup
 * Safe to call on all platforms - only activates on native
 */
export async function initNativeOrientation(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[NativeOrientation] Skipping - not a native platform');
    return;
  }
  
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    
    // Lock to portrait mode
    await ScreenOrientation.lock({ orientation: 'portrait' });
    
    console.log('[NativeOrientation] Locked to portrait mode');
  } catch (error) {
    console.warn('[NativeOrientation] Failed to lock orientation:', error);
  }
}

/**
 * Lock screen to portrait mode
 */
export async function lockToPortrait(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({ orientation: 'portrait' });
  } catch (error) {
    console.warn('[NativeOrientation] Failed to lock to portrait:', error);
  }
}

/**
 * Unlock orientation to allow all orientations
 */
export async function unlockOrientation(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.unlock();
  } catch (error) {
    console.warn('[NativeOrientation] Failed to unlock orientation:', error);
  }
}

/**
 * Check if native orientation lock is supported
 */
export function isOrientationLockSupported(): boolean {
  return Capacitor.isNativePlatform();
}
