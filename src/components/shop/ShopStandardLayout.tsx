import { useRef, useEffect } from "react";
import { ShopSection, ShopItem } from "@/hooks/useShopData";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopProductGrid } from "./ShopProductGrid";
import { MobileProCarousel } from "./MobileProCarousel";
import { MyPowersSection } from "./MyPowersSection";
import { DailyDealsRow } from "./DailyDealsRow";
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
  const { t } = useLanguage();
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasScrolled = useRef(false);

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

  const handleItemClick = async (item: ShopItem) => {
    // Directly purchase without opening detail modal
    await onItemClick(item);
  };

  // Filter out frames section
  const displaySections = sections.filter(section => section.id !== "frames");

  return (
    <div className="flex-1 pb-8">
      {/* შეთავაზებები opens the page: one title over the whole deals group
          (PRO banner + rotating daily/hourly bundles), then My Powers etc. */}
      <div className="relative z-10 mx-3 sm:mx-4 mt-4 flex items-center px-1">
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">{t("shop.deals")}</h2>
      </div>

      {/* PRO Carousel - phones only. Tablet and desktop open straight with
          My Powers; on desktop the PRO banner lives in the right sidebar. */}
      <div className="md:hidden">
        <MobileProCarousel />
      </div>

      {/* Rotating daily + hourly bundle deals */}
      <DailyDealsRow
        hideTitle
        purchasedItems={purchasedItems}
        isPurchasing={isPurchasing}
        onItemClick={handleItemClick}
      />

      {/* My Powers Section - individual purchase */}
      <MyPowersSection
        powerUps={powerUps ?? { "5050": 0, freeze: 0, replace: 0, "time-drain": 0 }}
        onPurchaseSingle={onSinglePowerPurchase}
        isPurchasing={isPurchasing}
        canAffordCoins={canAffordCoins}
        onCardClick={onPowerCardClick}
      />

      {/* Product Sections */}
      {displaySections.map((section) => (
        <div
          key={section.id}
          ref={(el) => {
            if (el) sectionRefs.current.set(section.id, el);
          }}
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
        </div>
      ))}

    </div>
  );
}
