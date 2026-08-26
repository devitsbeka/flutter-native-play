> **SUPERSEDED — do not work from this file.**
>
> This checklist is from January 2026 and several of its P0 items now argue
> for undoing deliberate, working decisions (`.env` is tracked on purpose —
> `AGENTS.md` §5; the minimum deployment target and the privacy manifest have
> long existed). The living document is **`docs/IOS_APP_REVIEW_AUDIT.md`** —
> four audit passes and a consolidated action ledger, kept current through
> submission. This file stays only as a historical record.

# Mobile App Pre-Launch Checklist

**App Name:** World Quizzes (MyTrivia)
**Platform:** React/TypeScript + Capacitor (iOS & Android)
**Backend:** Supabase (PostgreSQL + Auth + Realtime)
**Last Updated:** January 2026

---

## Priority Levels

| Priority | Description | Timeline |
|----------|-------------|----------|
| **P0** | Critical blockers - App will be rejected or crash | Must fix before submission |
| **P1** | High priority - Severe issues affecting functionality/compliance | Must fix before submission |
| **P2** | Medium priority - Important for production quality | Should fix before submission |
| **P3** | Low priority - Improvements and optimizations | Can fix post-launch |
| **P4** | Nice to have - Enhancement opportunities | Future consideration |
| **P5** | Technical debt - Long-term improvements | Backlog items |

---

## P0 - Critical Blockers

### Security - Credentials Exposure

- [ ] **Remove `.env` from git history and add to `.gitignore`**
  - **File:** `/.env`
  - **Issue:** Supabase credentials are committed to git repository
  - **Action:**
    1. Add `.env` and `.env.local` to `.gitignore`
    2. Use `git filter-branch` or BFG Repo-Cleaner to remove from history
    3. Rotate Supabase keys in dashboard
    4. Use `.env.local` for local development (never commit)

- [ ] **Move RevenueCat API keys to backend**
  - **File:** `/src/hooks/useInAppPurchases.ts`
  - **Issue:** RevenueCat API keys exposed in frontend code
  - **Action:** Create Supabase Edge Function to handle purchase verification, never expose keys in client

- [ ] **Secure Supabase Edge Functions**
  - **File:** `/supabase/config.toml`
  - **Issue:** 30+ Edge Functions have `verify_jwt = false`, allowing unauthenticated access
  - **Critical Functions to Secure:**
    - `generate-country-trivia`
    - `generate-category-trivia`
    - `parse-quiz-url`
    - `parse-text-content`
    - Any function that modifies data or incurs API costs
  - **Action:** Set `verify_jwt = true` for all functions that should require authentication

### iOS Configuration

- [ ] **Set minimum iOS deployment target**
  - **File:** `/capacitor.config.ts`
  - **Issue:** No minimum iOS version specified (App Store requires explicit declaration)
  - **Action:** Add `minVersion: '14.0'` to iOS config (or 15.0 for modern features)
  ```typescript
  ios: {
    minVersion: '14.0',
    // ... rest of config
  }
  ```

- [ ] **Configure iOS code signing**
  - **Location:** Xcode project settings
  - **Required Items:**
    - Apple Developer account enrolled ($99/year)
    - App ID registered in Apple Developer Portal
    - Distribution Certificate created and downloaded
    - App Store Provisioning Profile created
    - Code signing configured in Xcode

- [ ] **Add iOS Privacy Manifest (PrivacyInfo.xcprivacy)**
  - **Location:** `/ios/App/App/PrivacyInfo.xcprivacy`
  - **Issue:** Required by Apple since iOS 17 for apps using tracking/advertising SDKs
  - **Action:** Create privacy manifest declaring:
    - Data collection practices
    - Tracking domains
    - API usage reasons (UserDefaults, File timestamp, System boot time, Disk space)

- [ ] **Verify AdMob iOS SDK compliance**
  - **Issue:** AdMob requires specific App Transport Security exceptions
  - **Action:** Verify `Info.plist` has proper ATS configuration for ad networks

### Android Configuration

- [ ] **Set Android SDK versions**
  - **File:** `/android/app/build.gradle` (needs creation after `npx cap add android`)
  - **Issue:** No SDK versions configured
  - **Required Settings:**
  ```gradle
  android {
      compileSdkVersion 34
      defaultConfig {
          minSdkVersion 24
          targetSdkVersion 34
          // ...
      }
  }
  ```
  - **Note:** Google Play requires `targetSdkVersion 34` for new apps (August 2024+)

