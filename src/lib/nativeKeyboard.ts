/**
 * Native Keyboard utilities for Capacitor
 * When running in native mode, Capacitor handles keyboard automatically
 * This module provides helpers for keyboard-related functionality
 */

import { Capacitor } from '@capacitor/core';

let keyboardPlugin: any = null;

/**
 * Initialize the Capacitor Keyboard plugin
 * Safe to call multiple times - will only initialize once
 */
export async function initNativeKeyboard(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    keyboardPlugin = Keyboard;
    
    // Configure keyboard behavior
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
    
    console.log('[NativeKeyboard] Initialized successfully');
  } catch (error) {
    console.warn('[NativeKeyboard] Failed to initialize:', error);
  }
}

/**
 * Add keyboard show/hide listeners
 */
export async function addKeyboardListeners(
  onShow?: (height: number) => void,
  onHide?: () => void
): Promise<() => void> {
  if (!Capacitor.isNativePlatform() || !keyboardPlugin) {
    return () => {};
  }
  
  const { Keyboard } = await import('@capacitor/keyboard');
  
  const showHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
    onShow?.(info.keyboardHeight);
  });
  
  const hideHandle = await Keyboard.addListener('keyboardWillHide', () => {
    onHide?.();
  });
  
  return () => {
    showHandle.remove();
    hideHandle.remove();
  };
}

/**
 * Programmatically hide the keyboard
 */
export async function hideKeyboard(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.hide();
  } catch (error) {
    console.warn('[NativeKeyboard] Failed to hide keyboard:', error);
  }
}

/**
 * Check if we should use native keyboard handling
 * Returns true when in Capacitor native mode
 */
export function shouldUseNativeKeyboard(): boolean {
  return Capacitor.isNativePlatform();
}
