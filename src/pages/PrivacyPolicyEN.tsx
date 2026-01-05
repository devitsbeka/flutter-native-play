import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { Shield, Mail } from "lucide-react";

export default function PrivacyPolicyEN() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Privacy Policy" />
      
      <div className="p-4 pb-12">
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
              <p className="text-sm text-muted-foreground">Effective: January 2025</p>
            </div>
          </div>

          <div className="space-y-6 text-foreground">
            {/* Introduction */}
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                World Quizzes ("we", "our", "us") respects your privacy. This Privacy Policy explains 
                how we collect, use, disclose, and safeguard your information when you use our mobile 
                application.
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Account Information:</strong> Email address, username, password (encrypted)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Profile Data:</strong> Avatar, country, game statistics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Game Data:</strong> Scores, achievements, game history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Device Information:</strong> Device type, operating system, IP address</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Payment Information:</strong> Processed by Apple (we do not store payment details)</span>
                </li>
              </ul>
            </section>

            {/* Data Usage */}
            <section>
              <h2 className="text-lg font-semibold mb-2">3. How We Use Your Information</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Provide, maintain, and improve our services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Process in-app purchases and subscriptions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Display leaderboards and game statistics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Send push notifications (with your consent)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Prevent fraud and ensure security</span>
                </li>
              </ul>
            </section>

            {/* Third Parties */}
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Third-Party Services</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                We use the following third-party services:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Supabase:</strong> Database and authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Firebase:</strong> Push notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Google AdMob:</strong> Advertising (with ATT consent)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Apple:</strong> In-app purchases and authentication</span>
                </li>
              </ul>
            </section>

            {/* Advertising & Tracking */}
            <section>
              <h2 className="text-lg font-semibold mb-2">5. Advertising & Tracking</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use Google AdMob for advertising. Before any tracking occurs for personalized ads, 
                you will be asked for permission via iOS App Tracking Transparency (ATT). You can 
                opt-out at any time through iOS Settings → Privacy → Tracking.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data is retained while your account is active. Upon account deletion request, 
                all personal data is permanently removed within 30 days.
              </p>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-lg font-semibold mb-2">7. Your Rights</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                You have the right to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Access:</strong> Request a copy of your personal data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Correction:</strong> Update inaccurate information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Deletion:</strong> Delete your account and all associated data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Portability:</strong> Export your data in a machine-readable format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Opt-out:</strong> Disable tracking and personalized advertising</span>
                </li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-lg font-semibold mb-2">8. Children's Privacy</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our service is intended for users aged 13 and older. We do not knowingly collect 
                personal information from children under 13. If you believe a child has provided 
                us with personal information, please contact us.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-lg font-semibold mb-2">9. Changes to This Policy</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. Material changes will be 
                notified through the app. Continued use of the app after changes constitutes 
                acceptance of the updated policy.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-muted/50 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">10. Contact Us</h2>
              <p className="text-sm text-muted-foreground mb-3">
                If you have questions about this Privacy Policy, please contact us:
              </p>
              <a 
                href="mailto:support@worldquizzes.app" 
                className="inline-flex items-center gap-2 text-sm text-primary font-medium"
              >
                <Mail className="w-4 h-4" />
                support@worldquizzes.app
              </a>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