- [ ] **Create Android keystore for signing**
  - **Issue:** No release signing configuration exists
  - **Action:**
    1. Generate keystore: `keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias app-alias`
    2. Store keystore securely (NOT in git)
    3. Configure signing in `build.gradle`
    4. Document keystore password in secure location (losing this = losing app)

- [ ] **Add Google Play App Signing**
  - **Issue:** Required for Play Store distribution
  - **Action:** Enroll in Play App Signing when creating app listing

- [ ] **Add required Android permissions to AndroidManifest.xml**
  - **File:** `/android/app/src/main/AndroidManifest.xml`
  - **Required Permissions:**
  ```xml
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="com.google.android.gms.permission.AD_ID" />
  ```

### App Store Metadata (Both Platforms)

- [ ] **Create required screenshots**
  - **iOS Required:**
    - iPhone 6.9" (1320 x 2868 or 1290 x 2796) - minimum 3
    - iPhone 6.5" (1284 x 2778 or 1242 x 2688) - minimum 3
    - iPad Pro 12.9" (2048 x 2732) - minimum 2 if supporting iPad
  - **Android Required:**
    - Phone screenshots (16:9 ratio, min 320px, max 3840px) - minimum 2
    - 7-inch tablet (optional but recommended)
    - 10-inch tablet (optional but recommended)

- [ ] **Create app icon assets**
  - **Current:** Single 1024x1024 icon exists at `/public/app-icon-1024.png`
  - **iOS Required:** Full icon set in Xcode Assets.xcassets
  - **Android Required:** Adaptive icon with foreground/background layers
  - **Action:** Use tool like `capacitor-assets` or manually create all sizes

- [ ] **Prepare store listing content**
  - **Required for both stores:**
    - App name (30 chars iOS / 50 chars Android)
    - Short description (80 chars Android only)
    - Full description (4000 chars max)
    - Keywords (100 chars iOS only)
    - Category selection
    - Content rating questionnaire completion
    - Privacy policy URL (exists: `/privacy-policy-en`)

---

## P1 - High Priority

### Security

- [ ] **Replace localStorage session storage with secure alternatives**
  - **File:** `/src/integrations/supabase/client.ts`
  - **Issue:** JWT tokens stored in localStorage are vulnerable to XSS attacks
  - **Current Code:**
  ```typescript
  auth: {
    storage: localStorage,
    persistSession: true,
  }
  ```
  - **Action:** For web, use HttpOnly cookies. For native (Capacitor), use:
    - iOS: Keychain via `@capacitor/preferences` with `secure: true`
    - Android: EncryptedSharedPreferences

- [ ] **Restrict CORS on Edge Functions**
  - **Files:** All files in `/supabase/functions/*/index.ts`
  - **Issue:** CORS set to `Access-Control-Allow-Origin: "*"` allows any domain
  - **Action:** Restrict to your app's domains:
  ```typescript
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://yourdomain.com",
    // Or for Capacitor: "capacitor://localhost", "http://localhost"
  };
  ```

- [ ] **Add rate limiting to authentication endpoints**
  - **Issue:** No visible rate limiting on login/signup attempts
  - **Action:** Implement rate limiting in Supabase Edge Functions or use Supabase's built-in rate limiting

- [ ] **Implement certificate pinning for API calls**
  - **Issue:** No SSL pinning - vulnerable to MITM attacks
  - **Action:** Use Capacitor plugin for certificate pinning on critical API endpoints

- [ ] **Audit data export function for PII**
  - **File:** `/supabase/functions/export-user-data/index.ts`
  - **Issue:** Exports all user data including sensitive information without sanitization
  - **Action:** Review exported fields, consider anonymizing or excluding sensitive data

### Database

- [ ] **Enable Row Level Security (RLS) on all tables**
  - **Location:** Supabase Dashboard > Database > Tables
  - **Action:** Verify RLS is enabled and policies are correctly configured for all 44+ tables
  - **Critical Tables to Verify:**
    - `profiles` - users can only read/write their own
    - `game_sessions` - users can only access their own sessions
    - `chat_messages` - users can only see messages they sent/received
    - `purchase_transactions` - users can only see their purchases
    - `vip_subscriptions` - users can only see their subscriptions

