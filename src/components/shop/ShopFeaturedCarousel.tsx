import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import gemIcon from "@/assets/icons/icon-gem.png";
import iconStarterPack from "@/assets/icons/icon-starter-pack.png";
import iconPowersBottle from "@/assets/icons/icon-powers-bottle.png";
import iconVipCrown from "@/assets/icons/icon-vip-crown.png";
import { ShopTab } from "./ShopTabBar";

interface FeaturedDeal {
  id: string;
  titleKey: string;
  subtitleKey: string;
  badgeKey: string;
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
    titleKey: "starterPack",
    subtitleKey: "starterPackDesc",
    badgeKey: "badgeNew",
    badgeColor: "hsl(200 80% 50%)",
    price: 8,
    icon: iconStarterPack,
    videoSrc: "/videos/promo-starter-pack.mp4",
    targetTab: "hot",
  },
  {
    id: "mega_power_bundle",
    titleKey: "megaPowers",
    subtitleKey: "megaPowersDesc",
    badgeKey: "badgePopular",
    badgeColor: "hsl(340 80% 55%)",
    originalPrice: 25,
    price: 15,
    icon: iconPowersBottle,
    videoSrc: "/videos/promo-mega-powers.mp4",
    targetTab: "powers",
  },
  {
    id: "vip_week_deal",
    titleKey: "vipWeek",
    subtitleKey: "vipWeekDesc",
    badgeKey: "badgeBestPrice",
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
  const { t } = useLanguage();

  // Auto-rotate - slower interval for better readability
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % FEATURED_DEALS.length);
    }, 12000);
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
      <div className="relative overflow-hidden rounded-3xl" style={{ height: 260 }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={deal.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
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

            {/* Cleaner gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent" />

            {/* Content - cleaner layout */}
            <div className="relative z-10 p-6 flex flex-col justify-center h-full max-w-[60%]">
              {/* Badge */}
              <motion.div
                className="self-start px-3 py-1 rounded-full text-xs font-bold text-white mb-4"
                style={{
                  background: deal.badgeColor,
                  boxShadow: "0 2px 0 hsl(0 0% 0% / 0.2)",
                }}
              >
                {t(`featured.${deal.badgeKey}`)}
              </motion.div>

              {/* Title */}
              <h3 className="text-2xl md:text-3xl font-display font-bold text-gray-900 mb-2">
                {t(`featured.${deal.titleKey}`)}
              </h3>
              
              {/* Subtitle */}
              <p className="text-gray-600 text-sm mb-5 line-clamp-2">
                {t(`featured.${deal.subtitleKey}`)}
              </p>

              {/* Price */}
              <div className="flex items-center gap-3">
                {deal.originalPrice && (
                  <span className="text-gray-400 line-through text-lg">
                    {deal.originalPrice}
                  </span>
                )}
                <div
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, hsl(270 60% 50%) 0%, hsl(280 70% 45%) 100%)",
                    boxShadow: "0 3px 0 hsl(270 50% 35%)",
                  }}
                >
                  <img src={gemIcon} alt="" className="w-5 h-5" />
                  <span className="text-lg font-bold text-white">{deal.price}</span>
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
