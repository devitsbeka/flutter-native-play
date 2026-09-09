import { PowerUpType } from "@/hooks/useUserPowerUps";
import { REWARDS } from "@/config/rewardConfig";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

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

const POWER_UP_NAME_KEYS: Record<PowerUpType, string> = {
  "5050": "powerups.fiftyFifty.name",
  freeze: "powerups.freeze.name",
  replace: "powerups.replace.name",
  "time-drain": "powerups.timeDrain.name",
};

// The two-or-three-word version of what the power does. `description` is a
// full sentence built for the in-game sheet and runs past two lines in a
// shop row, so these are their own strings rather than a truncation.
const POWER_UP_SHORT_KEYS: Record<PowerUpType, string> = {
  "5050": "powerups.fiftyFifty.short",
  freeze: "powerups.freeze.short",
  replace: "powerups.replace.short",
  "time-drain": "powerups.timeDrain.short",
};

interface MyPowersSectionProps {
  onPurchaseSingle: (powerType: PowerUpType) => Promise<void>;
  isPurchasing: string | null;
  canAffordCoins: (amount: number) => boolean;
  onCardClick?: (type: PowerUpType) => void;
}

/**
 * The shop's power-up shelf: one full-width row per power.
 *
 * It was a four-across grid of tiles whose headline number was how many you
 * already own. That is inventory, not a storefront — it read as a wallet,
 * the icons were 32px, and there was no room left to say what any of them
 * actually did. A row per power buys the width to carry a real icon, the
 * name, a plain-language line, and the price where a price belongs.
 *
 * The owned count is deliberately gone: what you have is not what you are
 * being sold, and it is still on the in-game power sheet where it matters.
 */
export function MyPowersSection({ onPurchaseSingle, isPurchasing, canAffordCoins, onCardClick }: MyPowersSectionProps) {
  const { t } = useLanguage();

  return (
    <div className="px-4 pt-1.5 pb-4 relative z-10">
      <h2 className="text-lg font-display font-bold text-foreground mb-4">{t("extra.superPowers")}</h2>

      <div className="flex flex-col gap-2.5">
        {POWER_UP_ORDER.map((type) => {
          const isLoading = isPurchasing === `single_${type}`;
          const price = REWARDS.POWER_UP_PRICES[type] ?? 100;
          const canAfford = canAffordCoins(price);

          return (
            <div
              key={type}
              onClick={() => onCardClick?.(type)}
              className="flex items-center gap-3.5 rounded-[22px] liquid-glass px-3.5 py-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <img
                src={POWER_UP_ICONS[type]}
                alt=""
                className="w-14 h-14 shrink-0 object-contain"
              />

              {/* min-w-0 so a long translation wraps inside the row instead
                  of pushing the price button off the end. */}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[17px] leading-tight text-gray-900">
                  {t(POWER_UP_NAME_KEYS[type])}
                </div>
                <div className="mt-1 text-[15px] leading-snug text-gray-600">
                  {t(POWER_UP_SHORT_KEYS[type])}
                </div>
              </div>

              <motion.button
                onClick={(e) => { e.stopPropagation(); onCardClick?.(type); }}
                disabled={isLoading}
                aria-label={`${t(POWER_UP_NAME_KEYS[type])} — ${price}`}
                // The overlay-containment smoke test opens the guest sign-in
                // prompt through this button. Every other hook on it is
                // translated, and the suite runs in whatever locale the app
                // defaults to, so the id is the one locale-proof handle.
                data-testid="power-buy"
                // The same white chunky pill the coin, gem and pack shelves
                // buy through, at the same size. It was an amber tinted
                // button here, which made this one shelf look like a
                // different shop; a buy control should be the same object
                // everywhere it appears. Affordability shows as the pill
                // dimming rather than as a colour of its own.
                className={`flex min-w-[100px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-6 py-3 font-bold text-[#402666] disabled:opacity-50 ${canAfford ? "" : "opacity-55"}`}
                style={{
                  background: "linear-gradient(180deg, #FFFFFF 0%, #FEFEFE 100%)",
                  boxShadow: "0 3px 0 #D8D0E8, 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 #FFFFFF",
                  border: "2px solid #E8E0F5",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#402666] border-t-transparent" />
                ) : (
                  <>
                    <img src={coinIcon} alt="" className="h-5 w-5 shrink-0" />
                    <span className="text-[15px]">{price}</span>
                  </>
                )}
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
