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
      NSUserTrackingUsageDescription: 'This app uses tracking to show you personalized ads. Your data helps us provide relevant content and improve your experience.',
      
      // Camera - For taking profile photos/avatars
      NSCameraUsageDescription: 'World Quizzes needs camera access to take your profile photo.',
      
      // Photo Library - For selecting profile photos/avatars
      NSPhotoLibraryUsageDescription: 'World Quizzes needs photo library access to select your profile picture.',
      NSPhotoLibraryAddUsageDescription: 'World Quizzes needs permission to save images to your photo library.',
      
      // Microphone - In case of future voice features
      NSMicrophoneUsageDescription: 'World Quizzes needs microphone access for voice features.',
      
      // Face ID - For secure authentication
      NSFaceIDUsageDescription: 'World Quizzes uses Face ID for quick and secure login.',
      
      // Location - If country detection needs GPS fallback
      NSLocationWhenInUseUsageDescription: 'World Quizzes uses your location to show relevant regional content and leaderboards.',
      
      // Contacts - If friend invite features are added
      NSContactsUsageDescription: 'World Quizzes can access your contacts to help you find and invite friends to play.',
      
      // Calendars - If reminder features are added
      NSCalendarsUsageDescription: 'World Quizzes can add quiz events and reminders to your calendar.',
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
