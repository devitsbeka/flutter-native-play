import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Minus, Plus, Sparkles } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCompactNumber } from "@/lib/utils";
import { REWARDS } from "@/config/rewardConfig";
import { toast } from "@/lib/toast";
import confetti from "canvas-confetti";

import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

interface CurrencyExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Canonical rate: 1 gem = 500 coins (rewardConfig.ts)
const COINS_PER_GEM = REWARDS.GEM_TO_COINS_RATE;

// Predefined exchange amounts
const COIN_TO_GEM_PRESETS = [500, 1500, 2500, 5000];
const GEM_TO_COIN_PRESETS = [1, 2, 5, 10];

type ExchangeDirection = "coins-to-gems" | "gems-to-coins";

export function CurrencyExchangeModal({ isOpen, onClose }: CurrencyExchangeModalProps) {
  const { coins, gems, exchangeCurrency } = useCurrency();
  const { playSound } = useSound();
  const { t } = useLanguage();
  
  const [direction, setDirection] = useState<ExchangeDirection>("coins-to-gems");
  const [amount, setAmount] = useState(COINS_PER_GEM);
  const [isExchanging, setIsExchanging] = useState(false);

  const isCoinsToGems = direction === "coins-to-gems";
  
  // Calculate exchange result
  const getExchangeResult = () => {
    if (isCoinsToGems) {
      return Math.floor(amount / COINS_PER_GEM);
    } else {
      return amount * COINS_PER_GEM;
    }
  };

  const exchangeResult = getExchangeResult();
  
  // Check if user can afford
  const canAfford = isCoinsToGems ? coins >= amount : gems >= amount;
  const hasValidResult = exchangeResult > 0;

  const handleDirectionSwitch = () => {
    playSound("button-click");
    setDirection(prev => prev === "coins-to-gems" ? "gems-to-coins" : "coins-to-gems");
    setAmount(isCoinsToGems ? 1 : COINS_PER_GEM);
  };

  const handlePresetClick = (preset: number) => {
    playSound("button-click");
    setAmount(preset);
  };

  const handleIncrement = () => {
    const step = isCoinsToGems ? COINS_PER_GEM : 1;
    setAmount(prev => prev + step);
  };

  const handleDecrement = () => {
    const step = isCoinsToGems ? COINS_PER_GEM : 1;
    const min = isCoinsToGems ? COINS_PER_GEM : 1;
    setAmount(prev => Math.max(min, prev - step));
  };

  const handleExchange = async () => {
    if (!canAfford || !hasValidResult) return;

    setIsExchanging(true);
    playSound("button-click");

    try {
      // One call, one transaction, and the rate is the server's. The old
      // spend-then-credit pair could take the coins and fail to deliver the
      // gems, and passed both sides of the trade from here — so a gem could
      // have been exchanged for any number of coins.
      const success = await exchangeCurrency(
        isCoinsToGems ? "coins_to_gems" : "gems_to_coins",
        amount,
      );

      if (success) {
        playSound("reward");
        
        // Celebration
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: isCoinsToGems ? ["#8B5CF6", "#A855F7", "#C084FC"] : ["#F59E0B", "#FBBF24", "#FCD34D"],
        });

        toast.success(
          isCoinsToGems 
            ? t("shop.exchangedCoins").replace("{coins}", formatCompactNumber(amount)).replace("{gems}", String(exchangeResult))
            : t("shop.exchangedGems").replace("{gems}", String(amount)).replace("{coins}", formatCompactNumber(exchangeResult))
        );
        
        onClose();
      }
    } catch (error) {
      console.error("Exchange failed:", error);
      toast.error(t("shop.exchangeFailed"));
    } finally {
      setIsExchanging(false);
    }
  };

  const presets = isCoinsToGems ? COIN_TO_GEM_PRESETS : GEM_TO_COIN_PRESETS;

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("shop.currencyExchange")}
    >
      <div className="space-y-3">
        {/* Exchange Direction - Icons only */}
        <div className="flex items-center justify-center gap-4 py-2">
          <motion.div 
            className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-colors ${
              isCoinsToGems 
                ? "bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700" 
                : "bg-muted border-2 border-transparent"
            }`}
            animate={{ scale: isCoinsToGems ? 1.05 : 1 }}
          >
            <img src={coinIcon} alt="" className="w-8 h-8" />
          </motion.div>
          
          <motion.button
            onClick={handleDirectionSwitch}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <ArrowLeftRight className="w-5 h-5 text-primary-foreground" />
          </motion.button>
          
          <motion.div 
            className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-colors ${
              !isCoinsToGems 
                ? "bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-300 dark:border-violet-700" 
                : "bg-muted border-2 border-transparent"
            }`}
            animate={{ scale: !isCoinsToGems ? 1.05 : 1 }}
          >
            <img src={gemIcon} alt="" className="w-8 h-8" />
          </motion.div>
        </div>

        {/* Amount Selector */}
        <div className="bg-muted/50 rounded-2xl p-3 border border-border">
          <div className="flex items-center justify-center gap-3">
            <motion.button
              onClick={handleDecrement}
              className="w-9 h-9 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Minus className="w-4 h-4 text-foreground" />
            </motion.button>
            
            <div className="flex items-center gap-2 min-w-[100px] justify-center">
              <img src={isCoinsToGems ? coinIcon : gemIcon} alt="" className="w-7 h-7" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={amount}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-xl font-black text-foreground"
                >
                  {formatCompactNumber(amount)}
                </motion.span>
              </AnimatePresence>
            </div>
            
            <motion.button
              onClick={handleIncrement}
              className="w-9 h-9 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="w-4 h-4 text-foreground" />
            </motion.button>
          </div>

          {/* Preset Amounts */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {presets.map((preset) => (
              <motion.button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                  amount === preset
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border text-foreground hover:bg-muted"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {formatCompactNumber(preset)}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Exchange Result - One line */}
        <div className="flex items-center justify-center gap-2 py-2">
          <img src={isCoinsToGems ? gemIcon : coinIcon} alt="" className="w-7 h-7" />
          <AnimatePresence mode="wait">
            <motion.span
              key={exchangeResult}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-xl font-black text-primary"
            >
              {formatCompactNumber(exchangeResult)}
            </motion.span>
          </AnimatePresence>
          <span className="text-base font-bold text-muted-foreground">
            {isCoinsToGems ? t("shop.diamond") : t("shop.coin")}
          </span>
        </div>

        {/* Error Message */}
        {!canAfford && (
          <p className="text-center text-xs text-destructive">
            {isCoinsToGems ? t("shop.notEnoughCoins") : t("shop.notEnoughGems")}
          </p>
        )}
        
        {!hasValidResult && canAfford && (
          <p className="text-center text-xs text-muted-foreground">
            {t("shop.minimumRequired").replace("{amount}", String(COINS_PER_GEM))}
          </p>
        )}

        {/* Exchange Button */}
        <motion.div
          whileHover={{ scale: canAfford && hasValidResult ? 1.02 : 1 }}
          whileTap={{ scale: canAfford && hasValidResult ? 0.98 : 1 }}
        >
          <Button
            onClick={handleExchange}
            disabled={!canAfford || !hasValidResult || isExchanging}
            className="w-full h-14 text-lg font-black rounded-xl bg-primary hover:bg-primary/90"
            style={{ 
              boxShadow: canAfford && hasValidResult 
                ? "0 4px 0 hsl(var(--primary) / 0.7)"
                : "none"
            }}
          >
            {isExchanging ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Sparkles className="w-6 h-6" />
              </motion.div>
            ) : (
              <>
                <ArrowLeftRight className="w-6 h-6 mr-2" />
                {t("shop.exchangeButton")}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </GameModal>
  );
}
