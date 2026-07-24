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
      className="mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section Header */}
      <div className="px-[15px] mb-2">
        <h2 className="text-lg font-display font-bold text-foreground/90 drop-shadow-sm">
          {title}
        </h2>
      </div>

      {/* Products Grid */}
      <div className="px-3 sm:px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
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
