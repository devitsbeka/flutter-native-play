import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileText, Mail, Globe } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="პირობები" />
      
      <div className="p-4 pb-12">
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
              <h1 className="text-xl font-display font-bold text-foreground">მომსახურების პირობები</h1>
              <p className="text-sm text-muted-foreground">ძალაშია: 2025 წლის იანვარი</p>
            </div>
          </div>

          <div className="space-y-6 text-foreground">
            {/* Acceptance */}
            <section>
              <h2 className="text-lg font-semibold mb-2">1. პირობების მიღება</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                World Quizzes-ის გამოყენებით თქვენ ეთანხმებით ამ მომსახურების პირობებს.
                თუ არ ეთანხმებით რომელიმე პირობას, გთხოვთ, არ გამოიყენოთ აპლიკაცია.
              </p>
            </section>

            {/* Account Rules */}
            <section>
              <h2 className="text-lg font-semibold mb-2">2. ანგარიშის წესები</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>თქვენ პასუხისმგებელი ხართ თქვენი ანგარიშის უსაფრთხოებაზე</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>არ გაუზიაროთ თქვენი პაროლი სხვებს</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>დაუყოვნებლივ შეგვატყობინეთ უნებართვო წვდომის შესახებ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>თითო მომხმარებელს ერთი ანგარიშის ქონა შეუძლია</span>
                </li>
              </ul>
            </section>

            {/* Prohibited Conduct */}
            <section>
              <h2 className="text-lg font-semibold mb-2">3. აკრძალული ქმედებები</h2>
              <p className="text-sm text-muted-foreground mb-2">თქვენ არ შეგიძლიათ:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>გამოიყენოთ ჩიტები, ბოტები ან ავტომატიზაციის ხელსაწყოები</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>შეურაცხყოთ ან შეავიწროვოთ სხვა მომხმარებლები</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>გავრცელოთ შეურაცხმყოფელი ან უკანონო კონტენტი</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>სცადოთ სისტემის გატეხვა ან მანიპულაცია</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>იყოთ ცრუ ინფორმაცია თქვენს ვინაობაზე</span>
                </li>
              </ul>
            </section>

            {/* Virtual Items */}
            <section>
              <h2 className="text-lg font-semibold mb-2">4. ვირტუალური საგნები</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                თამაშში არსებული ვირტუალური ვალუტა (მონეტები, ალმასები) და საგნები 
                არ აქვს რეალური ღირებულება და არ შეიძლება რეალურ ფულზე გაცვლა. 
                ჩვენ ვინარჩუნებთ უფლებას შევცვალოთ ან წავშალოთ ვირტუალური საგნები.
              </p>
            </section>

            {/* Subscriptions */}
            <section>
              <h2 className="text-lg font-semibold mb-2">5. VIP გამოწერა</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>გამოწერა ავტომატურად განახლდება პერიოდის ბოლოს</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>გაუქმება შესაძლებელია ნებისმიერ დროს</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>უკვე გადახდილი თანხა არ დაბრუნდება</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>ფასები შეიძლება შეიცვალოს წინასწარი შეტყობინებით</span>
                </li>
              </ul>
            </section>

            {/* IP Rights */}
            <section>
              <h2 className="text-lg font-semibold mb-2">6. ინტელექტუალური საკუთრება</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                World Quizzes-ის კონტენტი, დიზაინი, ლოგო და სასაქონლო ნიშნები არის ჩვენი საკუთრება.
                თქვენ მიიღებთ შეზღუდულ ლიცენზიას აპლიკაციის პირადი მოხმარებისთვის.
              </p>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-lg font-semibold mb-2">7. პასუხისმგებლობის შეზღუდვა</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                აპლიკაცია მოწოდებულია „როგორც არის" პრინციპით. ჩვენ არ ვიძლევით გარანტიას 
                უწყვეტ მუშაობაზე. არ ვაგებთ პასუხს არაპირდაპირ ზარალზე.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-lg font-semibold mb-2">8. ანგარიშის შეჩერება</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ჩვენ ვინარჩუნებთ უფლებას შევაჩეროთ ან წავშალოთ ანგარიში პირობების დარღვევის 
                ან უმოქმედობის შემთხვევაში. თქვენ ნებისმიერ დროს შეგიძლიათ თქვენი ანგარიშის წაშლა.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-lg font-semibold mb-2">9. პირობების ცვლილება</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ჩვენ შეგვიძლია განვაახლოთ ეს პირობები. მნიშვნელოვანი ცვლილებების შესახებ 
                შეტყობინება გამოგიგზავნით. აპლიკაციის გამოყენების გაგრძელება ნიშნავს ახალი პირობების მიღებას.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-lg font-semibold mb-2">10. მოქმედი კანონმდებლობა</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ეს პირობები რეგულირდება საქართველოს კანონმდებლობით. დავები განიხილება 
                საქართველოს სასამართლოებში.
              </p>
            </section>

            {/* Language Toggle */}
            <section className="bg-primary/5 rounded-xl p-4 border border-primary/20">
              <Link 
                to="/terms-en"
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
