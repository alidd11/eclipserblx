/**
 * Haptic feedback utilities for native mobile feel
 * Uses the Vibration API where available
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10], // Quick double tap
  error: [50, 100, 50, 100, 50], // Error pattern
};

/**
 * Trigger haptic feedback if available
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  // Check if Vibration API is available
  if (!('vibrate' in navigator)) return;

  try {
    const pattern = HAPTIC_PATTERNS[type];
    navigator.vibrate(pattern);
  } catch (e) {
    // Silently fail if vibration is not supported or blocked
    console.debug('Haptic feedback not available:', e);
  }
}

/**
 * Quick light tap - ideal for button presses and message sends
 */
export function hapticTap(): void {
  triggerHaptic('light');
}

/**
 * Success feedback - for completed actions
 */
export function hapticSuccess(): void {
  triggerHaptic('success');
}

/**
 * Error feedback - for failed actions
 */
export function hapticError(): void {
  triggerHaptic('error');
}
