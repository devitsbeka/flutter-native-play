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
    // AdMob. App ids are per platform, and this key can only hold one — so
    // it carries the iOS id, which is the only platform this repo builds.
    //
    // iOS does not read it. The Google Mobile Ads SDK takes
    // GADApplicationIdentifier from Info.plist, and it used to hold the
    // *Android* app id: same publisher, different platform. Recent SDK
    // versions raise on an app id that does not resolve to an iOS app, which
    // is a crash on launch before the app paints — the first thing a reviewer
    // would have hit.
    //
    // Adding an Android target means putting its own id in AndroidManifest,
    // not changing this one.
    AdMob: {
      appId: 'ca-app-pub-3462589915085372~1525220642',
    },
    SplashScreen: {
      // The app takes its own splash down once React has painted its first
      // route (see NativeBridge). A timer instead either uncovers a blank
      // webview or holds a still image over a ready app; both read as the app
      // being slow.
      launchAutoHide: false,
      // Matches `html` in index.css, APP_BACKGROUND in nativeShell.ts and the
      // LaunchScreen storyboard. It was #f8e6ff — the lavender from
      // index.html's theme-color — so the launch went white, then lavender,
      // then the app's cream wash: three colours before the first frame.
      backgroundColor: '#fbfaf8',
      showSpinner: false,
    },
  },
};

export default config;
