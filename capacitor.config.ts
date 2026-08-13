import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.mytrivia.app',
  appName: 'MyTrivia',
  webDir: 'dist',
  ios: {
    // Capacitor 8's own podspec sets ios.deployment_target = '15.0'. Declaring
    // 14.0 here doesn't lower that floor, it just makes `pod install` fail on
    // the mismatch.
    minVersion: '15.0',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Orientation lock and the permission usage strings live in
    // ios/App/App/Info.plist, not here. An `infoPlist` block at this spot is
    // not merged into the generated plist by `cap add` or `cap sync` — it was
    // sitting in this file describing a portrait lock and four usage strings
    // that the app never actually declared.
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
    SplashScreen: {
      // The app takes its own splash down once React has painted its first
      // route (see NativeBridge). A timer instead either uncovers a blank
      // webview or holds a still image over a ready app; both read as the app
      // being slow.
      launchAutoHide: false,
      backgroundColor: '#f8e6ff',
      showSpinner: false,
    },
  },
};

export default config;
