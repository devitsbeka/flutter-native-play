import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Shield, Mail, Globe } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="კონფიდენციალურობა" />
      
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
              <h1 className="text-xl font-display font-bold text-foreground">კონფიდენციალურობის პოლიტიკა</h1>
              <p className="text-sm text-muted-foreground">ძალაშია: 2025 წლის იანვარი</p>
            </div>
          </div>

          <div className="space-y-6 text-foreground">
            {/* Introduction */}
            <section>
              <h2 className="text-lg font-semibold mb-2">შესავალი</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ჩვენ ვიცავთ თქვენს კონფიდენციალურობას. ეს პოლიტიკა აღწერს, როგორ ვაგროვებთ, 
                ვიყენებთ და ვიცავთ თქვენს პერსონალურ მონაცემებს MyTrivia-ს გამოყენებისას.
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h2 className="text-lg font-semibold mb-2">რა მონაცემებს ვაგროვებთ</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>ანგარიშის ინფორმაცია:</strong> ელ-ფოსტა, მომხმარებლის სახელი, პაროლი (დაშიფრული)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>პროფილის მონაცემები:</strong> ავატარი, ქვეყანა, თამაშის სტატისტიკა</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>თამაშის მონაცემები:</strong> ქულები, მიღწევები, თამაშის ისტორია</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>ტექნიკური მონაცემები:</strong> მოწყობილობის ტიპი, IP მისამართი, ბრაუზერი</span>
                </li>
              </ul>
            </section>

            {/* Data Usage */}
            <section>
              <h2 className="text-lg font-semibold mb-2">როგორ ვიყენებთ მონაცემებს</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>თქვენი ანგარიშის მართვა და ავტორიზაცია</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>თამაშის პროგრესის და ქულების შენახვა</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ლიდერბორდებზე თქვენი რანკის ჩვენება</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>აპლიკაციის გაუმჯობესება და ხარვეზების გასწორება</span>
                </li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-lg font-semibold mb-2">მონაცემების გაზიარება</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ჩვენ <strong>არ ვყიდით</strong> თქვენს პერსონალურ მონაცემებს მესამე პირებზე. 
                თქვენი მონაცემები გაზიარდება მხოლოდ:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>თქვენი თანხმობით</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>კანონით მოთხოვნის შემთხვევაში</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>სერვისის მიმწოდებლებთან (Supabase, Cloudflare)</span>
                </li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-lg font-semibold mb-2">მონაცემების შენახვა</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                თქვენი მონაცემები ინახება, სანამ თქვენი ანგარიში აქტიურია. 
                ანგარიშის წაშლის მოთხოვნის შემდეგ, ყველა მონაცემი წაიშლება 30 დღის განმავლობაში.
              </p>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-lg font-semibold mb-2">თქვენი უფლებები</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>წვდომა:</strong> მოითხოვეთ თქვენი მონაცემების ასლი</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>შესწორება:</strong> განაახლეთ თქვენი პროფილი</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>წაშლა:</strong> წაშალეთ თქვენი ანგარიში და მონაცემები</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>გადატანა:</strong> გადმოწერეთ თქვენი მონაცემები</span>
                </li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-lg font-semibold mb-2">ბავშვების კონფიდენციალურობა</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ჩვენი სერვისი განკუთვნილია 13 წელზე უფროსი ასაკის მომხმარებლებისთვის. 
                ჩვენ შეგნებულად არ ვაგროვებთ 13 წლამდე ბავშვების მონაცემებს.
              </p>
            </section>

            {/* Language Toggle */}
            <section className="bg-primary/5 rounded-xl p-4 border border-primary/20">
              <Link 
                to="/privacy-policy-en"
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">English Version</span>
                </div>
                <span className="text-xs text-muted-foreground">View in English →</span>
              </Link>
            </section>

            {/* Contact */}
            <section className="bg-muted/50 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">კონტაქტი</h2>
              <p className="text-sm text-muted-foreground mb-3">
                კითხვების შემთხვევაში დაგვიკავშირდით:
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
