import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eclipserblx.admin',
  appName: 'Eclipse Admin',
  webDir: 'dist',
  server: {
    // For development: connect to live Eclipse admin route
    url: 'https://eclipserblx.com/admin/login?forceHideBadge=true',
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
