import { useRef, useEffect } from "react";
import { ShopSection, ShopItem } from "@/hooks/useShopData";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShopProductGrid } from "./ShopProductGrid";
import { ProBannerReel } from "./MobileProCarousel";
import { MyPowersSection } from "./MyPowersSection";
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

  // Frames stay hidden; the ×3 powers packs section is gone — individual
  // powers are already purchasable in My Powers right above it
  const displaySections = sections.filter(
    (section) => section.id !== "frames" && section.id !== "powers"
  );

  return (
    <div className="flex-1 pb-8">
      {/* შეთავაზებები opens the page. Phones: one swipeable reel holds every
          banner (deals, invite, PRO tiers). md+: the two PRO tiers open the
          page and the deals grid re-appears after the coins section. */}
      <div className="relative z-10 mx-3 sm:mx-4 mt-4 mb-3 flex items-center px-1">
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">{t("shop.deals")}</h2>
      </div>

      {/* One reel at every width: it shows one banner on a phone and two or
          three once there is room, so there is a single set of offers rather
          than a phone version and a desktop version that drift apart. */}
      <ProBannerReel
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

      {/* Product Sections — on md+ the rotating deals grid slots in right
          after the coins section */}
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
