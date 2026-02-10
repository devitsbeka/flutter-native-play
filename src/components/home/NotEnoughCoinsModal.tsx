import { Crown, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { useLanguage } from "@/contexts/LanguageContext";

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
  onExchangeGems,
  onOpenDailyRewards,
  userGems,
}: NotEnoughCoinsModalProps) {
  const { t } = useLanguage();
  const coinsNeeded = requiredCoins - currentCoins;
  const gemsNeeded = Math.ceil(coinsNeeded / REWARDS.GEM_TO_COINS_RATE);
  const canExchangeGems = userGems >= gemsNeeded;

  const headerIcon = (
    <img src={coinIcon} alt="" className="w-16 h-16 object-contain" />
  );

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={headerIcon}
      title={t("modals.notEnoughCoins")}
      subtitle={t("modals.coinsRequired", { amount: requiredCoins })}
      variant="gold"
    >
      {/* Current balance */}
      <div 
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)",
          boxShadow: "0 2px 0 #E5E7EB",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{t("modals.yourBalance")}</span>
          <div className="flex items-center gap-2">
            <img src={coinIcon} alt="" className="w-6 h-6" />
            <span className="font-bold text-lg text-gray-800">{currentCoins}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-red-500 font-medium">{t("modals.youNeed")}</span>
          <div className="flex items-center gap-2">
            <img src={coinIcon} alt="" className="w-5 h-5" />
            <span className="font-bold text-red-500">{coinsNeeded}</span>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {/* Watch Ad */}
        <button
          onClick={onWatchAd}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-amber-50 transition-all"
          style={{ boxShadow: "0 2px 0 #E5E7EB" }}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <Play className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-gray-800">{t("modals.watchAd")}</p>
            <p className="text-sm text-gray-500">+{REWARDS.AD_WATCH_COINS} {t("modals.coin")}</p>
          </div>
        </button>

        {/* Exchange Gems */}
        <button
          onClick={onExchangeGems}
          disabled={!canExchangeGems}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
            canExchangeGems 
              ? "bg-gray-50 hover:bg-purple-50"
              : "bg-gray-50 opacity-50 cursor-not-allowed"
          }`}
          style={{ boxShadow: "0 2px 0 #E5E7EB" }}
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <img src={gemIcon} alt="" className="w-8 h-8" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-gray-800">{t("modals.payWithGems")}</p>
            <p className="text-sm text-gray-500">
              {gemsNeeded} {t("modals.gem")} = {gemsNeeded * REWARDS.GEM_TO_COINS_RATE} {t("modals.coin")}
              {!canExchangeGems && ` (${userGems})`}
            </p>
          </div>
        </button>

        {/* Daily Rewards */}
        <button
          onClick={onOpenDailyRewards}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-green-50 transition-all"
          style={{ boxShadow: "0 2px 0 #E5E7EB" }}
        >
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <Gift className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-gray-800">{t("modals.dailyGift")}</p>
            <p className="text-sm text-gray-500">{t("modals.getFreeCoins")}</p>
          </div>
        </button>
      </div>

      <GameModalFooter
        primaryLabel={t("common.close")}
        onPrimary={onClose}
        primaryVariant="secondary"
      />
    </GameModal>
  );
}
