import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { toWebmUrl } from "@/config/videoConfig";
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

  // Touch swipe refs
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isSwiping = useRef(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isInView, setIsInView] = useState(true);

  // Pause the background video while the carousel is scrolled offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < HERO_SLIDES.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    // Mark as swiping if moved more than 10px
    if (Math.abs(touchStartX.current - touchEndX.current) > 10) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    
    if (diff > threshold) {
      goNext();
    } else if (diff < -threshold) {
      goPrev();
    }
  };

  const handleClick = (sectionId: string) => {
    // Only trigger click if not swiping
    if (!isSwiping.current) {
      onSlideClick?.(sectionId);
    }
  };

  const slide = HERO_SLIDES[currentIndex];

  // slide.id in deps: the keyed <video> remounts on every slide change
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isInView) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView, slide.id]);

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
    <div ref={containerRef} className="relative px-[15px] mb-6 pt-3">
      <div 
        className="relative overflow-hidden rounded-3xl touch-pan-y" 
        style={{ height: 400 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
            onClick={() => handleClick(slide.sectionId)}
          >
            {/* Video Background */}
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={toWebmUrl(slide.videoSrc)} type="video/webm" />
              <source src={slide.videoSrc} type="video/mp4" />
            </video>

            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

            {/* Content - Centered */}
            <div className="relative z-10 p-5 pb-8 flex flex-col items-center justify-center h-full text-center" style={{ marginTop: -15 }}>
              {/* Badge */}
              <motion.div
                className="absolute top-7 right-5 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{
                  background: slide.badgeColor,
                  boxShadow: "0 2px 0 hsl(0 0% 0% / 0.2)",
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {t(`featured.${slide.badgeKey}`)}
              </motion.div>

              {/* Icon */}
              <motion.img
                src={slide.icon}
                alt=""
                className="w-16 h-16 object-contain drop-shadow-2xl mb-3"
                animate={{ 
                  y: [0, -3, 0],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Title */}
              <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-1 drop-shadow-lg">
                {t(`shop.${slide.titleKey}`)}
              </h3>
              
              {/* Subtitle */}
              <p className="text-white/80 text-sm mb-3">
                {t(`featured.${slide.descriptionKey}`)}
              </p>

              {/* Price + CTA */}
              <div className="flex items-center gap-3">
                {slide.originalPrice && (
                  <span className="text-white/50 line-through text-base">
                    {slide.originalPrice}
                  </span>
                )}
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    background: "hsl(0 0% 100% / 0.2)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid hsl(0 0% 100% / 0.25)",
                  }}
                >
                  <img src={gemIcon} alt="" className="w-5 h-5" />
                  <span className="text-lg font-bold text-white">{slide.price}</span>
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </div>
              </div>
            </div>

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
