import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Star, Crown, Zap, Palette, Gift, Shield, Sparkles, RotateCcw } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { useInAppPurchases, IAP_PRODUCTS } from "@/hooks/useInAppPurchases";
import { useVipStatus } from "@/hooks/useVipStatus";

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

// Pricing constants
const MONTHLY_PRICE = 9.99;
const ANNUAL_PRICE = 79.99;
const MONTHLY_TOTAL = MONTHLY_PRICE * 12;
const SAVINGS = MONTHLY_TOTAL - ANNUAL_PRICE;
const SAVINGS_PERCENT = Math.round((SAVINGS / MONTHLY_TOTAL) * 100);

export default function VIP() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchase, restorePurchases, purchasing } = useInAppPurchases();
  const { isVip, getDaysRemaining } = useVipStatus();
  const [restoring, setRestoring] = useState(false);

  const handlePurchaseMonthly = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    await purchase(IAP_PRODUCTS.VIP_MONTHLY);
  };

  const handlePurchaseAnnual = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    await purchase(IAP_PRODUCTS.VIP_ANNUAL);
  };

  const handleRestore = async () => {
    setRestoring(true);
    await restorePurchases();
    setRestoring(false);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <PageHeader title="მაღაზია" />

      {/* Content */}
      <div className="p-4 pb-8 max-w-[700px] md:max-w-[600px] mx-auto">
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
          </div>
        </motion.div>

        {/* Benefits */}
        <h3 className="text-lg font-display font-bold text-slate-800 mb-4">
          VIP უპირატესობები
        </h3>
        <div className="grid gap-3 mb-6">
          {vipBenefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200"
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
                <h4 className="font-semibold text-slate-800">{benefit.title}</h4>
                <p className="text-sm text-slate-600">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* VIP Status Banner (if already VIP) */}
        {isVip && (
          <motion.div
            className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 mb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-white" />
              <div>
                <p className="font-bold text-white">VIP აქტიურია!</p>
                <p className="text-white/80 text-sm">{getDaysRemaining()} დღე დარჩენილია</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pricing */}
        <motion.div
          className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-slate-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600">თვიური გამოწერა</p>
              <p className="text-2xl font-display font-bold text-slate-800">
                ₾{MONTHLY_PRICE}<span className="text-sm text-slate-600 font-normal">/თვე</span>
              </p>
            </div>
          </div>
          <ChunkyButton 
            className="w-full"
            onClick={handlePurchaseMonthly}
            disabled={purchasing}
          >
            <Crown className="w-5 h-5 mr-2" />
            {purchasing ? "მიმდინარეობს..." : "გააქტიურე VIP"}
          </ChunkyButton>
        </motion.div>

        {/* Annual option */}
        <motion.div
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 mb-4 border border-amber-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-slate-800">წლიური გამოწერა</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
              საუკეთესო ფასი
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xl font-display font-bold text-slate-800">
                ₾{ANNUAL_PRICE}<span className="text-sm text-slate-600 font-normal">/წელი</span>
              </p>
              <p className="text-sm text-slate-600">
                ₾{(ANNUAL_PRICE / 12).toFixed(2)}/თვე • დაზოგე ₾{SAVINGS.toFixed(0)}
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
              -{SAVINGS_PERCENT}% დაზოგვა
            </div>
          </div>
          <ChunkyButton 
            className="w-full"
            variant="primary"
            onClick={handlePurchaseAnnual}
            disabled={purchasing}
          >
            <Crown className="w-5 h-5 mr-2" />
            {purchasing ? "მიმდინარეობს..." : "წლიური გამოწერა"}
          </ChunkyButton>
        </motion.div>

        {/* Restore Purchases */}
        <motion.button
          className="w-full flex items-center justify-center gap-2 py-3 text-primary text-sm font-medium"
          onClick={handleRestore}
          disabled={restoring}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <RotateCcw className={`w-4 h-4 ${restoring ? "animate-spin" : ""}`} />
          {restoring ? "მიმდინარეობს..." : "შესყიდვების აღდგენა"}
        </motion.button>

        {/* Apple Required Subscription Terms */}
        <div className="mt-6 space-y-3 px-2">
          {/* Georgian Terms */}
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>ავტომატური განახლება:</strong> გამოწერა ავტომატურად განახლდება პერიოდის 
            ბოლოს, თუ გაუქმება არ მოხდა მინიმუმ 24 საათით ადრე.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>გადახდა:</strong> თანხა ჩამოიჭრება თქვენი iTunes/Apple ID ანგარიშიდან 
            შეძენის დადასტურებისას.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>გაუქმება:</strong> გამოწერის გაუქმება შეგიძლიათ App Store-ის პარამეტრებში 
            ნებისმიერ დროს. მიმდინარე პერიოდის თანხა არ დაბრუნდება.
          </p>

          {/* English Terms (Required by Apple) */}
          <div className="border-t border-slate-200 pt-3 mt-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Auto-renewal:</strong> Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Payment:</strong> Payment will be charged to your iTunes/Apple ID account at confirmation of purchase.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Cancellation:</strong> You can manage and cancel your subscription in your App Store account settings. No refund for the current period.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <button 
              onClick={() => navigate("/privacy-policy")}
              className="text-xs text-primary underline"
            >
              კონფიდენციალურობა
            </button>
            <span className="text-slate-300">|</span>
            <button 
              onClick={() => navigate("/terms")}
              className="text-xs text-primary underline"
            >
              პირობები
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
