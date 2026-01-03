import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { ShopItemCard, ShopItemBadge } from "./ShopItemCard";
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
  
  // Truncate description to max 20 chars
  const shortDesc = description.length > 20 ? description.slice(0, 20) + "..." : description;

  return (
    <motion.section 
      ref={sectionRef}
      className="mx-4 mb-4 rounded-3xl overflow-hidden relative"
      style={{ 
        height: "52vh",
        minHeight: "380px",
        maxHeight: "480px",
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
      <div className="absolute inset-0">
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
          className="mt-auto -mx-2"
          initial={{ opacity: 0, y: 30 }}
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
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {items.map((item, index) => {
                const canAfford = gems >= item.price;
                const isPurchased = purchasedItems.has(item.id);
                const isFrameOwned = (item as any).frameId ? isFrameUnlocked((item as any).frameId) : false;
                const isOwned = isPurchased || isFrameOwned;

                return (
                  <CarouselItem 
                    key={item.id} 
                    className="pl-2 basis-[85%]"
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
                        onClick={() => !isOwned && onItemClick(item)}
                      />
                    </motion.div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </motion.div>
      </div>
    </motion.section>
  );
}
