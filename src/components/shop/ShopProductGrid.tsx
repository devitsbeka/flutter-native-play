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
      className="mx-3 sm:mx-4 mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section Header - game-shop style accent bar. relative z-10 lifts the
          text above GlobalSplineBackground's blobs, which otherwise paint over
          plain (non-stacking-context) text and swallow the titles. */}
      <div className="relative z-10 mb-3 mt-2 flex items-center gap-2.5 px-1">
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
          {title}
        </h2>
      </div>

      {/* Products Grid — see .shop-grid-row in index.css. How many fit is
          measured on the row rather than the window, because the left menu
          expands and the video panel takes a share of the width. Sections no
          longer opt into a column count by how many items they happen to
          have: cards are a capped width and as many fit as fit. */}
      <div className="shop-grid-row">
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, index) => {
          // Real-money (lari) packs are always purchasable — gems balance is irrelevant
          const canAfford = item.currency === "lari" || gems >= item.price;
          const isPurchased = purchasedItems.has(item.id);
          const isFrameOwned = item.frameId
            ? isFrameUnlocked(item.frameId)
            : false;
          const isOwned = isPurchased || isFrameOwned;

          return (
            // Capped, and left-aligned in its track. Centring inside a
            // half-width cell is what pushed a two-card section apart with a
            // hole down the middle of the shop.
            <div key={item.id} className="w-full max-w-[420px]">
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
      </div>
    </motion.section>
  );
}
