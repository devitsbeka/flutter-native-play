import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gemIcon from "@/assets/icons/icon-gem.png";
import iconStarterPack from "@/assets/icons/icon-starter-pack.png";
import iconPowersBottle from "@/assets/icons/icon-powers-bottle.png";
import iconVipCrown from "@/assets/icons/icon-vip-crown.png";
import { ShopTab } from "./ShopTabBar";

interface FeaturedDeal {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  originalPrice?: number;
  price: number;
  icon: string;
  videoSrc: string;
  targetTab: ShopTab;
}

const FEATURED_DEALS: FeaturedDeal[] = [
  {
    id: "starter_bundle",
    title: "სტარტერ პაკეტი",
    subtitle: "2x ყველა ძალა • 200 მონეტა • იდეალური დამწყებთათვის",
    badge: "ახალი",
    badgeColor: "hsl(200 80% 50%)",
    price: 8,
    icon: iconStarterPack,
    videoSrc: "/videos/promo-starter-pack.mp4",
    targetTab: "hot",
  },
  {
    id: "mega_power_bundle",
    title: "მეგა ძალები",
    subtitle: "5x ყველა ძალა • საუკეთესო მოთამაშეებისთვის",
    badge: "პოპულარული",
    badgeColor: "hsl(340 80% 55%)",
    originalPrice: 25,
    price: 15,
    icon: iconPowersBottle,
    videoSrc: "/videos/promo-mega-powers.mp4",
    targetTab: "powers",
  },
  {
    id: "vip_week_deal",
    title: "VIP კვირა",
    subtitle: "2x XP • უსასრულო სპინი • ექსკლუზიური ჩარჩოები",
    badge: "საუკეთესო ფასი",
    badgeColor: "hsl(45 90% 50%)",
    originalPrice: 20,
    price: 15,
    icon: iconVipCrown,
    videoSrc: "/videos/promo-vip-week.mp4",
    targetTab: "vip",
  },
];

interface ShopFeaturedCarouselProps {
  onDealClick: (dealId: string) => void;
  onScrollToTab?: (tab: ShopTab) => void;
}

export function ShopFeaturedCarousel({ onDealClick, onScrollToTab }: ShopFeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % FEATURED_DEALS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const handleBannerClick = (deal: FeaturedDeal) => {
    onScrollToTab?.(deal.targetTab);
  };

  const deal = FEATURED_DEALS[currentIndex];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="relative px-4 mb-6">
      <div className="relative overflow-hidden rounded-3xl" style={{ height: 200 }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={deal.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 cursor-pointer"
            onClick={() => handleBannerClick(deal)}
          >
            {/* Video Background */}
            <video
              src={deal.videoSrc}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* White gradient mask for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent" />

            {/* Content */}
            <div className="relative z-10 p-5 flex flex-col justify-between h-full">
              {/* Badge */}
              <motion.div
                className="self-start px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{
                  background: deal.badgeColor,
                  boxShadow: "0 2px 0 hsl(0 0% 0% / 0.2)",
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {deal.badge}
              </motion.div>

              {/* Text content */}
              <div className="flex-1">
                <h3 className="text-2xl font-display font-bold text-gray-900 mb-1">
                  {deal.title}
                </h3>
                <p className="text-gray-700 text-sm mb-3">{deal.subtitle}</p>

                {/* Price */}
                <div className="flex items-center gap-3">
                  {deal.originalPrice && (
                    <span className="text-gray-400 line-through text-lg">
                      {deal.originalPrice}
                    </span>
                  )}
                  <div
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full"
                    style={{
                      background: "hsl(0 0% 0% / 0.1)",
                      boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.3)",
                    }}
                  >
                    <img src={gemIcon} alt="" className="w-5 h-5" />
                    <span className="text-xl font-bold text-gray-900">{deal.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-3">
        {FEATURED_DEALS.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => goTo(index)}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background:
                index === currentIndex
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted-foreground) / 0.3)",
            }}
            whileHover={{ scale: 1.2 }}
            animate={{
              width: index === currentIndex ? 16 : 8,
            }}
          />
        ))}
      </div>
    </div>
  );
}
