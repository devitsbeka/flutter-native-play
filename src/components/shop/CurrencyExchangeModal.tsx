import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftRight, Minus, Plus, Sparkles } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { formatCompactNumber } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

interface CurrencyExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Exchange rates: 1 gem = 50 coins
const COINS_PER_GEM = 50;

// Predefined exchange amounts
const COIN_TO_GEM_PRESETS = [100, 250, 500, 1000];
const GEM_TO_COIN_PRESETS = [2, 5, 10, 20];

type ExchangeDirection = "coins-to-gems" | "gems-to-coins";

export function CurrencyExchangeModal({ isOpen, onClose }: CurrencyExchangeModalProps) {
  const { coins, gems, spendCoins, addGems, spendGems, addCoins } = useCurrency();
  const { playSound } = useSound();
  
  const [direction, setDirection] = useState<ExchangeDirection>("coins-to-gems");
  const [amount, setAmount] = useState(100);
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
    setAmount(isCoinsToGems ? 2 : 100);
  };

  const handlePresetClick = (preset: number) => {
    playSound("button-click");
    setAmount(preset);
  };

  const handleIncrement = () => {
    const step = isCoinsToGems ? 50 : 1;
    setAmount(prev => prev + step);
  };

  const handleDecrement = () => {
    const step = isCoinsToGems ? 50 : 1;
    const min = isCoinsToGems ? 50 : 1;
    setAmount(prev => Math.max(min, prev - step));
  };

  const handleExchange = async () => {
    if (!canAfford || !hasValidResult) return;

    setIsExchanging(true);
    playSound("button-click");

    try {
      let success = false;
      
      if (isCoinsToGems) {
        const spent = await spendCoins(amount);
        if (spent) {
          success = await addGems(exchangeResult);
        }
      } else {
        const spent = await spendGems(amount);
        if (spent) {
          success = await addCoins(exchangeResult);
        }
      }

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
            ? `გადაცვალე ${formatCompactNumber(amount)} მონეტა → ${exchangeResult} 💎`
            : `გადაცვალე ${amount} ალმასი → ${formatCompactNumber(exchangeResult)} 🪙`
        );
        
        onClose();
      }
    } catch (error) {
      console.error("Exchange failed:", error);
      toast.error("გაცვლა ვერ მოხერხდა");
    } finally {
      setIsExchanging(false);
    }
  };

  const presets = isCoinsToGems ? COIN_TO_GEM_PRESETS : GEM_TO_COIN_PRESETS;

  const headerIcon = (
    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
      <ArrowLeftRight className="w-10 h-10 text-white" />
    </div>
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={headerIcon}
      title="ვალუტის გაცვლა"
      subtitle="გადაცვალე მონეტები და ალმასები"
    >
      <div className="space-y-3">
        {/* Exchange Direction - Icons only */}
        <div className="flex items-center justify-center gap-4 py-2">
          <motion.div 
            className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-colors ${
              isCoinsToGems 
                ? "bg-amber-100 border-2 border-amber-300" 
                : "bg-muted border-2 border-transparent"
            }`}
            animate={{ scale: isCoinsToGems ? 1.05 : 1 }}
          >
            <img src={coinIcon} alt="" className="w-8 h-8" />
          </motion.div>
          
          <motion.button
            onClick={handleDirectionSwitch}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <ArrowLeftRight className="w-5 h-5 text-white" />
          </motion.button>
          
          <motion.div 
            className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-colors ${
              !isCoinsToGems 
                ? "bg-violet-100 border-2 border-violet-300" 
                : "bg-muted border-2 border-transparent"
            }`}
            animate={{ scale: !isCoinsToGems ? 1.05 : 1 }}
          >
            <img src={gemIcon} alt="" className="w-8 h-8" />
          </motion.div>
        </div>

        {/* Amount Selector */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-3 border border-slate-200">
          <div className="flex items-center justify-center gap-3">
            <motion.button
              onClick={handleDecrement}
              className="w-9 h-9 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Minus className="w-4 h-4 text-slate-600" />
            </motion.button>
            
            <div className="flex items-center gap-2 min-w-[100px] justify-center">
              <img src={isCoinsToGems ? coinIcon : gemIcon} alt="" className="w-7 h-7" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={amount}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="text-xl font-black"
                >
                  {formatCompactNumber(amount)}
                </motion.span>
              </AnimatePresence>
            </div>
            
            <motion.button
              onClick={handleIncrement}
              className="w-9 h-9 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="w-4 h-4 text-slate-600" />
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
                    ? isCoinsToGems
                      ? "bg-amber-500 text-white"
                      : "bg-violet-500 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
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
              className={`text-xl font-black ${
                isCoinsToGems ? "text-violet-700" : "text-amber-700"
              }`}
            >
              {formatCompactNumber(exchangeResult)}
            </motion.span>
          </AnimatePresence>
          <span className="text-base font-bold text-muted-foreground">
            {isCoinsToGems ? "ალმასი" : "მონეტა"}
          </span>
        </div>

        {/* Error Message */}
        {!canAfford && (
          <p className="text-center text-xs text-destructive">
            არ გაქვს საკმარისი {isCoinsToGems ? "მონეტა" : "ალმასი"}
          </p>
        )}
        
        {!hasValidResult && canAfford && (
          <p className="text-center text-xs text-muted-foreground">
            მინიმუმ {COINS_PER_GEM} მონეტა საჭიროა
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
            className={`w-full h-14 text-lg font-black rounded-xl ${
              isCoinsToGems
                ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
            }`}
            style={{ 
              boxShadow: canAfford && hasValidResult 
                ? isCoinsToGems 
                  ? "0 4px 0 #6D28D9" 
                  : "0 4px 0 #B45309"
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
                გადაცვლა
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </GameModal>
  );
}
