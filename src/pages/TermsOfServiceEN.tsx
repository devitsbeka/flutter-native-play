import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileText, Mail } from "lucide-react";

export default function TermsOfServiceEN() {
  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <PageHeader title="Terms of Service" />
      
      <div className="p-4 pb-12 max-w-[700px] md:max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 border border-border"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Effective: January 2025</p>
            </div>
          </div>

          <div className="space-y-6 text-foreground">
            {/* Acceptance */}
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By downloading, installing, or using MyTrivia ("App", "Service"), you agree to be bound 
                by these Terms of Service. If you do not agree to these terms, please do not use the App.
              </p>
            </section>

            {/* Account Rules */}
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Account Rules</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>You are responsible for maintaining the security of your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Do not share your password with others</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Notify us immediately of any unauthorized access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Each user may only have one account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>You must be at least 13 years old to use the App</span>
                </li>
              </ul>
            </section>

            {/* Prohibited Conduct */}
            <section>
              <h2 className="text-lg font-semibold mb-2">3. Prohibited Conduct</h2>
              <p className="text-sm text-muted-foreground mb-2">You may not:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>Use cheats, bots, automation tools, or exploits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>Harass, abuse, or threaten other users</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>Post offensive, illegal, or inappropriate content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>Attempt to hack, manipulate, or exploit the system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>Impersonate others or provide false information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>Sell, trade, or transfer accounts or virtual items for real money</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                We have zero tolerance for objectionable content and abusive
                users. Content reported as offensive is reviewed and removed
                within 24 hours, and users who post it are ejected. You can
                report any content and block any user directly in the app.
              </p>
            </section>

            {/* Virtual Items */}
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Virtual Items & Currency</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Virtual currency (coins, gems) and virtual items in the App have no real-world monetary value 
                and cannot be exchanged for real money. We reserve the right to modify, limit, or remove 
                virtual items at any time. Virtual items are non-transferable and non-refundable.
              </p>
            </section>

            {/* Subscriptions */}
            <section>
              <h2 className="text-lg font-semibold mb-2">5. VIP Subscription</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Subscriptions automatically renew at the end of each billing period</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>You may cancel at any time through your Apple ID settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Refunds are subject to Apple's refund policy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Prices may change with prior notice</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Payment is charged to your Apple ID account at confirmation of purchase</span>
                </li>
              </ul>
            </section>

            {/* IP Rights */}
            <section>
              <h2 className="text-lg font-semibold mb-2">6. Intellectual Property</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All content, design, graphics, logos, and trademarks in MyTrivia are owned by us 
                or our licensors. You are granted a limited, non-exclusive, non-transferable license 
                to use the App for personal, non-commercial purposes only.
              </p>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-lg font-semibold mb-2">7. Disclaimers</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
                We do not guarantee uninterrupted or error-free operation. We are not liable for 
                any indirect, incidental, special, or consequential damages arising from your use 
                of the App.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-lg font-semibold mb-2">8. Account Termination</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violation 
                of these Terms or for extended inactivity. You may delete your account at any time 
                through the app settings (Profile → Settings → Privacy → Delete Account). Upon deletion, 
                all personal data will be permanently removed.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-lg font-semibold mb-2">9. Changes to Terms</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may update these Terms from time to time. Material changes will be communicated 
                through the App or via email. Continued use of the App after changes constitutes 
                acceptance of the updated Terms.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-lg font-semibold mb-2">10. Governing Law</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of Georgia. Any disputes arising from these 
                Terms shall be resolved in the courts of Georgia.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-muted/50 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">Contact Us</h2>
              <p className="text-sm text-muted-foreground mb-3">
                If you have any questions about these Terms, please contact us:
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
