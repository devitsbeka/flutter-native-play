import { motion } from "framer-motion";
import { ShopItem } from "@/hooks/useShopData";
import { ShopItemCard } from "./ShopItemCard";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShopProductGridProps {
  title: string;
  items: ShopItem[];
  gems: number;
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  isFrameUnlocked: (frameId: string) => boolean;
  onItemClick: (item: ShopItem) => void;
}

export function ShopProductGrid({
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Section Header */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-display font-bold text-foreground">
            {title}
          </h2>
          <div className="flex-1 h-px bg-border/50" />
        </div>
      </div>

      {/* Products Grid - horizontal scroll on mobile, grid on desktop */}
      <div className="px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-visible">
          {items.map((item, index) => {
            const canAfford = gems >= item.price;
            const isPurchased = purchasedItems.has(item.id);
            const isFrameOwned = item.frameId
              ? isFrameUnlocked(item.frameId)
              : false;
            const isOwned = isPurchased || isFrameOwned;

            return (
              <motion.div
                key={item.id}
                className="flex-shrink-0 w-[280px] md:w-full"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ShopItemCard
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
                  index={index}
                  showDescription={true}
                  onClick={() => !isOwned && onItemClick(item)}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
