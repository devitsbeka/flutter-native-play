import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowLeft, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import confetti from "canvas-confetti";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ShopSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { gems } = useCurrency();
  const [displayGems, setDisplayGems] = useState(gems);
  const { t } = useLanguage();

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#9359DD", "#B794F6", "#E9D5FF"],
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayGems(gems);
    }, 1500);
    return () => clearTimeout(timer);
  }, [gems]);

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-gradient-to-b from-background to-muted flex p-4"><div className="m-auto w-full flex justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg"
        >
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-foreground">
            {t("extra.paymentSuccess")}
          </h1>
          <p className="text-muted-foreground">
            {t("extra.gemsAddedToBalance")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-card border shadow-sm"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Gem className="w-8 h-8 text-purple-500" />
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">{t("extra.currentBalance")}</p>
              <p className="text-3xl font-bold text-foreground flex items-center gap-1">
                <Sparkles className="w-5 h-5 text-purple-500" />
                {displayGems.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Button
            onClick={() => navigate("/power-ups")}
            className="w-full"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("extra.backToShop")}
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full"
          >
            {t("extra.goToHomePage2")}
          </Button>
        </motion.div>

        {sessionId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-muted-foreground"
          >
            {t("extra.transactionId")}: {sessionId.slice(0, 20)}...
          </motion.p>
        )}
      </motion.div>
      </div>
    </div>
  );
}
