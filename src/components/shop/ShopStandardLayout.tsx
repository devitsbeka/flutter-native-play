import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShopSection, ShopItem } from "@/hooks/useShopData";
import { ShopHeroCarousel } from "./ShopHeroCarousel";
import { ShopProductGrid } from "./ShopProductGrid";
import { ShopItemDetailModal } from "./ShopItemDetailModal";

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
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  const handleSlideClick = (sectionId: string) => {
    const ref = sectionRefs.current.get(sectionId);
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleItemClick = (item: ShopItem) => {
    setSelectedItem(item);
  };

  const handleBuy = async () => {
    if (selectedItem) {
      await onItemClick(selectedItem);
      // Small delay to let success modal render before closing this one
      await new Promise(resolve => setTimeout(resolve, 50));
      setSelectedItem(null);
    }
  };

  // Filter out frames section
  const displaySections = sections.filter(section => section.id !== "frames");

  return (
    <div className="flex-1 overflow-y-auto pb-8">
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

      {/* Item Detail Modal */}
      {selectedItem && (
        <ShopItemDetailModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          canAfford={gems >= selectedItem.price}
          isPurchased={purchasedItems.has(selectedItem.id)}
          isLoading={isPurchasing === selectedItem.id}
          onBuy={handleBuy}
        />
      )}
    </div>
  );
}
