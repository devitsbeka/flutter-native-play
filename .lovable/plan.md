
# Lock App Screen Orientation (Portrait Only)

## Overview

To prevent the app from rotating when the device is rotated, we need to lock the orientation to portrait mode. This requires changes at multiple levels:

1. **Capacitor config** - For native iOS/Android apps
2. **Web manifest** - For PWA/browser
3. **CSS fallback** - As a visual safeguard

---

## Technical Changes

### 1. Update Capacitor Config (`capacitor.config.ts`)

Add iOS and Android orientation settings to lock to portrait mode:

```typescript
ios: {
  minVersion: '14.0',
  contentInset: 'automatic',
  preferredContentMode: 'mobile',
  infoPlist: {
    // Lock orientation to portrait
    UISupportedInterfaceOrientations: ['UIInterfaceOrientationPortrait'],
    'UISupportedInterfaceOrientations~ipad': ['UIInterfaceOrientationPortrait'],
    // ... existing entries
  },
},
android: {
  // Lock to portrait mode
  overrideUserAgent: 'MyTrivia Android App',
},
```

### 2. Native Platform Files (Manual Steps)

After syncing, you'll need to manually verify these settings in the native projects:

**iOS** (`ios/App/App/Info.plist`):
- `UISupportedInterfaceOrientations` should only contain `UIInterfaceOrientationPortrait`

**Android** (`android/app/src/main/AndroidManifest.xml`):
- Add `android:screenOrientation="portrait"` to the main activity

### 3. Add Web App Manifest for PWA (`public/manifest.json`)

Create or update the web manifest to specify portrait orientation:

```json
{
  "name": "MyTrivia",
  "short_name": "MyTrivia",
  "orientation": "portrait",
  "display": "standalone",
  ...
}
```

### 4. Update `index.html`

Link the manifest and add orientation meta tag:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="screen-orientation" content="portrait" />
```

### 5. CSS Fallback (`src/index.css`)

Add a visual safeguard that shows a "please rotate" message if somehow landscape is detected:

```css
@media screen and (orientation: landscape) and (max-height: 500px) {
  body::before {
    content: "Please rotate your device to portrait mode";
    position: fixed;
    inset: 0;
    background: hsl(var(--background));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    font-size: 1.25rem;
    text-align: center;
    padding: 2rem;
  }
}
```

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `capacitor.config.ts` | Modify | Add iOS orientation lock settings |
| `public/manifest.json` | Create | Web app manifest with portrait orientation |
| `index.html` | Modify | Link manifest, add orientation meta |
| `src/index.css` | Modify | Add landscape fallback warning |

---

## Post-Implementation Steps

After implementation, you need to:

1. Run `npx cap sync` to apply Capacitor changes
2. **For iOS**: Open Xcode, go to target → General → Deployment Info → check only "Portrait"
3. **For Android**: Edit `AndroidManifest.xml` to add `android:screenOrientation="portrait"` to the MainActivity

This ensures the app stays in portrait mode on both native platforms and web/PWA.
