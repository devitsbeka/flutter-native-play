import { motion } from "framer-motion";
import { ShopItem } from "@/hooks/useShopData";
import { ShopItemCard } from "./ShopItemCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { PowerUpsSummary } from "./PowerUpsSummary";

interface ShopProductGridProps {
  sectionId?: string;
  title: string;
  items: ShopItem[];
  gems: number;
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  isFrameUnlocked: (frameId: string) => boolean;
  onItemClick: (item: ShopItem) => void;
}

export function ShopProductGrid({
  sectionId,
  title,
  items,
  gems,
  purchasedItems,
  isPurchasing,
  isFrameUnlocked,
  onItemClick,
}: ShopProductGridProps) {
  const { t } = useLanguage();

  return (
    <motion.section
      className="mx-3 sm:mx-4 mb-4 rounded-3xl border border-white/60 bg-white/55 p-2.5 sm:p-3 backdrop-blur-sm shadow-[0_8px_24px_rgba(102,51,153,0.08)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section Header - game-shop style accent bar */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-5 w-1.5 rounded-full bg-gradient-to-b from-fuchsia-400 to-purple-600" />
        <h2 className="text-base font-display font-bold text-foreground/90">
          {title}
        </h2>
      </div>

      {/* Products Grid */}
      <div>
        {/* 2 per line on phones, 4 on wide screens — never an awkward 3 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {items.map((item) => {
            // Real-money (lari) packs are always purchasable — gems balance is irrelevant
            const canAfford = item.currency === "lari" || gems >= item.price;
            const isPurchased = purchasedItems.has(item.id);
            const isFrameOwned = item.frameId
              ? isFrameUnlocked(item.frameId)
              : false;
            const isOwned = isPurchased || isFrameOwned;

            return (
              <ShopItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                currency={item.currency}
                icon={item.icon}
                gradient={item.gradient}
                badge={item.badge ?? undefined}
                savings={item.savings}
                isPurchased={isOwned}
                isLoading={isPurchasing === item.id}
                canAfford={canAfford}
                showDescription={true}
                onClick={() => !isOwned && onItemClick(item)}
              />
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
