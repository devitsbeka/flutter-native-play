import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShopSection, ShopItem as ShopItemData } from "@/hooks/useShopData";
import { ShopItemCard } from "./ShopItemCard";
import { ShopItemDetailModal } from "./ShopItemDetailModal";
import { PingPongVideo } from "@/components/shared/PingPongVideo";

interface ShopColumnLayoutProps {
  sections: ShopSection[];
  gems: number;
  purchasedItems: Set<string>;
  isPurchasing: string | null;
  isFrameUnlocked: (frameId: string) => boolean;
  onItemClick: (item: ShopItemData) => void;
}

export function ShopColumnLayout({
  sections,
  gems,
  purchasedItems,
  isPurchasing,
  isFrameUnlocked,
  onItemClick,
}: ShopColumnLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ShopItemData | null>(null);
  const [selectedSection, setSelectedSection] = useState<ShopSection | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleItemClick = (item: ShopItemData, section: ShopSection) => {
    setSelectedItem(item);
    setSelectedSection(section);
  };

  const handleBuy = () => {
    if (selectedItem) {
      onItemClick(selectedItem);
      setSelectedItem(null);
      setSelectedSection(null);
    }
  };

  return (
    <>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pt-4 pb-40 cursor-grab active:cursor-grabbing"
        style={{
          scrollBehavior: isDragging ? "auto" : "smooth",
          WebkitOverflowScrolling: "touch",
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {sections.filter(section => section.id !== "frames").map((section, sectionIndex) => (
          <motion.div
            key={section.id}
            className="flex-shrink-0 w-[300px] rounded-3xl overflow-visible relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            {/* Video background */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <PingPongVideo
                src={section.videoSrc}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
            </div>

            {/* Content */}
            <div className="relative z-10 p-4 pt-5 flex flex-col h-[280px]">
              {/* Header */}
              <div>
                <h3 className="text-xl font-display font-bold text-white drop-shadow-lg">
                  {section.title}
                </h3>
                <p className="text-white/70 text-sm drop-shadow">
                  {section.description}
                </p>
              </div>
            </div>

            {/* Items - positioned below card, overflowing */}
            <div className="relative z-10 px-4 flex flex-col gap-3" style={{ marginTop: '-20px' }}>
                {section.items.map((item, itemIndex) => {
                  const canAfford = gems >= item.price;
                  const isPurchased = purchasedItems.has(item.id);
                  const isFrameOwned = (item as any).frameId 
                    ? isFrameUnlocked((item as any).frameId) 
                    : false;
                  const isOwned = isPurchased || isFrameOwned;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sectionIndex * 0.1 + itemIndex * 0.05 }}
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
                        index={itemIndex}
                        onClick={() => handleItemClick(item, section)}
                      />
                    </motion.div>
                  );
                })}
              </div>
          </motion.div>
        ))}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ShopItemDetailModal
          isOpen={!!selectedItem}
          onClose={() => {
            setSelectedItem(null);
            setSelectedSection(null);
          }}
          item={selectedItem}
          canAfford={gems >= selectedItem.price}
          isPurchased={purchasedItems.has(selectedItem.id)}
          isLoading={isPurchasing === selectedItem.id}
          onBuy={handleBuy}
        />
      )}
    </>
  );
}
