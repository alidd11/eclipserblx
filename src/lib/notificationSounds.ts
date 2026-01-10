/**
 * Notification Sound Library
 * Provides customizable sounds for different notification types
 */

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'message' | 'order';
export type SoundOption = 'default' | 'chime' | 'bell' | 'pop' | 'ding' | 'whoosh' | 'none';

export interface SoundConfig {
  label: string;
  description: string;
}

export const SOUND_OPTIONS: Record<SoundOption, SoundConfig> = {
  default: { label: 'Default', description: 'Standard notification tone' },
  chime: { label: 'Chime', description: 'Gentle chime sound' },
  bell: { label: 'Bell', description: 'Classic bell ring' },
  pop: { label: 'Pop', description: 'Quick pop sound' },
  ding: { label: 'Ding', description: 'Simple ding' },
  whoosh: { label: 'Whoosh', description: 'Soft whoosh effect' },
  none: { label: 'None', description: 'No sound' },
};

export const NOTIFICATION_TYPES: Record<NotificationType, { label: string; description: string }> = {
  success: { label: 'Success', description: 'Successful actions' },
  error: { label: 'Error', description: 'Error alerts' },
  info: { label: 'Info', description: 'General information' },
  warning: { label: 'Warning', description: 'Warning alerts' },
  message: { label: 'Messages', description: 'New chat messages' },
  order: { label: 'Orders', description: 'Order notifications' },
};

const STORAGE_KEY = 'notification_sound_preferences';

export interface SoundPreferences {
  success: SoundOption;
  error: SoundOption;
  info: SoundOption;
  warning: SoundOption;
  message: SoundOption;
  order: SoundOption;
  volume: number; // 0-100
}

const DEFAULT_PREFERENCES: SoundPreferences = {
  success: 'chime',
  error: 'bell',
  info: 'pop',
  warning: 'ding',
  message: 'default',
  order: 'bell',
  volume: 50,
};

export function getSoundPreferences(): SoundPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to parse sound preferences:', e);
  }
  return DEFAULT_PREFERENCES;
}

export function saveSoundPreferences(prefs: Partial<SoundPreferences>): void {
  const current = getSoundPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// Web Audio API sound generators
const createAudioContext = (): AudioContext | null => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
};

const playDefaultSound = (ctx: AudioContext, volume: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.3 * volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
};

const playChimeSound = (ctx: AudioContext, volume: number) => {
  const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
  
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.2 * volume, ctx.currentTime + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.4);
    
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.4);
  });
};

const playBellSound = (ctx: AudioContext, volume: number) => {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc2.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc2.frequency.setValueAtTime(1760, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.25 * volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
  
  osc.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);
  osc2.stop(ctx.currentTime + 0.6);
};

const playPopSound = (ctx: AudioContext, volume: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.4 * volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
};

const playDingSound = (ctx: AudioContext, volume: number) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.3 * volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
};

const playWhooshSound = (ctx: AudioContext, volume: number) => {
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
  
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  gain.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  source.start(ctx.currentTime);
};

export function playNotificationSound(type: NotificationType = 'info'): void {
  const prefs = getSoundPreferences();
  const soundOption = prefs[type] || 'default';
  
  // Check if sound is globally enabled
  const soundEnabled = localStorage.getItem('notification-sound-enabled') !== 'false';
  if (!soundEnabled || soundOption === 'none') return;
  
  const ctx = createAudioContext();
  if (!ctx) return;
  
  const volume = prefs.volume / 100;
  
  try {
    switch (soundOption) {
      case 'chime':
        playChimeSound(ctx, volume);
        break;
      case 'bell':
        playBellSound(ctx, volume);
        break;
      case 'pop':
        playPopSound(ctx, volume);
        break;
      case 'ding':
        playDingSound(ctx, volume);
        break;
      case 'whoosh':
        playWhooshSound(ctx, volume);
        break;
      default:
        playDefaultSound(ctx, volume);
    }
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}

export function previewSound(soundOption: SoundOption, volume: number = 50): void {
  if (soundOption === 'none') return;
  
  const ctx = createAudioContext();
  if (!ctx) return;
  
  const vol = volume / 100;
  
  try {
    switch (soundOption) {
      case 'chime':
        playChimeSound(ctx, vol);
        break;
      case 'bell':
        playBellSound(ctx, vol);
        break;
      case 'pop':
        playPopSound(ctx, vol);
        break;
      case 'ding':
        playDingSound(ctx, vol);
        break;
      case 'whoosh':
        playWhooshSound(ctx, vol);
        break;
      default:
        playDefaultSound(ctx, vol);
    }
  } catch (error) {
    console.warn('Failed to preview sound:', error);
  }
}