- [ ] **Add database indexes for performance**
  - **Issue:** Some frequently queried columns may lack indexes
  - **Action:** Add indexes for:
    - `questions.category_id` (if not indexed)
    - `profiles.user_id` (should be indexed by FK)
    - `game_sessions.player_id`
    - `room_participants.room_id`

- [ ] **Configure database backups**
  - **Location:** Supabase Dashboard > Settings > Database
  - **Action:** Verify automatic backups are enabled (Pro plan required for PITR)

### iOS Specific

- [ ] **Declare Push Notification capability**
  - **Location:** Xcode > Signing & Capabilities
  - **Issue:** Push notifications implemented but capability may not be declared
  - **Action:** Add "Push Notifications" capability in Xcode

- [ ] **Configure Apple Sign-In capability**
  - **Location:** Xcode > Signing & Capabilities
  - **Issue:** Apple Sign-In used but capability must be declared
  - **Action:** Add "Sign in with Apple" capability

- [ ] **Test App Tracking Transparency flow**
  - **File:** `/src/services/trackingService.ts`
  - **Action:** Verify ATT prompt appears correctly on iOS 14.5+ before any tracking

### Android Specific

- [ ] **Add ProGuard rules for release builds**
  - **File:** `/android/app/proguard-rules.pro`
  - **Action:** Add rules to prevent obfuscation of:
    - Supabase classes
    - RevenueCat classes
    - AdMob classes
    - Any classes used in reflection

- [ ] **Configure network security**
  - **File:** `/android/app/src/main/res/xml/network_security_config.xml`
  - **Action:** Create config to control cleartext traffic and certificate trust

- [ ] **Add AdMob meta-data to AndroidManifest**
  - **File:** `/android/app/src/main/AndroidManifest.xml`
  - **Required:**
  ```xml
  <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-1329033152352928~1190114462"/>
  ```

### Compliance

- [ ] **Complete iOS App Privacy Details**
  - **Location:** App Store Connect > App Privacy
  - **Required Declarations:**
    - Data types collected (identifiers, usage data, etc.)
    - Data linked to user identity
    - Data used for tracking
    - Third-party data sharing (AdMob, Supabase, RevenueCat)

- [ ] **Complete Google Play Data Safety form**
  - **Location:** Google Play Console > App content > Data safety
  - **Required Declarations:**
    - Data collection practices
    - Data sharing practices
    - Security practices
    - Data deletion options (account deletion exists)

- [ ] **Verify GDPR compliance**
  - **Current:** Privacy policy exists at `/privacy-policy-en`
  - **Action:** Verify policy covers:
    - Data collection purposes
    - Third-party sharing (Supabase, AdMob, RevenueCat)
    - User rights (access, deletion, portability)
    - Data retention periods
    - Contact information for data requests

- [ ] **Verify COPPA compliance (if applicable)**
  - **Issue:** If app targets children under 13, additional requirements apply
  - **Action:** Determine target age rating and implement appropriate restrictions

---

## P2 - Medium Priority

### Codebase Quality

- [ ] **Fix N+1 query issues**
  - **File:** `/PERFORMANCE_ANALYSIS.md` identifies issues
  - **Issue:** Sequential queries in loops causing performance degradation
  - **Action:** Batch queries, use joins, or implement DataLoader pattern

- [ ] **Add error boundary components**
  - **Issue:** Uncaught errors may crash the entire app
  - **Action:** Wrap major routes/features in React Error Boundaries
  ```tsx
  <ErrorBoundary fallback={<ErrorFallback />}>
    <GameScreen />
  </ErrorBoundary>
  ```

- [ ] **Implement proper error logging**
  - **Issue:** No centralized error tracking visible
  - **Action:** Integrate error tracking service (Sentry, Bugsnag, or similar)

- [ ] **Add app version tracking**
  - **Issue:** No visible app version in code for tracking
  - **Action:**
    1. Add version to `package.json`
    2. Display version in app settings
    3. Send version with API calls for debugging

- [ ] **Clean up unused dependencies**
  - **File:** `/package.json`
  - **Action:** Run `npm prune` and audit for unused packages

### Security Enhancements

