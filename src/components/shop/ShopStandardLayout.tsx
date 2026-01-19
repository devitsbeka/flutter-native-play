import { useRef } from "react";
import { motion } from "framer-motion";
import { ShopSection, ShopItem } from "@/hooks/useShopData";
import { ShopHeroCarousel } from "./ShopHeroCarousel";
import { ShopProductGrid } from "./ShopProductGrid";

interface ShopStandardLayoutProps {
  sections: ShopSection[];
  gems: number;
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  isFrameUnlocked: (frameId: string) => boolean;
  onItemClick: (item: ShopItem) => Promise<void>;
}

export function ShopStandardLayout({
  sections,
  gems,
  purchasedItems,
  isPurchasing,
  isFrameUnlocked,
  onItemClick,
}: ShopStandardLayoutProps) {
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
      {/* Hero Carousel */}
      <ShopHeroCarousel onSlideClick={handleSlideClick} />

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
