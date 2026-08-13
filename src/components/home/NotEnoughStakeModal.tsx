import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { NotEnoughCoinsModal } from "@/components/home/NotEnoughCoinsModal";
import { useCurrency } from "@/hooks/useCurrency";
import { useGameStake } from "@/hooks/useGameStake";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { REWARDS } from "@/config/rewardConfig";

/**
 * "You need 500 coins to play" — and the two ways out of it.
 *
 * Every screen that can start a game has to be able to say this, and each one
 * that grew its own copy also grew its own copy of the gems-for-coins
 * exchange behind it. This is that answer once: the modal, the exchange, and
 * the guard against double-taps while the exchange is in flight.
 */
export function NotEnoughStakeModal({
  isOpen,
  onClose,
  onDailyRewards,
}: {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Opens the daily rewards. Screens that own the rewards modal pass their
   * own opener; the rest fall through to the home screen, which does.
   */
  onDailyRewards?: () => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { coins, gems, exchangeGemsForCoins } = useCurrency();
  const { stakeAmount } = useGameStake();

  // A single atomic RPC — a spend-then-add pair could take the gems and never
  // deliver the coins.
  const exchanging = useRef(false);
  const handleExchangeGems = useCallback(async () => {
    if (exchanging.current) return;
    const gemsNeeded = Math.ceil((stakeAmount - coins) / REWARDS.GEM_TO_COINS_RATE);
    if (gemsNeeded <= 0 || gems < gemsNeeded) return;

    exchanging.current = true;
    try {
      if (await exchangeGemsForCoins(gemsNeeded)) {
        onClose();
      } else {
        toast({ title: t("shop.purchaseFailed"), variant: "destructive" });
      }
    } finally {
      exchanging.current = false;
    }
  }, [stakeAmount, coins, gems, exchangeGemsForCoins, onClose, toast, t]);

  return (
    <NotEnoughCoinsModal
      isOpen={isOpen}
      onClose={onClose}
      currentCoins={coins}
      requiredCoins={stakeAmount}
      userGems={gems}
      onExchangeGems={handleExchangeGems}
      onOpenDailyRewards={() => {
        onClose();
        if (onDailyRewards) onDailyRewards();
        else navigate("/?daily=1");
      }}
    />
  );
}