- [ ] **Add input validation on all user inputs**
  - **Current:** Zod validation used in some places
  - **Action:** Audit all forms and API inputs for proper validation

- [ ] **Sanitize user-generated content**
  - **Issue:** User-created trivia content may contain malicious input
  - **Action:** Implement content sanitization before display

- [ ] **Add security headers**
  - **Action:** Configure CSP, X-Frame-Options, X-Content-Type-Options headers

- [ ] **Implement request signing for critical operations**
  - **Issue:** API calls can be replayed
  - **Action:** Add request signing/nonce for purchase verification, etc.

### Database

- [ ] **Add database migrations version control**
  - **Location:** `/supabase/migrations/` (122 files exist)
  - **Action:** Verify all migrations are sequential and no gaps exist

- [ ] **Implement soft delete for user data**
  - **Issue:** Hard deletes may cause issues with referential integrity
  - **Action:** Add `deleted_at` column to user-related tables

- [ ] **Add audit logging for sensitive operations**
  - **Issue:** No audit trail for admin actions or sensitive operations
  - **Action:** Create `audit_logs` table and trigger functions

### Performance

- [ ] **Optimize bundle size**
  - **Action:**
    1. Run `npm run build` and analyze bundle
    2. Identify large dependencies
    3. Consider dynamic imports for heavy libraries (Three.js, Lottie)

- [ ] **Implement image optimization**
  - **Action:**
    1. Use WebP format where supported
    2. Implement lazy loading for images
    3. Add appropriate image dimensions

- [ ] **Review and optimize React Query cache settings**
  - **File:** `/src/main.tsx`
  - **Action:** Configure appropriate staleTime and cacheTime for different query types

---

## P3 - Low Priority

### Codebase Improvements

- [ ] **Add comprehensive TypeScript strict checks**
  - **File:** `/tsconfig.json`
  - **Action:** Enable additional strict flags:
  ```json
  {
    "compilerOptions": {
      "noUncheckedIndexedAccess": true,
      "noImplicitOverride": true,
      "noPropertyAccessFromIndexSignature": true
    }
  }
  ```

- [ ] **Implement feature flags system**
  - **Issue:** No way to toggle features remotely
  - **Action:** Consider implementing feature flags for:
    - A/B testing
    - Gradual rollouts
    - Emergency kill switches

- [ ] **Add end-to-end tests**
  - **Issue:** No visible E2E test suite
  - **Action:** Implement Playwright or Cypress tests for critical flows:
    - Authentication
    - Game play
    - Purchases (sandbox mode)

- [ ] **Document API contracts**
  - **Issue:** API documentation not visible
  - **Action:** Generate OpenAPI/Swagger docs for Supabase functions

### Security Hardening

- [ ] **Implement session timeout**
  - **Issue:** Sessions may persist indefinitely
  - **Action:** Configure appropriate session expiration

- [ ] **Add device fingerprinting for fraud detection**
  - **Issue:** No anti-fraud measures visible
  - **Action:** Track device fingerprints for suspicious activity

- [ ] **Implement rate limiting on game actions**
  - **Issue:** Users could potentially cheat by rapid submissions
  - **Action:** Server-side rate limiting on answer submissions

### Database

- [ ] **Archive old game session data**
  - **Issue:** `game_sessions` table may grow indefinitely
  - **Action:** Implement data archival strategy for old records

- [ ] **Add database query monitoring**
  - **Action:** Enable slow query logging in Supabase

### Compliance

- [ ] **Create accessibility statement**
  - **Issue:** No WCAG compliance documentation
  - **Action:** Document accessibility features and create compliance statement

- [ ] **Implement age verification if needed**
  - **Issue:** No age gate for content/purchases
  - **Action:** Consider implementing if required by content rating

---

## P4 - Nice to Have

### Codebase

- [ ] **Migrate to React Server Components (future)**
  - **Action:** Consider migration path when Capacitor supports RSC

- [ ] **Implement offline mode**
  - **Current:** Service Worker caches videos
  - **Action:** Extend offline support to:
    - Question caching
    - Score sync when back online
    - Offline single-player mode

- [ ] **Add biometric authentication option**
  - **Action:** Use Capacitor biometric plugin for Face ID/Touch ID/Fingerprint

### Security

