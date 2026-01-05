import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f54c9281c7aa40a48ea74b75d0ffa3d4',
  appName: 'flutter-native-play',
  webDir: 'dist',
  server: {
    // Enable hot-reload from Lovable sandbox during development
    url: 'https://f54c9281-c7aa-40a4-8ea7-4b75d0ffa3d4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    // Required for AdMob
    contentInset: 'automatic',
  },
  plugins: {
    // AdMob configuration
    AdMob: {
      appId: 'ca-app-pub-1329033152352928~1190114462',
    },
  },
};

export default config;
