import { motion } from "framer-motion";
import { GameModal } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import iconGem from "@/assets/icons/icon-gem.png";
import iconCoin from "@/assets/icons/icon-coin.png";
import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";
import iconVipCrown from "@/assets/icons/icon-vip-crown.png";

interface ShopItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: "gems" | "coins" | "lari";
    icon: React.ReactNode;
  } | null;
  canAfford: boolean;
  isPurchased: boolean;
  isLoading: boolean;
  onBuy: () => void;
}

// Parse item contents from id and description
function parseItemContents(item: { id: string; description: string }) {
  const id = item.id;
  const desc = item.description;
  
  // Starter bundles with powers + coins
  if (id === "starter_bundle") {
    return { type: "bundle", powers: 2, coins: 200 };
  }
  if (id === "starter_bundle_medium") {
    return { type: "bundle", powers: 5, coins: 500 };
  }
  if (id === "starter_bundle_large") {
    return { type: "bundle", powers: 10, coins: 1000 };
  }
  
  // Power bundles (no coins)
  if (id === "power_bundle_small") {
    return { type: "bundle", powers: 2, coins: 0 };
  }
  if (id === "mega_power_bundle") {
    return { type: "bundle", powers: 5, coins: 0 };
  }
  if (id === "power_bundle_large") {
    return { type: "bundle", powers: 10, coins: 0 };
  }
  
  // VIP items
  if (id === "vip_day") {
    return { type: "vip", days: 1 };
  }
  if (id === "vip_week_deal") {
    return { type: "vip", days: 7 };
  }
  if (id === "vip_month") {
    return { type: "vip", days: 30 };
  }
  
  // Single powers
  if (id.startsWith("power_5050")) {
    return { type: "power", powerType: "5050", amount: 3 };
  }
  if (id.startsWith("power_freeze")) {
    return { type: "power", powerType: "freeze", amount: 3 };
  }
  if (id.startsWith("power_replace")) {
    return { type: "power", powerType: "replace", amount: 3 };
  }
  if (id.startsWith("power_timedrain")) {
    return { type: "power", powerType: "time-drain", amount: 3 };
  }
  
  // Coin packages
  if (id.startsWith("coins_")) {
    const match = id.match(/coins_(\d+)/);
    if (match) {
      return { type: "coins", amount: parseInt(match[1]) };
    }
  }
  
  // Frames
  if (id.startsWith("frame_")) {
    return { type: "frame" };
  }
  
  return { type: "unknown" };
}

// Component to display item contents visually
function ItemContentsDisplay({ item, t }: { item: { id: string; description: string }; t: (key: string) => string }) {
  const contents = parseItemContents(item);
  
  if (contents.type === "bundle") {
    return (
      <div className="flex flex-col items-center gap-3">
        {/* All powers row */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <img src={fiftyFiftyIcon} alt="50/50" className="w-8 h-8 object-contain" />
            <img src={freezeIcon} alt="Freeze" className="w-8 h-8 object-contain" />
            <img src={replaceIcon} alt="Replace" className="w-8 h-8 object-contain" />
            <img src={timeDrainIcon} alt="Time+" className="w-8 h-8 object-contain" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {contents.powers}x {t('shop.allPowers')}
          </span>
        </div>
        
        {/* Coins row if applicable */}
        {contents.coins > 0 && (
          <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-xl">
            <img src={iconCoin} alt="Coins" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              + {contents.coins} {t('shop.coin')}
            </span>
          </div>
        )}
      </div>
    );
  }
  
  if (contents.type === "vip") {
    const daysText = contents.days === 1 
      ? `1 ${t('shop.day')}` 
      : `${contents.days} ${t('shop.days')}`;
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold text-amber-500">{t('shop.vipStatus')}</span>
          <span className="text-xs text-muted-foreground">{daysText}</span>
        </div>
        <span className="text-xs text-muted-foreground text-center px-4">
          {t('shop.vipDescription')}
        </span>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span className="bg-muted px-2 py-1 rounded-lg">{t('shop.doubleXp')}</span>
          <span className="bg-muted px-2 py-1 rounded-lg">{t('shop.unlimitedSpin')}</span>
        </div>
        <span className="bg-muted px-2 py-1 rounded-lg text-xs text-muted-foreground">{t('shop.exclusiveFrames')}</span>
      </div>
    );
  }
  
  if (contents.type === "power") {
    const powerNames: Record<string, string> = {
      "5050": "50/50",
      "freeze": t('shop.freeze'),
      "replace": t('shop.replace'),
      "time-drain": t('shop.timePlus'),
    };
    const powerDescriptions: Record<string, string> = {
      "5050": t('powerups.fiftyFifty.description'),
      "freeze": t('powerups.freeze.description'),
      "replace": t('powerups.replace.description'),
      "time-drain": t('powerups.timeDrain.description'),
    };
    const name = powerNames[contents.powerType || "5050"];
    const description = powerDescriptions[contents.powerType || "5050"];
    
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {contents.amount}x {name}
        </span>
        <span className="text-xs text-muted-foreground text-center px-4">
          {description}
        </span>
      </div>
    );
  }
  
  if (contents.type === "coins") {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-bold text-amber-500">
          {contents.amount} {t('shop.coin')}
        </span>
        <span className="text-xs text-muted-foreground text-center px-4">
          {t('shop.coinsDescription')}
        </span>
      </div>
    );
  }
  
  // For frames or unknown, show description
  return (
    <p className="text-muted-foreground text-center text-sm leading-relaxed px-2">
      {item.description}
    </p>
  );
}

export function ShopItemDetailModal({
  isOpen,
  onClose,
  item,
  canAfford,
  isPurchased,
  isLoading,
  onBuy,
}: ShopItemDetailModalProps) {
  const { t } = useLanguage();
  if (!item) return null;

  const currencyIcon = item.currency === "gems" ? iconGem : iconCoin;

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
    >
      <div className="flex flex-col items-center justify-center gap-4 py-6 min-h-[40vh]">
        {/* Icon */}
        <motion.div
          className="w-[86px] h-[86px] flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="[&>img]:w-full [&>img]:h-full [&>img]:object-contain [&>svg]:w-full [&>svg]:h-full">
            {item.icon}
          </div>
        </motion.div>

        {/* Visual Contents Display */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <ItemContentsDisplay item={item} t={t} />
        </motion.div>

        {/* Buy Button */}
        <motion.div
          className="w-full mt-2 flex justify-center"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {isPurchased ? (
            <div className="flex items-center justify-center gap-2 text-green-600 font-bold py-3">
              <span>✓</span>
              <span>{t('shop.purchased')}</span>
            </div>
          ) : (
            <button
              onClick={onBuy}
              disabled={!canAfford || isLoading}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              style={{
                background: "#00DDA3",
                boxShadow: "0 4px 0 #00A87C, 0 6px 12px rgba(0,0,0,0.15)",
              }}
            >
              <img src={currencyIcon} alt="" className="w-5 h-5" />
              <span>{isLoading ? "..." : `${t('shop.buy')} ${item.price}`}</span>
            </button>
          )}
        </motion.div>
      </div>
    </GameModal>
  );
}