- [ ] **Implement MFA/2FA**
  - **Issue:** Single-factor authentication only
  - **Action:** Add optional 2FA via:
    - SMS
    - Authenticator app
    - Email verification

- [ ] **Add end-to-end encryption for chat**
  - **Issue:** Chat messages not encrypted at rest
  - **Action:** Implement E2EE using crypto libraries

### Analytics & Monitoring

- [ ] **Implement crash reporting**
  - **Action:** Integrate Firebase Crashlytics or Sentry

- [ ] **Add performance monitoring**
  - **Action:** Integrate Firebase Performance or similar

- [ ] **Implement A/B testing framework**
  - **Action:** Consider Firebase Remote Config or similar

---

## P5 - Technical Debt

### Architecture

- [ ] **Consider state management migration**
  - **Current:** Multiple React Contexts (7+)
  - **Action:** Evaluate if Zustand or similar would reduce complexity

- [ ] **Modularize codebase**
  - **Issue:** 665+ files in flat structure
  - **Action:** Consider domain-driven structure or monorepo

- [ ] **Extract shared components to library**
  - **Issue:** UI components mixed with business logic
  - **Action:** Create separate UI component package

### Code Quality

- [ ] **Reduce bundle dependencies**
  - **Current:** Many UI libraries (Three.js, GSAP, Lottie, Cobe, Vanta)
  - **Action:** Evaluate if all are necessary, consider alternatives

- [ ] **Standardize error handling patterns**
  - **Issue:** Inconsistent error handling across hooks
  - **Action:** Create standard error handling utilities

- [ ] **Add JSDoc documentation to hooks**
  - **Issue:** 100+ hooks with minimal documentation
  - **Action:** Document public hooks with JSDoc

### Performance

- [ ] **Implement virtual scrolling for long lists**
  - **File:** Identified in `/PERFORMANCE_ANALYSIS.md`
  - **Action:** Use react-virtual or similar for leaderboards, friend lists

- [ ] **Optimize Three.js/WebGL usage**
  - **Issue:** 3D backgrounds may impact performance on older devices
  - **Action:** Add quality settings, disable on low-end devices

- [ ] **Profile and optimize re-renders**
  - **Issue:** Identified re-render issues in performance analysis
  - **Action:** Use React DevTools Profiler to identify and fix

---

## Pre-Submission Checklist

### Final Verification Steps

- [ ] **Build and test release version**
  ```bash
  npm run build
  npx cap sync
  # iOS: Archive and test via TestFlight
  # Android: Build signed APK/AAB and test
  ```

- [ ] **Test on physical devices**
  - [ ] iPhone (oldest supported model)
  - [ ] iPhone (latest model)
  - [ ] iPad (if supported)
  - [ ] Android low-end device
  - [ ] Android flagship device

- [ ] **Test all critical flows**
  - [ ] Sign up (email, username, Apple Sign-In)
  - [ ] Sign in
  - [ ] Game play (single player)
  - [ ] Game play (multiplayer)
  - [ ] In-app purchases (sandbox)
  - [ ] Ad display
  - [ ] Push notifications
  - [ ] Profile editing
  - [ ] Account deletion

- [ ] **Verify external services**
  - [ ] Supabase production project configured
  - [ ] AdMob production ad units created
  - [ ] RevenueCat products configured in both stores
  - [ ] Push notification certificates configured

- [ ] **Legal verification**
  - [ ] Privacy policy is accessible and accurate
  - [ ] Terms of service is accessible and accurate
  - [ ] All third-party licenses acknowledged
  - [ ] EULA configured (if required)

---

## Resources

### Apple Documentation
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)

### Google Documentation
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)
- [Launch Checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)
- [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)

### Capacitor Documentation
- [Capacitor iOS](https://capacitorjs.com/docs/ios)
- [Capacitor Android](https://capacitorjs.com/docs/android)
- [App Store Deployment](https://capacitorjs.com/docs/ios/deploying-to-app-store)
- [Play Store Deployment](https://capacitorjs.com/docs/android/deploying-to-google-play)

---

## Notes

- This checklist is based on codebase analysis performed on January 2026
- The app uses Capacitor 8.0 (not Flutter despite directory name)
- Backend is Supabase with 44+ database tables and 49+ Edge Functions
- Total of 122 database migrations exist
- Approximately 665 TypeScript/TSX files in the project
