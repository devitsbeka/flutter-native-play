import { Plus } from "lucide-react";
import { PowerUpType } from "@/hooks/useUserPowerUps";

import icon5050 from "@/assets/powers/5050.png";
import iconFreeze from "@/assets/powers/freeze.png";
import iconReplace from "@/assets/powers/replace.png";
import iconTimeDrain from "@/assets/powers/time-drain.png";

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
}

export function MyPowersSection({ powerUps = { "5050": 0, freeze: 0, replace: 0, "time-drain": 0 }, onPurchaseSingle, isPurchasing }: MyPowersSectionProps) {
  return (
    <div className="px-4 py-4">
      <h2 className="text-lg font-bold text-foreground mb-3">ჩემი ძალები</h2>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {POWER_UP_ORDER.map((type) => {
          const count = powerUps?.[type] ?? 0;
          const isLoading = isPurchasing === `single_${type}`;
          
          return (
            <div
              key={type}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-sm min-w-fit"
            >
              <img 
                src={POWER_UP_ICONS[type]} 
                alt="" 
                className="w-8 h-8 object-contain" 
              />
              <span className="font-bold text-lg text-foreground min-w-[24px] text-center">
                {count}
              </span>
              <button
                onClick={() => onPurchaseSingle(type)}
                disabled={isLoading}
                className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
