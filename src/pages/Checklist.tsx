import { PageHeader } from "@/components/shared/PageHeader";
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  Shield,
  CreditCard,
  FileText,
  Users,
  Bell,
  MapPin,
  Gamepad2,
  Eye,
  Lock,
  Smartphone,
  Globe,
  Scale,
  Baby,
  MessageSquare,
  Zap,
  ExternalLink,
  Apple
} from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  guideline: string;
  status: "needs_fix" | "warning" | "ok";
  description: string;
  currentState: string;
  fix: string;
  files: string[];
  appleLink?: string;
}

const checklistItems: ChecklistItem[] = [
  // CRITICAL ISSUES
  {
    id: "iap-required",
    title: "In-App Purchases Not Using StoreKit",
    severity: "critical",
    guideline: "3.1.1 - In-App Purchase",
    status: "needs_fix",
    description: "Apps selling digital goods, subscriptions, or premium features MUST use Apple's In-App Purchase system. Using external payment systems for digital content will result in immediate rejection.",
    currentState: "VIP subscription page (src/pages/VIP.tsx) shows pricing (₾9.99/month, ₾79.99/year) but payment is not implemented. The subscribe button only logs to console.",
    fix: "1. Integrate StoreKit 2 for iOS native payments\n2. Create App Store Connect subscription products\n3. Implement receipt validation on your backend\n4. Handle subscription status checks via useVipStatus hook\n5. Add restore purchases functionality\n6. Use Capacitor/native bridge for StoreKit integration",
    files: ["src/pages/VIP.tsx:146-148", "src/hooks/useVipStatus.ts"],
    appleLink: "https://developer.apple.com/app-store/review/guidelines/#in-app-purchase"
  },
  {
    id: "privacy-policy-missing",
    title: "Privacy Policy Not Accessible",
    severity: "critical",
    guideline: "5.1.1 - Data Collection and Storage",
    status: "needs_fix",
    description: "Apps that collect user data MUST have an accessible privacy policy. Links to privacy policy currently point to non-existent hash routes.",
    currentState: "PrivacyModal (src/components/home/PrivacyModal.tsx) links to '#privacy-policy' which doesn't exist. The app collects: user ID, nickname, country, game statistics, coins/gems balance.",
    fix: "1. Create a comprehensive privacy policy document\n2. Host it at a real URL (e.g., mytrivia.io/privacy)\n3. Update the PrivacyModal to link to the actual policy\n4. Include in App Store Connect metadata\n5. Document all data collected and third-party services (Supabase, DiceBear, IP-API)\n6. Add privacy policy link in app settings AND during signup",
    files: ["src/components/home/PrivacyModal.tsx:44"],
    appleLink: "https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage"
  },
  {
    id: "terms-of-service-missing",
    title: "Terms of Service Not Accessible",
    severity: "critical",
    guideline: "5.1.1 - Legal",
    status: "needs_fix",
    description: "Apps with user accounts and subscriptions require accessible Terms of Service.",
    currentState: "Link to '#terms' in PrivacyModal doesn't lead anywhere. Required for subscription apps.",
    fix: "1. Create comprehensive Terms of Service\n2. Host at real URL (e.g., mytrivia.io/terms)\n3. Include subscription terms, cancellation policy, auto-renewal terms\n4. Update links in app to point to real URL\n5. Add EULA in App Store Connect",
    files: ["src/components/home/PrivacyModal.tsx:49"],
    appleLink: "https://developer.apple.com/app-store/review/guidelines/#legal"
  },
  {
    id: "account-deletion",
    title: "Account Deletion Not Fully Implemented",
    severity: "critical",
    guideline: "5.1.1(v) - Account Deletion",
    status: "needs_fix",
    description: "As of June 2022, apps that support account creation MUST also allow users to initiate deletion of their account from within the app.",
    currentState: "Delete account button exists but only signs out user and shows '30 day deletion' message. No actual account/data deletion occurs.",
    fix: "1. Implement actual account deletion in Supabase backend\n2. Delete all user data: profile, game history, friends, messages, notifications\n3. Provide immediate deletion option (not just 30-day wait)\n4. Send confirmation email\n5. Handle subscription cancellation before deletion\n6. Clear local storage data on deletion",
    files: ["src/components/home/PrivacyModal.tsx:21-37"],
    appleLink: "https://developer.apple.com/support/offering-account-deletion-in-your-app/"
  },

  // HIGH SEVERITY ISSUES
  {
    id: "simulated-ads",
    title: "Simulated Ads - Deceptive Functionality",
    severity: "high",
    guideline: "2.3.1 - Accurate Metadata",
    status: "needs_fix",
    description: "The app claims to offer ad-watching for rewards but simulates ads with a 1.5 second delay instead of showing real ads. This could be considered deceptive.",
    currentState: "useDailyPlays.ts line 111-112 simulates ad watching with setTimeout. WatchAdModal shows fake ad UI. Users get +2 plays for 'watching' non-existent ads.",
    fix: "Option A: Remove ad watching feature entirely\nOption B: Integrate real ad SDK (AdMob, AppLovin, Unity Ads)\n\nIf implementing real ads:\n1. Add Google Mobile Ads SDK via Capacitor plugin\n2. Configure ad unit IDs in App Store Connect\n3. Implement proper ad loading/showing\n4. Handle ad completion callbacks\n5. Consider ATT framework for iOS 14.5+",
    files: ["src/hooks/useDailyPlays.ts:107-135", "src/components/home/WatchAdModal.tsx"],
    appleLink: "https://developer.apple.com/app-store/review/guidelines/#accurate-metadata"
  },
  {
    id: "loot-box-disclosure",
    title: "Lucky Spin (Loot Box) Probability Disclosure",
    severity: "high",
    guideline: "3.1.1 - Loot Boxes",
    status: "warning",
    description: "Apps offering randomized virtual items (loot boxes) must disclose the odds of receiving each type of item BEFORE purchase.",
    currentState: "LuckySpinModal has 8 segments with different rewards (coins, gems, powerups). Odds appear equal (12.5% each) but actual winning calculation in code may differ. No probability disclosure shown to users.",
    fix: "1. Add clear probability disclosure before spinning\n2. Show odds for each reward type in UI\n3. Ensure displayed odds match actual code logic\n4. Consider showing odds in a dedicated 'Info' button\n5. Document probabilities in app description if applicable",
    files: ["src/components/game/LuckySpinModal.tsx:18-27", "src/components/game/LuckySpinModal.tsx:56-67"],
    appleLink: "https://developer.apple.com/app-store/review/guidelines/#in-app-purchase"
  },
  {
    id: "sign-in-with-apple",
    title: "Sign in with Apple Required",
    severity: "high",
    guideline: "4.8 - Sign in with Apple",
    status: "needs_fix",
    description: "Apps that exclusively use third-party login services MUST also offer Sign in with Apple. If email/password auth is exclusive, this may not apply, but adding Apple Sign-In improves approval chances.",
    currentState: "App uses email/password and username-only authentication via Supabase. No social login (Google, Apple) implemented.",
    fix: "1. Implement Sign in with Apple using Supabase Auth\n2. Add Apple Sign-In capability in Xcode\n3. Configure Apple Developer account for Sign in with Apple\n4. Add Sign in with Apple button prominently on login screen\n5. Handle Apple credential revocation\n6. Store Apple user identifier for account linking",
    files: ["src/contexts/AuthContext.tsx", "src/pages/Auth.tsx"],
    appleLink: "https://developer.apple.com/sign-in-with-apple/"
  },
  {
    id: "subscription-auto-renewal",
    title: "Subscription Auto-Renewal Terms",
    severity: "high",
    guideline: "3.1.2(a) - Subscriptions",
    status: "warning",
    description: "Auto-renewing subscriptions must clearly explain terms including price, duration, and that payment will be charged to iTunes Account.",
    currentState: "VIP page shows pricing but lacks complete subscription terms. Brief mention of auto-renewal exists but not comprehensive.",
    fix: "1. Add clear auto-renewal disclosure near purchase button\n2. Include: 'Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period'\n3. Add: 'Payment will be charged to iTunes Account at confirmation of purchase'\n4. Link to Apple's subscription management\n5. Explain how to cancel subscription",
    files: ["src/pages/VIP.tsx:179-182"],
    appleLink: "https://developer.apple.com/app-store/review/guidelines/#subscriptions"
  },

  // MEDIUM SEVERITY ISSUES
  {
    id: "app-tracking-transparency",
    title: "App Tracking Transparency (ATT) Not Implemented",
    severity: "medium",
    guideline: "5.1.2 - Data Use and Sharing",
    status: "warning",
    description: "If the app tracks users across apps/websites owned by other companies for advertising or shares data with data brokers, ATT permission is required on iOS 14.5+.",
    currentState: "App uses IP-API for geolocation (country detection only). No tracking SDKs detected. If ads are added later, ATT will be required.",
    fix: "If adding advertising SDKs:\n1. Add ATTrackingManager framework\n2. Request tracking authorization before loading ads\n3. Add NSUserTrackingUsageDescription to Info.plist\n4. Handle authorization status properly\n5. Implement SKAdNetwork for attribution if denied\n\nCurrent state may not require ATT if no ad tracking.",
    files: ["src/hooks/useGeoLocation.ts"],
    appleLink: "https://developer.apple.com/documentation/apptrackingtransparency"
  },
  {
    id: "data-download",
    title: "Data Download Feature Not Implemented",
    severity: "medium",
    guideline: "5.1.1 - Data Collection and Storage",
    status: "warning",
    description: "GDPR and data privacy best practices suggest allowing users to download their data. Current implementation is placeholder only.",
    currentState: "PrivacyModal shows 'Download your data' option but only displays a toast saying 'Data will be sent to email soon' without actual functionality.",
    fix: "1. Create backend endpoint to compile user data\n2. Generate downloadable JSON/CSV of user data\n3. Include: profile, game history, friends, messages, achievements\n4. Send via email or direct download\n5. Rate limit requests to prevent abuse",
    files: ["src/components/home/PrivacyModal.tsx:54-56"],
  },
  {
    id: "minimum-functionality",
    title: "Ensure Core Features Work Without Auth",
    severity: "medium",
    guideline: "4.2 - Minimum Functionality",
    status: "warning",
    description: "Apps should provide value without requiring account creation. Consider guest mode or preview functionality.",
    currentState: "App allows some browsing but many features require authentication. Check if core trivia gameplay is accessible.",
    fix: "1. Allow limited gameplay without sign-in\n2. Prompt for account only when saving progress\n3. Ensure onboarding flow is smooth\n4. Avoid forcing sign-up before showing app value",
    files: ["src/pages/Index.tsx", "src/contexts/AuthContext.tsx"],
    appleLink: "https://developer.apple.com/app-store/review/guidelines/#minimum-functionality"
  },
  {
    id: "restore-purchases",
    title: "Restore Purchases Feature Required",
    severity: "medium",
    guideline: "3.1.1 - In-App Purchase",
    status: "needs_fix",
    description: "Apps with IAP must include a 'Restore Purchases' button for users to recover previously purchased content.",
    currentState: "No restore purchases functionality exists since payment isn't implemented yet.",
    fix: "When implementing StoreKit:\n1. Add prominent 'Restore Purchases' button in VIP/settings\n2. Call StoreKit's restorePurchases() method\n3. Restore VIP status from valid receipts\n4. Handle cases where no purchases exist to restore\n5. Show appropriate feedback during restore process",
    files: ["src/pages/VIP.tsx"],
    appleLink: "https://developer.apple.com/documentation/storekit/in-app_purchase/original_api_for_in-app_purchase/restoring_purchased_products"
  },
  {
    id: "native-wrapper",
    title: "Native iOS Wrapper Required",
    severity: "medium",
    guideline: "4.2 - Minimum Functionality",
    status: "needs_fix",
    description: "This is a React web app that needs to be wrapped in a native iOS container for App Store submission.",
    currentState: "Pure web app with no iOS native code (no ios/ folder, Podfile, or Info.plist found). Cannot be submitted to App Store in current form.",
    fix: "1. Initialize Capacitor: npx cap init\n2. Add iOS platform: npx cap add ios\n3. Configure capacitor.config.ts with app ID and name\n4. Build web app: npm run build\n5. Sync to iOS: npx cap sync ios\n6. Open in Xcode: npx cap open ios\n7. Configure signing, capabilities, and Info.plist",
    files: ["package.json"],
    appleLink: "https://capacitorjs.com/docs/ios"
  },

  // LOW SEVERITY / BEST PRACTICES
  {
    id: "age-rating",
    title: "Age Rating Consideration",
    severity: "low",
    guideline: "Various",
    status: "ok",
    description: "App content appears suitable for general audiences (4+). Trivia content, no violence, no mature themes.",
    currentState: "Educational trivia game with virtual currency. No inappropriate content detected in question database.",
    fix: "1. Select appropriate age rating in App Store Connect\n2. Accurately answer content questionnaire\n3. If adding user chat features, may need 12+ rating\n4. Document any mature categories in questions",
    files: [],
  },
  {
    id: "coppa-compliance",
    title: "COPPA Compliance (If Targeting Children)",
    severity: "low",
    guideline: "Kids Category / COPPA",
    status: "warning",
    description: "If the app targets children under 13, additional restrictions apply including no behavioral advertising and limited data collection.",
    currentState: "App does not appear to specifically target children but trivia games can appeal to all ages. No Kids Category metadata found.",
    fix: "If NOT targeting children:\n1. Do not list in Kids Category\n2. Ensure age-appropriate content\n\nIf targeting children:\n1. Remove all tracking/analytics\n2. No third-party advertising\n3. No external links\n4. Parental gate for IAP\n5. Full COPPA compliance",
    files: [],
    appleLink: "https://developer.apple.com/app-store/review/guidelines/#kids"
  },
  {
    id: "chat-safety",
    title: "Chat/Messaging Safety",
    severity: "low",
    guideline: "1.2 - User Generated Content",
    status: "ok",
    description: "Apps with chat features should have moderation capabilities and reporting mechanisms.",
    currentState: "Chat is limited to friends-only 1:1 messaging. No public chat rooms or stranger messaging. Lower risk than public chat.",
    fix: "Consider adding:\n1. Message reporting functionality\n2. Block user capability (exists via friends system)\n3. Content moderation for inappropriate messages\n4. Terms of use for chat feature",
    files: ["src/hooks/useChat.ts", "src/hooks/useFriends.ts"],
  },
  {
    id: "external-api-fallbacks",
    title: "External API Dependency Handling",
    severity: "low",
    guideline: "2.1 - App Completeness",
    status: "ok",
    description: "Apps should gracefully handle failures of external services.",
    currentState: "App uses DiceBear (avatars), IP-API (geolocation), Hatscripts (flags). Has fallback handling for AI icon analysis.",
    fix: "Ensure fallbacks exist for:\n1. Avatar generation failure -> default avatar\n2. Geolocation failure -> manual country selection\n3. Flag loading failure -> placeholder or text\n4. Supabase connectivity issues -> offline mode/retry",
    files: ["src/hooks/useAIIcon.ts", "src/hooks/useGeoLocation.ts"],
  },
  {
    id: "local-currency",
    title: "Currency Display (Georgian Lari)",
    severity: "low",
    guideline: "3.1.1",
    status: "warning",
    description: "Prices shown in Georgian Lari (₾) may need to be dynamically shown based on user's App Store region.",
    currentState: "VIP prices hardcoded as ₾9.99/month and ₾79.99/year.",
    fix: "When implementing StoreKit:\n1. Fetch localized prices from App Store\n2. Display prices in user's local currency\n3. StoreKit handles currency conversion\n4. Don't hardcode prices in UI",
    files: ["src/pages/VIP.tsx:132-133", "src/pages/VIP.tsx:170-171"],
  },
  {
    id: "info-plist-permissions",
    title: "Info.plist Permission Descriptions",
    severity: "medium",
    guideline: "5.1.1 - Permission",
    status: "needs_fix",
    description: "iOS apps must provide usage descriptions for all permissions requested (camera, microphone, location, etc.)",
    currentState: "No iOS project exists yet. When created, permission strings will be needed.",
    fix: "Add to Info.plist when creating iOS project:\n- NSUserTrackingUsageDescription (if using ATT)\n- NSCameraUsageDescription (if adding camera)\n- NSMicrophoneUsageDescription (if adding audio)\n- NSLocationWhenInUseUsageDescription (if adding GPS)\n\nDescriptions must explain WHY the permission is needed.",
    files: [],
    appleLink: "https://developer.apple.com/documentation/bundleresources/information_property_list"
  },
];

