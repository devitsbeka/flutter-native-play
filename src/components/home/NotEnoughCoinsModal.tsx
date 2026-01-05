import { motion, AnimatePresence } from "framer-motion";
import { X, Coins, Gem, Gift, Play } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";

interface NotEnoughCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoins: number;
  requiredCoins: number;
  onWatchAd: () => void;
  onExchangeGems: () => void;
  onOpenDailyRewards: () => void;
  userGems: number;
}

export function NotEnoughCoinsModal({
  isOpen,
  onClose,
  currentCoins,
  requiredCoins,
  onWatchAd,
  onExchangeGems,
  onOpenDailyRewards,
  userGems,
}: NotEnoughCoinsModalProps) {
  const coinsNeeded = requiredCoins - currentCoins;
  const gemsNeeded = Math.ceil(coinsNeeded / REWARDS.GEM_TO_COINS_RATE);
  const canExchangeGems = userGems >= gemsNeeded;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div 
              className="relative px-6 pt-6 pb-4 text-center"
              style={{
                background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
              }}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
              >
                <X className="w-5 h-5 text-amber-800" />
              </button>

              {/* Coin icon */}
              <motion.div
                className="mx-auto w-20 h-20 mb-3"
                animate={{ 
                  y: [0, -5, 0],
                  rotate: [-5, 5, -5]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <img src={coinIcon} alt="" className="w-full h-full object-contain drop-shadow-lg" />
              </motion.div>

              <h2 className="text-2xl font-black text-amber-800">
                არასაკმარისი მონეტა
              </h2>
              <p className="text-amber-700 mt-1">
                თამაშისთვის საჭიროა <span className="font-bold">{requiredCoins}</span> მონეტა
              </p>
            </div>

            {/* Current balance */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">შენი ბალანსი:</span>
                <div className="flex items-center gap-2">
                  <img src={coinIcon} alt="" className="w-6 h-6" />
                  <span className="font-bold text-lg text-gray-800">{currentCoins}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-red-500 font-medium">გაკლია:</span>
                <div className="flex items-center gap-2">
                  <img src={coinIcon} alt="" className="w-5 h-5" />
                  <span className="font-bold text-red-500">{coinsNeeded}</span>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="px-6 py-4 space-y-3">
              {/* Watch Ad */}
              <button
                onClick={onWatchAd}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-amber-200 hover:bg-amber-50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Play className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-800">რეკლამის ყურება</p>
                  <p className="text-sm text-gray-500">+{REWARDS.AD_WATCH_COINS} მონეტა</p>
                </div>
              </button>

              {/* Exchange Gems */}
              <button
                onClick={onExchangeGems}
                disabled={!canExchangeGems}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  canExchangeGems 
                    ? "border-gray-100 hover:border-purple-200 hover:bg-purple-50"
                    : "border-gray-100 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <img src={gemIcon} alt="" className="w-8 h-8" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-800">ალმასით გადახდა</p>
                  <p className="text-sm text-gray-500">
                    {gemsNeeded} ალმასი = {gemsNeeded * REWARDS.GEM_TO_COINS_RATE} მონეტა
                    {!canExchangeGems && ` (გაქვს: ${userGems})`}
                  </p>
                </div>
              </button>

              {/* Daily Rewards */}
              <button
                onClick={onOpenDailyRewards}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-800">დღიური საჩუქარი</p>
                  <p className="text-sm text-gray-500">აიღე უფასო მონეტები</p>
                </div>
              </button>
            </div>

            {/* Close button */}
            <div className="px-6 pb-6">
              <ChunkyButton
                variant="secondary"
                size="lg"
                onClick={onClose}
                className="w-full"
              >
                დახურვა
              </ChunkyButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
