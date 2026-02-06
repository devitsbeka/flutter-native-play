import { PowerUpType } from "@/hooks/useUserPowerUps";
import { REWARDS } from "@/config/rewardConfig";

import icon5050 from "@/assets/powers/5050.png";
import iconFreeze from "@/assets/powers/freeze.png";
import iconReplace from "@/assets/powers/replace.png";
import iconTimeDrain from "@/assets/powers/time-drain.png";
import coinIcon from "@/assets/icons/icon-coin.png";

const POWER_UP_ICONS: Record<PowerUpType, string> = {
  "5050": icon5050,
  freeze: iconFreeze,
  replace: iconReplace,
  "time-drain": iconTimeDrain,
};

const POWER_UP_ORDER: PowerUpType[] = ["5050", "freeze", "replace", "time-drain"];

interface MyPowersSectionProps {
  powerUps: Record<PowerUpType, number>;
  onPurchaseSingle: (powerType: PowerUpType) => Promise<void>;
  isPurchasing: string | null;
  canAffordCoins: (amount: number) => boolean;
  onCardClick?: (type: PowerUpType) => void;
}

export function MyPowersSection({ powerUps, onPurchaseSingle, isPurchasing, canAffordCoins, onCardClick }: MyPowersSectionProps) {
  // Triple-layer defense: ensure powerUps is always a valid object
  const safeData = powerUps ?? { "5050": 0, freeze: 0, replace: 0, "time-drain": 0 };
  
  return (
    <div className="px-4 pt-1.5 pb-4 relative z-10">
      <h2 className="text-lg font-display text-foreground mb-4">ჩემი ძალები</h2>
      
      <div className="grid grid-cols-4 gap-3 mt-6">
        {POWER_UP_ORDER.map((type) => {
          const count = safeData[type] ?? 0;
          const isLoading = isPurchasing === `single_${type}`;
          const price = REWARDS.POWER_UP_PRICES[type] ?? 100;
          const canAfford = canAffordCoins(price);
          
          return (
            <div
              key={type}
              onClick={() => onCardClick?.(type)}
              className="relative flex flex-col items-center gap-3 px-3 pt-8 pb-4 rounded-2xl liquid-glass cursor-pointer active:scale-95 transition-transform"
            >
              <img 
                src={POWER_UP_ICONS[type]} 
                alt="" 
                className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 object-contain" 
              />
              <span className="font-bold text-lg text-foreground">
                {count}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onPurchaseSingle(type); }}
                disabled={isLoading || !canAfford}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-warning/20 border border-warning/30 text-warning-foreground hover:bg-warning/30 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <img src={coinIcon} alt="" className="w-4 h-4" />
                    <span className="text-sm font-semibold">{price}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
