import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d330fb3c8e4c4ae98517806e609eff0f',
  appName: 'roleplay-hub-shop',
  webDir: 'dist',
  server: {
    // For development: connect to live Lovable sandbox for hot-reload
    url: 'https://d330fb3c-8e4c-4ae9-8517-806e609eff0f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      // Native keyboard handling - this is what makes iOS behave like iMessage
      resize: 'body',
      resizeOnFullScreen: true
    }
  },
  ios: {
    // iOS-specific settings for App Store
    contentInset: 'automatic',
    scrollEnabled: true
  },
  android: {
    // Android-specific settings for Play Store
    allowMixedContent: true
  }
};

export default config;
