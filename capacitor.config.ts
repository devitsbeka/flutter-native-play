import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.mytrivia.app',
  appName: 'MyTrivia',
  webDir: 'dist',
  ios: {
    minVersion: '14.0',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    infoPlist: {
      // Lock orientation to portrait only
      UISupportedInterfaceOrientations: ['UIInterfaceOrientationPortrait'],
      'UISupportedInterfaceOrientations~ipad': ['UIInterfaceOrientationPortrait'],
      
      // App Tracking Transparency (iOS 14.5+) - Required for AdMob
      NSUserTrackingUsageDescription: 'This identifier will be used to deliver personalized ads to you.',
      
      // Camera - For taking profile photos/avatars
      NSCameraUsageDescription: 'Take your profile photo',
      
      // Photo Library - For selecting profile photos/avatars
      NSPhotoLibraryUsageDescription: 'Select your profile picture',
      NSPhotoLibraryAddUsageDescription: 'Save images from the app',
    },
  },
  android: {
    // Note: screenOrientation must be set manually in AndroidManifest.xml
    overrideUserAgent: 'MyTrivia Android App',
  },
  plugins: {
    // AdMob configuration
    AdMob: {
      appId: 'ca-app-pub-1329033152352928~1190114462',
    },
  },
};

export default config;
