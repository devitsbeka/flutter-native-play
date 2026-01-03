import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { ShopItemCard, ShopItemBadge } from "./ShopItemCard";
import { ShopItemDetailModal } from "./ShopItemDetailModal";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

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
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { 
    amount: 0.5,
    once: false 
  });
  
  const [selectedItem, setSelectedItem] = useState<ShopItemData | null>(null);
  
  // Truncate description to max 20 chars
  const shortDesc = description.length > 20 ? description.slice(0, 20) + "..." : description;

  return (
    <motion.section 
      ref={sectionRef}
      className="mx-4 mb-4 rounded-3xl relative overflow-x-clip overflow-y-visible"
      style={{ 
        height: "40vh",
        minHeight: "240px",
        maxHeight: "320px",
        scrollSnapAlign: "center",
      }}
      initial={{ opacity: 0.6, scale: 0.92 }}
      animate={{ 
        opacity: isInView ? 1 : 0.6, 
        scale: isInView ? 1 : 0.92,
      }}
      transition={{ 
        duration: 0.4, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
    >
      {/* Video background - full section */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden">
        <PingPongVideo 
          src={videoSrc} 
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />
      </div>
      
      {/* Content on top of video */}
      <div className="relative z-10 h-full flex flex-col p-5 pt-8">
        {/* Title and short description - left aligned, top */}
        <motion.div 
          className="text-left mb-auto"
          initial={{ opacity: 0, y: -20 }}
          animate={{ 
            opacity: isInView ? 1 : 0, 
            y: isInView ? 0 : -20 
          }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-3xl font-display font-bold text-white drop-shadow-lg mb-2">
            {title}
          </h2>
          <p className="text-white/80 text-base drop-shadow">
            {shortDesc}
          </p>
        </motion.div>
        
        {/* Products at bottom - horizontal carousel */}
        <motion.div 
          className="mt-auto overflow-visible"
          style={{ marginLeft: '-1.25rem', marginRight: '-1.25rem', paddingTop: '1rem' }}
          animate={{ 
            opacity: isInView ? 1 : 0, 
            y: isInView ? 0 : 30 
          }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full overflow-visible"
          >
            <CarouselContent className="ml-5 overflow-visible" allowOverflow>
              {items.map((item, index) => {
                const canAfford = gems >= item.price;
                const isPurchased = purchasedItems.has(item.id);
                const isFrameOwned = (item as any).frameId ? isFrameUnlocked((item as any).frameId) : false;
                const isOwned = isPurchased || isFrameOwned;

                return (
                  <CarouselItem 
                    key={item.id} 
                    className="pl-0 basis-[85%] pr-3 overflow-visible"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: isInView ? 1 : 0, 
                        x: isInView ? 0 : -20 
                      }}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
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
                        index={0}
                        onClick={() => !isOwned && setSelectedItem(item)}
                      />
                    </motion.div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </motion.div>
      </div>
      
      {/* Detail Modal */}
      <ShopItemDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        canAfford={selectedItem ? gems >= selectedItem.price : false}
        isPurchased={selectedItem ? purchasedItems.has(selectedItem.id) : false}
        isLoading={selectedItem ? isPurchasing === selectedItem.id : false}
        onBuy={() => {
          if (selectedItem) {
            onItemClick(selectedItem);
            setSelectedItem(null);
          }
        }}
      />
    </motion.section>
  );
}
