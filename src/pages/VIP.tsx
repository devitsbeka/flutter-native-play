import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Crown, Zap, Palette, Gift, Shield, Sparkles } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";

const vipBenefits = [
  {
    icon: Zap,
    title: "2x XP ბონუსი",
    description: "მიიღე ორმაგი XP ყველა თამაშში",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: Shield,
    title: "რეკლამების გარეშე",
    description: "უწყვეტი თამაშის გამოცდილება",
    color: "from-blue-400 to-cyan-500",
  },
  {
    icon: Palette,
    title: "ექსკლუზიური ავატარები",
    description: "უნიკალური VIP ავატარები და ბეჯები",
    color: "from-purple-400 to-pink-500",
  },
  {
    icon: Gift,
    title: "ყოველდღიური ჯილდოები",
    description: "სპეციალური VIP საჩუქრები",
    color: "from-green-400 to-emerald-500",
  },
  {
    icon: Sparkles,
    title: "ადრეული წვდომა",
    description: "ახალი კატეგორიები და ფუნქციები პირველებში",
    color: "from-pink-400 to-rose-500",
  },
  {
    icon: Crown,
    title: "VIP სტატუსი",
    description: "ოქროს გვირგვინი შენი სახელის გვერდით",
    color: "from-yellow-400 to-amber-500",
  },
];

export default function VIP() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-bold">VIP</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-8">
        {/* Hero */}
        <motion.div
          className="relative overflow-hidden rounded-3xl p-6 mb-6"
          style={{
            background: "linear-gradient(135deg, hsl(45 90% 50%) 0%, hsl(35 90% 45%) 100%)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Glow effect */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/20 blur-3xl" />

          <div className="relative text-center">
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Crown className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">
              გახდი VIP
            </h2>
            <p className="text-white/80 text-sm mb-4">
              განბლოკე ყველა ექსკლუზიური ფუნქცია
            </p>
            <div className="flex items-center justify-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-white text-white"
                />
              ))}
            </div>
            <p className="text-white/70 text-xs">4.9 (2,500+ მომხმარებელი)</p>
          </div>
        </motion.div>

        {/* Benefits */}
        <h3 className="text-lg font-display font-bold text-foreground mb-4">
          VIP უპირატესობები
        </h3>
        <div className="grid gap-3 mb-6">
          {vipBenefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${benefit.color}`}
              >
                <benefit.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pricing */}
        <motion.div
          className="bg-muted rounded-2xl p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">თვიური გამოწერა</p>
              <p className="text-2xl font-display font-bold text-foreground">
                ₾9.99<span className="text-sm text-muted-foreground font-normal">/თვე</span>
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
              -40% დაზოგვა
            </div>
          </div>
          <ChunkyButton 
            className="w-full"
            onClick={() => {
              if (!user) {
                navigate("/auth");
              } else {
                // TODO: Implement payment
                console.log("Subscribe to VIP");
              }
            }}
          >
            <Crown className="w-5 h-5 mr-2" />
            გააქტიურე VIP
          </ChunkyButton>
        </motion.div>

        {/* Annual option */}
        <motion.div
          className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-foreground">წლიური გამოწერა</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
              საუკეთესო ფასი
            </span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground mb-1">
            ₾79.99<span className="text-sm text-muted-foreground font-normal">/წელი</span>
          </p>
          <p className="text-sm text-muted-foreground">
            ₾6.67/თვე • დაზოგე ₾40
          </p>
        </motion.div>

        {/* Terms */}
        <p className="text-xs text-center text-muted-foreground mt-6 px-4">
          გამოწერის გაუქმება შესაძლებელია ნებისმიერ დროს.
          გამოწერა ავტომატურად განახლდება, თუ არ გააუქმებთ.
        </p>
      </div>
    </div>
  );
}
