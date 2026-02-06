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

export function MyPowersSection({ powerUps, onPurchaseSingle, isPurchasing }: MyPowersSectionProps) {
  // Triple-layer defense: ensure powerUps is always a valid object
  const safeData = powerUps ?? { "5050": 0, freeze: 0, replace: 0, "time-drain": 0 };
  
  return (
    <div className="px-4 py-4 relative z-10">
      <h2 className="text-lg font-display text-foreground mb-1">ჩემი ძალები</h2>
      
      <div className="grid grid-cols-4 gap-3 mt-4">
        {POWER_UP_ORDER.map((type) => {
          const count = safeData[type] ?? 0;
          const isLoading = isPurchasing === `single_${type}`;
          
          return (
            <div
              key={type}
              className="relative flex flex-col items-center gap-3 px-3 pt-8 pb-4 rounded-2xl liquid-glass"
            >
              <img 
                src={POWER_UP_ICONS[type]} 
                alt="" 
                className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 object-contain" 
              />
              <span className="font-bold text-lg text-foreground">
                {count}
              </span>
              <button
                onClick={() => onPurchaseSingle(type)}
                disabled={isLoading}
                className="w-9 h-9 rounded-full bg-transparent border-[1.5px] border-primary flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
