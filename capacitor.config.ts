import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f54c9281c7aa40a48ea74b75d0ffa3d4',
  appName: 'World Quizzes',
  webDir: 'dist',
  // PRODUCTION: Comment out this server block before building for TestFlight/App Store
  // server: {
  //   url: 'https://f54c9281-c7aa-40a4-8ea7-4b75d0ffa3d4.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  ios: {
    contentInset: 'automatic',
    infoPlist: {
      // App Tracking Transparency (iOS 14.5+) - Required for AdMob
      NSUserTrackingUsageDescription: 'This identifier will be used to deliver personalized ads to you.',
      
      // Camera - For taking profile photos/avatars
      NSCameraUsageDescription: 'Take your profile photo',
      
      // Photo Library - For selecting profile photos/avatars
      NSPhotoLibraryUsageDescription: 'Select your profile picture',
      NSPhotoLibraryAddUsageDescription: 'Save images from the app',
    },
  },
  plugins: {
    // AdMob configuration
    AdMob: {
      appId: 'ca-app-pub-1329033152352928~1190114462',
    },
  },
};

export default config;
