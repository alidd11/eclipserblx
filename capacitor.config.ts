import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d330fb3c8e4c4ae98517806e609eff0f.admin',
  appName: 'Eclipse Admin',
  webDir: 'dist',
  server: {
    // For development: connect to live Lovable sandbox admin route
    url: 'https://d330fb3c-8e4c-4ae9-8517-806e609eff0f.lovableproject.com/admin/login?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      // Native keyboard handling - true iMessage-like behavior
      resize: 'body',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#09090b' // matches admin theme
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#09090b',
      showSpinner: false
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    scheme: 'Eclipse Admin'
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#09090b'
  }
};

export default config;
