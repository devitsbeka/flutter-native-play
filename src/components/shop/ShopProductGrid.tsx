import { motion } from "framer-motion";
import { ShopItem } from "@/hooks/useShopData";
import { ShopItemCard } from "./ShopItemCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { PowerUpsSummary } from "./PowerUpsSummary";
import { cn } from "@/lib/utils";

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

  const count = items.length;
  // Rows hold 2 or 4 cards — no full-width featured rows. Sections that
  // divide into fours get 4 columns on desktop; pairs stay 2-wide.
  const fourCols = count % 4 === 0;

  return (
    <motion.section
      className="mx-3 sm:mx-4 mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section Header - game-shop style accent bar */}
      <div className="mb-3 mt-2 flex items-center gap-2.5 px-1">
        <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-fuchsia-400 to-purple-600" />
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
          {title}
        </h2>
      </div>

      {/* Products Grid */}
      <div className={cn("grid grid-cols-2 gap-2", fourCols && "lg:grid-cols-4")}>
        {items.map((item, index) => {
          // Real-money (lari) packs are always purchasable — gems balance is irrelevant
          const canAfford = item.currency === "lari" || gems >= item.price;
          const isPurchased = purchasedItems.has(item.id);
          const isFrameOwned = item.frameId
            ? isFrameUnlocked(item.frameId)
            : false;
          const isOwned = isPurchased || isFrameOwned;

          return (
            <div key={item.id}>
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
                vibrant={item.vibrant}
                isPurchased={isOwned}
                isLoading={isPurchasing === item.id}
                canAfford={canAfford}
                showDescription={true}
                onClick={() => !isOwned && onItemClick(item)}
              />
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
