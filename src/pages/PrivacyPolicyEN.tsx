import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { Shield, Mail } from "lucide-react";

export default function PrivacyPolicyEN() {
  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <PageHeader title="Privacy Policy" />
      
      <div className="p-4 pb-12 max-w-[700px] md:max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 border border-border"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Effective: August 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-foreground">
            {/* 1. Introduction */}
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                MyTrivia ("we", "our", "us") respects your privacy. This Privacy Policy explains 
                how we collect, use, disclose, and safeguard your information when you use our mobile 
                application.
              </p>
            </section>

            {/* 2. Data Collection */}
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
              <BulletList items={[
                { bold: "Account Information:", text: "Email address, username, password (encrypted)" },
                { bold: "Profile Data:", text: "Avatar, country, game statistics" },
                { bold: "Photographs:", text: "If you choose to create an avatar from a photo, the photo you take or select is uploaded to our servers and sent to an AI image provider to generate the avatar (see Third-Party Services). We use the photo only to produce your avatar. We do not show it to other players and we do not sell it. You can delete a generated avatar at any time, and deleting your account removes both the avatar and the source photo." },
                { bold: "Content You Create:", text: "Quizzes, collections, room names and other content you make in the app, which other players can see" },
                { bold: "Approximate Location:", text: "Your country, determined once from your IP address, to set your default language and region. We do not collect precise location." },
                { bold: "Game Data:", text: "Scores, achievements, game history" },
                { bold: "Device Information:", text: "Device type, operating system, IP address" },
                { bold: "Payment Information:", text: "Processed by Apple/Google (we do not store payment details)" },
              ]} />
            </section>

            {/* 3. Data Usage */}
            <section>
              <h2 className="text-lg font-semibold mb-2">3. How We Use Your Information</h2>
              <BulletList items={[
                "Provide, maintain, and improve our services",
                "Process in-app purchases and subscriptions",
                "Display leaderboards and game statistics",
                "Send push notifications (with your consent)",
                "Prevent fraud and ensure security",
              ]} />
            </section>

            {/* 4. Third Parties */}
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Third-Party Services</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                We use the following third-party services:
              </p>
              <BulletList items={[
                { bold: "Supabase:", text: "Database and authentication" },
                { bold: "Firebase:", text: "Push notifications" },
                { bold: "Google AdMob:", text: "Advertising (with ATT consent on iOS)" },
                { bold: "RevenueCat:", text: "Subscription management and purchase analytics" },
                { bold: "Apple:", text: "In-app purchases and Sign in with Apple" },
                { bold: "PostHog:", text: "Product analytics and crash diagnostics" },
                { bold: "ip-api.com:", text: "Country detection from your IP address (coarse location), used once to set your default region" },
                { bold: "fal.ai:", text: "AI image generation. When you create an avatar from a photo, that photo is sent to fal.ai, which runs the image model that produces your avatar. fal.ai processes the photo as our service provider, under its own terms and privacy policy." },
              ]} />
            </section>

            {/* 5. Advertising & Tracking */}
            <section>
              <h2 className="text-lg font-semibold mb-2">5. Advertising & Tracking</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use Google AdMob for advertising. Before any tracking occurs for personalized ads, 
                you will be asked for permission via iOS App Tracking Transparency (ATT). You can 
                opt-out at any time through your device settings: iOS Settings → Privacy & Security → Tracking. 
                If you opt out, you will still see ads, but they will not be personalized.
              </p>
            </section>

            {/* 6. Data Security */}
            <section>
              <h2 className="text-lg font-semibold mb-2">6. Data Security</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                We implement industry-standard security measures to protect your personal data, including:
              </p>
              <BulletList items={[
                "Data encryption in transit (TLS/SSL) and at rest",
                "Secure password hashing — we never store passwords in plain text",
                "Regular security audits and monitoring",
                "Access controls limiting who can view your data",
              ]} />
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                While we strive to protect your information, no method of electronic transmission or storage 
                is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            {/* 7. Data Retention */}
            <section>
              <h2 className="text-lg font-semibold mb-2">7. Data Retention</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data is retained while your account is active. Photos uploaded for avatar
                generation are kept only as long as the avatar they produced; deleting an avatar
                deletes its source photo. Upon account deletion request, all personal data —
                including photos and avatars — is permanently removed within 30 days.
              </p>
            </section>

            {/* 8. International Data Transfers */}
            <section>
              <h2 className="text-lg font-semibold mb-2">8. International Data Transfers</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data may be processed and stored on servers located outside your country of residence, 
                including in the United States and European Union. By using our app, you consent to the 
                transfer of your data to these locations. We ensure appropriate safeguards are in place to 
                protect your data in accordance with this privacy policy.
              </p>
            </section>

            {/* 9. Your Rights */}
            <section>
              <h2 className="text-lg font-semibold mb-2">9. Your Rights</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                You have the right to:
              </p>
              <BulletList items={[
                { bold: "Access:", text: "Request a copy of your personal data" },
                { bold: "Correction:", text: "Update inaccurate information" },
                { bold: "Deletion:", text: "Delete your account and all associated data" },
                { bold: "Portability:", text: "Export your data in a machine-readable format" },
                { bold: "Opt-out:", text: "Disable tracking and personalized advertising" },
              ]} />
            </section>

            {/* 10. GDPR */}
            <section>
              <h2 className="text-lg font-semibold mb-2">10. European Users (GDPR)</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                If you are located in the European Economic Area (EEA), you have additional rights 
                under the General Data Protection Regulation (GDPR):
              </p>
              <div className="mb-2">
                <BulletItem bold="Legal Basis for Processing:" text="We process your data based on: (a) your consent, (b) performance of a contract (providing the game service), (c) legitimate interests (improving our service, preventing fraud)" />
              </div>
              <BulletList items={[
                "Right to access your personal data",
                "Right to rectification of inaccurate data",
                "Right to erasure ('right to be forgotten')",
                "Right to restrict processing",
                "Right to data portability",
                "Right to object to processing",
                "Right to lodge a complaint with a supervisory authority",
              ]} />
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                For GDPR-related requests, contact us at support@mytrivia.io
              </p>
            </section>

            {/* 11. CCPA */}
            <section>
              <h2 className="text-lg font-semibold mb-2">11. California Users (CCPA/CPRA)</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                If you are a California resident, you have additional rights under the California 
                Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):
              </p>
              <BulletList items={[
                "Right to know what personal information we collect, use, and disclose",
                "Right to delete your personal information",
                "Right to opt-out of the sale or sharing of personal information",
                "Right to non-discrimination for exercising your privacy rights",
              ]} />
              <p className="text-sm text-muted-foreground leading-relaxed mt-2 font-medium">
                We do not sell your personal information. We do not share your personal information 
                for cross-context behavioral advertising purposes.
              </p>
            </section>

            {/* 12. Account Deletion */}
            <section>
              <h2 className="text-lg font-semibold mb-2">12. Account Deletion</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                You can delete your account at any time directly within the app:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside mb-2">
                <li>Open the app and go to Settings</li>
                <li>Navigate to Privacy & Security</li>
                <li>Tap "Delete Account"</li>
                <li>Confirm your decision</li>
              </ol>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upon deletion, all your personal data including profile information, game history, scores, 
                and any virtual currency will be permanently removed within 30 days. This action cannot be undone. 
                Active subscriptions should be cancelled separately through the App Store or Google Play.
              </p>
            </section>

            {/* 13. Push Notifications */}
            <section>
              <h2 className="text-lg font-semibold mb-2">13. Push Notifications</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may send you push notifications about game updates, friend requests, and challenges. 
                You can manage or disable push notifications at any time through your device settings: 
                iOS Settings → Notifications → MyTrivia, or Android Settings → Apps → MyTrivia → Notifications.
              </p>
            </section>

            {/* 14. Children's Privacy */}
            <section>
              <h2 className="text-lg font-semibold mb-2">14. Children's Privacy</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our service is intended for users aged 13 and older. We do not knowingly collect 
                personal information from children under 13. If you believe a child under 13 has provided 
                us with personal information, please contact us immediately and we will take steps to 
                delete such information.
              </p>
            </section>

            {/* 15. Changes */}
            <section>
              <h2 className="text-lg font-semibold mb-2">15. Changes to This Policy</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes 
                by posting the new policy in the app and updating the "Effective Date" at the top. Your 
                continued use of the app after changes constitutes acceptance of the updated policy. We 
                encourage you to review this policy periodically.
              </p>
            </section>

            {/* 16. Contact */}
            <section className="bg-muted/50 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">16. Contact Us</h2>
              <p className="text-sm text-muted-foreground mb-3">
                If you have any questions or concerns about this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <a 
                href="mailto:support@mytrivia.io" 
                className="inline-flex items-center gap-2 text-sm text-primary font-medium"
              >
                <Mail className="w-4 h-4" />
                support@mytrivia.io
              </a>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Helper components
function BulletItem({ bold, text }: { bold?: string; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="text-primary mt-1">•</span>
      <span>{bold && <strong>{bold}</strong>} {text}</span>
    </div>
  );
}

function BulletList({ items }: { items: (string | { bold: string; text: string })[] }) {
  return (
    <ul className="text-sm text-muted-foreground space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-primary mt-1">•</span>
          {typeof item === "string" ? (
            <span>{item}</span>
          ) : (
            <span><strong>{item.bold}</strong> {item.text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