const severityColors = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-green-100 text-green-800 border-green-300",
};

const statusIcons = {
  needs_fix: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  ok: <CheckCircle className="w-5 h-5 text-green-500" />,
};

const statusLabels = {
  needs_fix: "Needs Fix",
  warning: "Warning",
  ok: "OK",
};

export default function Checklist() {
  const criticalCount = checklistItems.filter(i => i.status === "needs_fix" && i.severity === "critical").length;
  const needsFixCount = checklistItems.filter(i => i.status === "needs_fix").length;
  const warningCount = checklistItems.filter(i => i.status === "warning").length;
  const okCount = checklistItems.filter(i => i.status === "ok").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <PageHeader title="App Store Checklist" />

      <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
              <Apple className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">App Store Review Guidelines</h1>
              <p className="text-slate-600">Trivia World - Pre-Submission Checklist</p>
            </div>
          </div>

          <p className="text-slate-600 mb-6">
            This document identifies potential App Store review issues found during code analysis.
            Address all critical and high-severity items before submitting to the App Store.
          </p>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{needsFixCount}</div>
              <div className="text-sm text-red-700">Needs Fix</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-yellow-700">Warnings</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{okCount}</div>
              <div className="text-sm text-green-700">OK</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-slate-600">{checklistItems.length}</div>
              <div className="text-sm text-slate-700">Total Items</div>
            </div>
          </div>
        </div>

        {/* Critical Alert */}
        {criticalCount > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800">
                  {criticalCount} Critical Issue{criticalCount > 1 ? 's' : ''} Found
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  Your app will likely be rejected if these issues are not resolved before submission.
                  Critical issues include missing payment integration, privacy policy, and account deletion.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Checklist Items */}
        <div className="space-y-4">
          {/* Critical Items */}
          <Section title="Critical Issues" icon={<XCircle className="w-5 h-5" />} color="red">
            {checklistItems.filter(i => i.severity === "critical").map(item => (
              <ChecklistCard key={item.id} item={item} />
            ))}
          </Section>

          {/* High Items */}
          <Section title="High Priority" icon={<AlertTriangle className="w-5 h-5" />} color="orange">
            {checklistItems.filter(i => i.severity === "high").map(item => (
              <ChecklistCard key={item.id} item={item} />
            ))}
          </Section>

          {/* Medium Items */}
          <Section title="Medium Priority" icon={<Shield className="w-5 h-5" />} color="yellow">
            {checklistItems.filter(i => i.severity === "medium").map(item => (
              <ChecklistCard key={item.id} item={item} />
            ))}
          </Section>

          {/* Low Items */}
          <Section title="Low Priority / Best Practices" icon={<CheckCircle className="w-5 h-5" />} color="green">
            {checklistItems.filter(i => i.severity === "low").map(item => (
              <ChecklistCard key={item.id} item={item} />
            ))}
          </Section>
        </div>

        {/* Quick Reference Links */}
        <div className="mt-12 bg-slate-100 rounded-2xl p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Quick Reference Links
          </h3>
          <div className="grid gap-2 text-sm">
            <a href="https://developer.apple.com/app-store/review/guidelines/" target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:underline flex items-center gap-1">
              App Store Review Guidelines (Full Document)
              <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://developer.apple.com/design/human-interface-guidelines/" target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:underline flex items-center gap-1">
              Human Interface Guidelines
              <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://developer.apple.com/documentation/storekit" target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:underline flex items-center gap-1">
              StoreKit Documentation
              <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://developer.apple.com/sign-in-with-apple/" target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:underline flex items-center gap-1">
              Sign in with Apple
              <ExternalLink className="w-3 h-3" />
            </a>
            <a href="https://capacitorjs.com/docs/ios" target="_blank" rel="noopener noreferrer"
               className="text-blue-600 hover:underline flex items-center gap-1">
              Capacitor iOS Documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Generated: {new Date().toLocaleDateString()} | Trivia World App Store Submission Checklist</p>
          <p className="mt-1">Review Apple's guidelines regularly as they are frequently updated.</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  const colorClasses: Record<string, string> = {
    red: "border-red-200 bg-red-50",
    orange: "border-orange-200 bg-orange-50",
    yellow: "border-yellow-200 bg-yellow-50",
    green: "border-green-200 bg-green-50",
  };

  const textColors: Record<string, string> = {
    red: "text-red-700",
    orange: "text-orange-700",
    yellow: "text-yellow-700",
    green: "text-green-700",
  };

  return (
    <div className="mb-8">
      <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${colorClasses[color]}`}>
        <span className={textColors[color]}>{icon}</span>
        <h2 className={`font-bold ${textColors[color]}`}>{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function ChecklistCard({ item }: { item: ChecklistItem }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {statusIcons[item.status]}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">{item.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[item.severity]}`}>
              {item.severity.toUpperCase()}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {statusLabels[item.status]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Guideline: {item.guideline}</p>
        </div>
      </div>

      {/* Description */}
      <div className="mb-3">
        <p className="text-sm text-slate-700">{item.description}</p>
      </div>

      {/* Current State */}
      <div className="mb-3 p-3 bg-slate-50 rounded-lg">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Current State</p>
        <p className="text-sm text-slate-700">{item.currentState}</p>
      </div>

      {/* How to Fix */}
      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">How to Fix</p>
        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{item.fix}</pre>
      </div>

      {/* Files */}
      {item.files.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Affected Files</p>
          <div className="flex flex-wrap gap-1">
            {item.files.map((file, i) => (
              <code key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {file}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Apple Link */}
      {item.appleLink && (
        <a
          href={item.appleLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          View Apple Documentation
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
