import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ShopSection, ShopItem } from "@/hooks/useShopData";
import { ShopHeroCarousel } from "./ShopHeroCarousel";
import { ShopProductGrid } from "./ShopProductGrid";
import { MobileProCarousel } from "./MobileProCarousel";
import { useIsBreakpointUp } from "@/hooks/use-breakpoint";

interface ShopStandardLayoutProps {
  sections: ShopSection[];
  gems: number;
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  isFrameUnlocked: (frameId: string) => boolean;
  onItemClick: (item: ShopItem) => Promise<void>;
  initialScrollSection?: string;
}

export function ShopStandardLayout({
  sections,
  gems,
  purchasedItems,
  isPurchasing,
  isFrameUnlocked,
  onItemClick,
  initialScrollSection,
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
