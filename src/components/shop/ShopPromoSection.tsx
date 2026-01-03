import { useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Truncate description to max 20 chars
  const shortDesc = description.length > 20 ? description.slice(0, 20) + "..." : description;

  return (
    <motion.section 
      className="mx-4 mb-6 rounded-3xl overflow-hidden relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
    >
      {/* Video background - full section */}
      <div className="absolute inset-0">
        <PingPongVideo 
          src={videoSrc} 
          className="w-full h-full object-cover"
        />
        {/* Subtle overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/20" />
      </div>
      
      {/* Content on top of video */}
      <div className="relative z-10 p-5 pt-6">
        {/* Title and short description - left aligned */}
        <div className="text-left mb-4">
          <h2 className="text-2xl font-display font-bold text-white drop-shadow-lg mb-1">
            {title}
          </h2>
          <p className="text-white/80 text-sm drop-shadow">
            {shortDesc}
          </p>
        </div>
        
        {/* Horizontally scrollable products */}
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2"
          style={{ 
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch"
          }}
        >
          <motion.div 
            className="flex gap-3"
            drag="x"
            dragConstraints={scrollRef}
            dragElastic={0.1}
            dragMomentum={true}
          >
            {items.map((item, index) => {
              const canAfford = gems >= item.price;
              const isPurchased = purchasedItems.has(item.id);
              const isFrameOwned = (item as any).frameId ? isFrameUnlocked((item as any).frameId) : false;
              const isOwned = isPurchased || isFrameOwned;

              return (
                <div 
                  key={item.id} 
                  className="flex-shrink-0 w-[160px]"
                  style={{ scrollSnapAlign: "start" }}
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
                    onClick={() => !isOwned && onItemClick(item)}
                  />
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
