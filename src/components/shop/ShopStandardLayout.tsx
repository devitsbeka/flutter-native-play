import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ShopSection, ShopItem } from "@/hooks/useShopData";
import { ShopHeroCarousel } from "./ShopHeroCarousel";
import { ShopProductGrid } from "./ShopProductGrid";
import { MobileProCarousel } from "./MobileProCarousel";
import { MyPowersSection } from "./MyPowersSection";
import { useIsBreakpointUp } from "@/hooks/use-breakpoint";
import { PowerUpType } from "@/hooks/useUserPowerUps";


interface ShopStandardLayoutProps {
  sections: ShopSection[];
  gems: number;
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  isFrameUnlocked: (frameId: string) => boolean;
  onItemClick: (item: ShopItem) => Promise<void>;
  onSinglePowerPurchase: (powerType: PowerUpType) => Promise<void>;
  initialScrollSection?: string;
  powerUps: Record<PowerUpType, number>;
  canAffordCoins: (amount: number) => boolean;
  onPowerCardClick?: (type: PowerUpType) => void;
}

export function ShopStandardLayout({
  sections,
  gems,
  purchasedItems,
  isPurchasing,
  isFrameUnlocked,
  onItemClick,
  onSinglePowerPurchase,
  initialScrollSection,
  powerUps,
  canAffordCoins,
  onPowerCardClick,
}: ShopStandardLayoutProps) {
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasScrolled = useRef(false);
  const isDesktop = useIsBreakpointUp("xl");

  // Scroll to initial section on mount
  useEffect(() => {
    if (initialScrollSection && !hasScrolled.current) {
      // Small delay to ensure refs are set
      const timer = setTimeout(() => {
        const ref = sectionRefs.current.get(initialScrollSection);
        if (ref) {
          ref.scrollIntoView({ behavior: "smooth", block: "start" });
          hasScrolled.current = true;
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialScrollSection]);

  const handleSlideClick = (sectionId: string) => {
    const ref = sectionRefs.current.get(sectionId);
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleItemClick = async (item: ShopItem) => {
    // Directly purchase without opening detail modal
    await onItemClick(item);
  };

  // Filter out frames section
  const displaySections = sections.filter(section => section.id !== "frames");

  return (
    <div className="flex-1 pb-8">
      {/* Hero Carousel - Desktop only / PRO Carousel - Mobile/Tablet */}
      {isDesktop ? (
        <ShopHeroCarousel onSlideClick={handleSlideClick} />
      ) : (
        <MobileProCarousel />
      )}

      {/* My Powers Section - individual purchase */}
      <MyPowersSection
        powerUps={powerUps ?? { "5050": 0, freeze: 0, replace: 0, "time-drain": 0 }}
        onPurchaseSingle={onSinglePowerPurchase}
        isPurchasing={isPurchasing}
        canAffordCoins={canAffordCoins}
        onCardClick={onPowerCardClick}
      />

      {/* Product Sections */}
      {displaySections.map((section, index) => (
        <motion.div
          key={section.id}
          ref={(el) => {
            if (el) sectionRefs.current.set(section.id, el);
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <ShopProductGrid
            sectionId={section.id}
            title={section.title}
            items={section.items}
            gems={gems}
            purchasedItems={purchasedItems}
            isPurchasing={isPurchasing}
            isFrameUnlocked={isFrameUnlocked}
            onItemClick={handleItemClick}
          />
        </motion.div>
      ))}
    </div>
  );
}
