import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronRight } from "lucide-react";
import gemIcon from "@/assets/icons/icon-gem.png";
import iconStarterPack from "@/assets/icons/icon-starter-pack.png";
import iconPowersBottle from "@/assets/icons/icon-powers-bottle.png";
import iconVipCrown from "@/assets/icons/icon-vip-crown.png";
import coinIcon from "@/assets/icons/icon-coin.png";

interface HeroSlide {
  id: string;
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  badgeKey: string;
  badgeColor: string;
  originalPrice?: number;
  price: number;
  icon: string;
  videoSrc: string;
  sectionId: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "starter_bundle",
    titleKey: "starterPack",
    subtitleKey: "forBeginners",
    descriptionKey: "starterPackDesc",
    badgeKey: "badgeNew",
    badgeColor: "hsl(200 80% 50%)",
    price: 6,
    icon: iconStarterPack,
    videoSrc: "/videos/starter.mp4",
    sectionId: "starter",
  },
  {
    id: "mega_power_bundle",
    titleKey: "megaPowers",
    subtitleKey: "winMoreGames",
    descriptionKey: "megaPowersDesc",
    badgeKey: "badgePopular",
    badgeColor: "hsl(340 80% 55%)",
    originalPrice: 25,
    price: 10,
    icon: iconPowersBottle,
    videoSrc: "/videos/mega-powers-2.mp4",
    sectionId: "mega-powers",
  },
  {
    id: "vip_week_deal",
    titleKey: "vipWeek",
    subtitleKey: "vipBenefits",
    descriptionKey: "vipWeekDesc",
    badgeKey: "badgeBestPrice",
    badgeColor: "hsl(45 90% 50%)",
    originalPrice: 20,
    price: 12,
    icon: iconVipCrown,
    videoSrc: "/videos/vip.mp4",
    sectionId: "vip",
  },
  {
    id: "coins_bundle",
    titleKey: "coins",
    subtitleKey: "withBonuses",
    descriptionKey: "coinsDesc",
    badgeKey: "badgeBestValue",
    badgeColor: "hsl(35 90% 50%)",
    price: 20,
    icon: coinIcon,
    videoSrc: "/videos/coins.mp4",
    sectionId: "coins",
  },
];

interface ShopHeroCarouselProps {
  onSlideClick?: (sectionId: string) => void;
}

export function ShopHeroCarousel({ onSlideClick }: ShopHeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const { t } = useLanguage();

  // Auto-rotate every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const slide = HERO_SLIDES[currentIndex];

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
      <div 
        className="relative overflow-hidden rounded-3xl" 
        style={{ height: 220 }}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={slide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 cursor-pointer"
            onClick={() => onSlideClick?.(slide.sectionId)}
          >
            {/* Video Background */}
            <video
              src={slide.videoSrc}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

            {/* Content */}
            <div className="relative z-10 p-5 flex flex-col justify-between h-full">
              {/* Badge */}
              <motion.div
                className="self-start px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{
                  background: slide.badgeColor,
                  boxShadow: "0 2px 0 hsl(0 0% 0% / 0.2)",
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {t(`featured.${slide.badgeKey}`)}
              </motion.div>

              {/* Text content */}
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-white/70 text-sm mb-1">
                  {t(`shop.${slide.subtitleKey}`)}
                </p>
                <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 drop-shadow-lg">
                  {t(`shop.${slide.titleKey}`)}
                </h3>
                <p className="text-white/80 text-sm mb-3 max-w-[200px]">
                  {t(`featured.${slide.descriptionKey}`)}
                </p>

                {/* Price + CTA */}
                <div className="flex items-center gap-3">
                  {slide.originalPrice && (
                    <span className="text-white/50 line-through text-lg">
                      {slide.originalPrice}
                    </span>
                  )}
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{
                      background: "hsl(0 0% 100% / 0.15)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid hsl(0 0% 100% / 0.2)",
                    }}
                  >
                    <img src={gemIcon} alt="" className="w-5 h-5" />
                    <span className="text-xl font-bold text-white">{slide.price}</span>
                    <ChevronRight className="w-4 h-4 text-white/70" />
                  </div>
                </div>
              </div>
            </div>

            {/* Icon on the right */}
            <motion.img
              src={slide.icon}
              alt=""
              className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 object-contain drop-shadow-2xl opacity-80"
              animate={{ 
                y: [0, -5, 0],
                rotate: [-2, 2, -2],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-3">
        {HERO_SLIDES.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => goTo(index)}
            className="h-2 rounded-full transition-all"
            style={{
              background:
                index === currentIndex
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted-foreground) / 0.3)",
              width: index === currentIndex ? 20 : 8,
            }}
            whileHover={{ scale: 1.2 }}
          />
        ))}
      </div>
    </div>
  );
}
