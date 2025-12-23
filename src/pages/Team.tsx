import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Bell, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

const features = [
  { id: 1, text: "შექმენი ან შეუერთდი გუნდს მეგობრებთან ერთად" },
  { id: 2, text: "რეალურ დროში გუნდი გუნდის წინააღმდეგ" },
  { id: 3, text: "გუნდის რეიტინგები და ლიდერბორდი" },
  { id: 4, text: "ყოველკვირეული გუნდური ტურნირები" },
];

export default function Team() {
  const navigate = useNavigate();
  const [isNotified, setIsNotified] = useState(false);

  const handleNotify = () => {
    setIsNotified(true);
    toast.success("შენ მიიღებ შეტყობინებას როცა გუნდური ბრძოლები გაეშვება! 🎉");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Sky Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(180deg, hsl(195 85% 75%) 0%, hsl(195 80% 85%) 50%, hsl(45 40% 90%) 100%)"
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 py-8">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 backdrop-blur-sm text-slate-600 hover:bg-white/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">უკან</span>
        </motion.button>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-sm w-full">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
            style={{
              background: "linear-gradient(135deg, hsl(220 70% 50%) 0%, hsl(260 60% 55%) 100%)",
              boxShadow: "0 12px 40px hsl(240 60% 50% / 0.3)"
            }}
          >
            <Users className="w-14 h-14 text-white" />
          </motion.div>

          {/* Coming Soon Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 mb-3"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-purple-600 uppercase tracking-wide">
              მალე დაემატება
            </span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl font-display font-bold text-slate-800 mb-3 text-center"
          >
            გუნდური ბრძოლები
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 text-center mb-8 leading-relaxed"
          >
            გაერთიანდი მეგობრებთან და იბრძოლე სხვა გუნდების წინააღმდეგ ეპიკურ ტრივია ბრძოლებში. რეალურ დროში მულტიპლეიერი მალე!
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full space-y-3 mb-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.08 }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50"
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(280 70% 60%), hsl(320 70% 60%))" }}
                />
                <span className="text-sm text-slate-700 font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Notify Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleNotify}
            disabled={isNotified}
            className="w-full relative"
            whileTap={{ scale: 0.98, y: 3 }}
          >
            <div 
              className="absolute inset-0 rounded-2xl"
              style={{ background: "hsl(220 25% 20%)", transform: "translateY(4px)" }}
            />
            <div 
              className={`relative rounded-2xl px-6 py-4 flex items-center justify-center gap-3 transition-colors ${
                isNotified ? "bg-green-500" : ""
              }`}
              style={!isNotified ? { background: "linear-gradient(180deg, hsl(220 20% 30%) 0%, hsl(220 25% 25%) 100%)" } : undefined}
            >
              {isNotified ? (
                <>
                  <Check className="w-5 h-5 text-white" />
                  <span className="font-display text-white text-base font-bold">
                    შეტყობინება ჩართულია
                  </span>
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5 text-white" />
                  <span className="font-display text-white text-base font-bold">
                    შემატყობინე როცა გაეშვება
                  </span>
                </>
              )}
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
