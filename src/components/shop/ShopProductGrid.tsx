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
      <div className="px-[15px] mb-3">
        <h2 className="text-lg font-display font-bold text-foreground/90 drop-shadow-sm">
          {title}
        </h2>
      </div>

      {/* Products Grid */}
      <div className="px-[15px]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
