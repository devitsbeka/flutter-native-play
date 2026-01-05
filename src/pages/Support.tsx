import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { HelpCircle, Mail, MessageCircle, Bug, Lightbulb, ChevronRight, ExternalLink } from "lucide-react";

const faqs = [
  {
    question: "როგორ ვითამაშო მეგობრებთან?",
    answer: "გადადი 'გუნდი' განყოფილებაში, შექმენი ახალი ოთახი და გაუზიარე კოდი მეგობრებს. ისინი შეძლებენ შემოერთებას კოდით.",
  },
  {
    question: "როგორ აღვადგინო შესყიდვები?",
    answer: "გადადი მაღაზიაში და დააჭირე 'შესყიდვების აღდგენა' ღილაკს. დარწმუნდი რომ იგივე Apple ID-ით ხარ შესული.",
  },
  {
    question: "როგორ წავშალო ანგარიში?",
    answer: "გადადი პროფილში → პარამეტრები → კონფიდენციალურობა → ანგარიშის წაშლა. ყველა მონაცემი სამუდამოდ წაიშლება.",
  },
  {
    question: "როგორ გავაუქმო VIP გამოწერა?",
    answer: "გახსენი iPhone-ის Settings → Apple ID → Subscriptions და იპოვე World Quizzes. აქედან შეგიძლია გაუქმება.",
  },
  {
    question: "რატომ არ მუშაობს push შეტყობინებები?",
    answer: "გადადი iPhone-ის Settings → Notifications → World Quizzes და ჩართე შეტყობინებები. ასევე დარწმუნდი რომ Do Not Disturb გამორთულია.",
  },
  {
    question: "How do I delete my account?",
    answer: "Go to Profile → Settings (gear icon) → Privacy → Delete Account. All your data will be permanently removed within 30 days.",
  },
  {
    question: "How do I restore my purchases?",
    answer: "Go to the VIP page and tap 'Restore Purchases'. Make sure you're signed in with the same Apple ID used for the original purchase.",
  },
];

const contactOptions = [
  {
    icon: Mail,
    title: "ელ-ფოსტა",
    description: "დაგვიკავშირდი ელ-ფოსტით",
    action: "mailto:support@worldquizzes.app",
    color: "from-blue-400 to-cyan-500",
  },
  {
    icon: Bug,
    title: "ხარვეზის რეპორტი",
    description: "შეგვატყობინე პრობლემის შესახებ",
    action: "mailto:bugs@worldquizzes.app?subject=Bug Report",
    color: "from-red-400 to-orange-500",
  },
  {
    icon: Lightbulb,
    title: "შეთავაზება",
    description: "გაგვიზიარე იდეა",
    action: "mailto:ideas@worldquizzes.app?subject=Feature Request",
    color: "from-amber-400 to-yellow-500",
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="დახმარება" />

      <div className="p-4 pb-12 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground mb-2">
            როგორ შეგვიძლია დაგეხმაროთ?
          </h1>
          <p className="text-sm text-muted-foreground">
            იპოვე პასუხი ხშირად დასმულ კითხვებზე ან დაგვიკავშირდი
          </p>
        </motion.div>

        {/* Contact Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-display font-bold text-foreground mb-3">
            დაგვიკავშირდი
          </h2>
          <div className="grid gap-3">
            {contactOptions.map((option) => (
              <a
                key={option.title}
                href={option.action}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center`}>
                  <option.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <ExternalLink className="w-5 h-5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-display font-bold text-foreground mb-3">
            ხშირად დასმული კითხვები
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className={`group ${index !== faqs.length - 1 ? "border-b border-border" : ""}`}
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground text-left">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pl-12">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </motion.div>

        {/* App Version */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center pt-4"
        >
          <p className="text-xs text-muted-foreground">
            World Quizzes v1.0.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © 2025 World Quizzes. ყველა უფლება დაცულია.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
