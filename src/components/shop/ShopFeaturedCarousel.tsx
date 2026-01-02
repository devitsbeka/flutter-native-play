import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Crown, Zap, Sparkles } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import gemIcon from "@/assets/icons/icon-gem.png";
import coinIcon from "@/assets/icons/icon-coin.png";

interface FeaturedDeal {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  originalPrice?: number;
  price: number;
  icon: React.ReactNode;
  gradient: string;
  particles?: boolean;
}

const FEATURED_DEALS: FeaturedDeal[] = [
  {
    id: "mega_bundle",
    title: "მეგა პაკეტი",
    subtitle: "5x ყველა ძალა + 1000 მონეტა",
    badge: "საუკეთესო ფასი",
    badgeColor: "hsl(142 71% 45%)",
    originalPrice: 35,
    price: 25,
    icon: <Zap className="w-12 h-12 text-yellow-300" />,
    gradient: "linear-gradient(135deg, hsl(263 60% 55%) 0%, hsl(280 70% 45%) 100%)",
    particles: true,
  },
  {
    id: "vip_week",
    title: "VIP კვირა",
    subtitle: "2x XP • უსასრულო სპინი • ექსკლუზიური ჩარჩოები",
    badge: "პოპულარული",
    badgeColor: "hsl(340 80% 55%)",
    originalPrice: 20,
    price: 15,
    icon: <Crown className="w-12 h-12 text-amber-300" />,
    gradient: "linear-gradient(135deg, hsl(45 90% 55%) 0%, hsl(25 85% 50%) 100%)",
    particles: true,
  },
  {
    id: "starter_pack",
    title: "სტარტერ პაკეტი",
    subtitle: "2x ყველა ძალა • იდეალური დამწყებთათვის",
    badge: "ახალი",
    badgeColor: "hsl(200 80% 50%)",
    price: 8,
    icon: <Sparkles className="w-12 h-12 text-sky-300" />,
    gradient: "linear-gradient(135deg, hsl(200 80% 55%) 0%, hsl(180 70% 45%) 100%)",
  },
];

interface ShopFeaturedCarouselProps {
  onDealClick: (dealId: string) => void;
}

export function ShopFeaturedCarousel({ onDealClick }: ShopFeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-rotate
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % FEATURED_DEALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
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
            className="absolute inset-0 p-5 flex flex-col justify-between"
            style={{
              background: deal.gradient,
              boxShadow: "0 8px 0 hsl(0 0% 0% / 0.15), inset 0 2px 0 hsl(0 0% 100% / 0.2)",
            }}
          >
            {/* Animated particles */}
            {deal.particles && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-2xl"
                    style={{
                      left: `${10 + i * 15}%`,
                      top: `${20 + (i % 3) * 25}%`,
                    }}
                    animate={{
                      y: [-10, 10, -10],
                      opacity: [0.5, 1, 0.5],
                      scale: [0.8, 1, 0.8],
                    }}
                    transition={{
                      duration: 2 + i * 0.3,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>
            )}

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

            {/* Content */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-display font-bold text-white mb-1 drop-shadow-md">
                  {deal.title}
                </h3>
                <p className="text-white/90 text-sm mb-3">{deal.subtitle}</p>

                {/* Price */}
                <div className="flex items-center gap-3">
                  {deal.originalPrice && (
                    <span className="text-white/60 line-through text-lg">
                      {deal.originalPrice}
                    </span>
                  )}
                  <div
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full"
                    style={{
                      background: "hsl(0 0% 100% / 0.25)",
                      boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.3)",
                    }}
                  >
                    <img src={gemIcon} alt="" className="w-5 h-5" />
                    <span className="text-xl font-bold text-white">{deal.price}</span>
                  </div>
                </div>
              </div>

              {/* Icon */}
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "hsl(0 0% 100% / 0.15)",
                  boxShadow: "0 4px 0 hsl(0 0% 0% / 0.1)",
                }}
                animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {deal.icon}
              </motion.div>
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
