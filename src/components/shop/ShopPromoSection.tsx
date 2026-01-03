import { motion } from "framer-motion";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { ShopItemCard, ShopItemBadge } from "./ShopItemCard";

interface ShopItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "gems" | "coins";
  icon: React.ReactNode;
  gradient: string;
  badge?: ShopItemBadge | null;
  savings?: number;
}

interface ShopPromoSectionProps {
  title: string;
  description: string;
  videoSrc: string;
  items: ShopItemData[];
  gems: number;
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  isFrameUnlocked: (frameId: string) => boolean;
  onItemClick: (item: ShopItemData) => void;
}

export function ShopPromoSection({
  title,
  description,
  videoSrc,
  items,
  gems,
  purchasedItems,
  isPurchasing,
  isFrameUnlocked,
  onItemClick,
}: ShopPromoSectionProps) {
  return (
    <section className="mb-8">
      {/* Banner with video */}
      <motion.div 
        className="mx-4 rounded-2xl overflow-hidden relative h-[140px] mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.4 }}
      >
        {/* Video background */}
        <div className="absolute inset-0">
          <PingPongVideo 
            src={videoSrc} 
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        </div>
        
        {/* Left: Text content */}
        <div className="absolute inset-y-0 left-0 w-2/3 z-10 p-5 flex flex-col justify-center">
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            {title}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </motion.div>
      
      {/* Products grid */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {items.map((item, index) => {
          const canAfford = gems >= item.price;
          const isPurchased = purchasedItems.has(item.id);
          const isFrameOwned = (item as any).frameId ? isFrameUnlocked((item as any).frameId) : false;
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
              index={index}
              onClick={() => !isOwned && onItemClick(item)}
            />
          );
        })}
      </div>
    </section>
  );
}
