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
  // Rows must hold 1, 2 or 4 cards — never 3. Sections whose count works out
  // evenly (or leaves a single leftover) get 4 columns on desktop; otherwise
  // they stay 2-wide. An odd last item stretches into a full-width featured
  // card instead of dangling in a half-empty row.
  const fourCols = count % 4 === 0 || count % 4 === 1;

  return (
    <motion.section
      className="mx-3 sm:mx-4 mb-6"
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
      <div className={cn("grid grid-cols-2 gap-2", fourCols && "lg:grid-cols-4")}>
        {items.map((item, index) => {
          // Real-money (lari) packs are always purchasable — gems balance is irrelevant
          const canAfford = item.currency === "lari" || gems >= item.price;
          const isPurchased = purchasedItems.has(item.id);
          const isFrameOwned = item.frameId
            ? isFrameUnlocked(item.frameId)
            : false;
          const isOwned = isPurchased || isFrameOwned;
          const isFeatured = index === count - 1 && count % 2 === 1;

          return (
            <div
              key={item.id}
              className={cn(isFeatured && "col-span-2", isFeatured && fourCols && "lg:col-span-4")}
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
                showDescription={true}
                featured={isFeatured}
                onClick={() => !isOwned && onItemClick(item)}
              />
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
