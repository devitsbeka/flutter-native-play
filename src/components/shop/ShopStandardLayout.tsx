import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  // The section arrived at, nudged once so it is obvious which one the tap
  // on the coin or gem pill was about.
  const [arrivedAt, setArrivedAt] = useState<string | null>(null);

  // Scroll to the asked-for section, then nudge it.
  useEffect(() => {
    if (!initialScrollSection || hasScrolled.current) return;

    let frame = 0;
    let tries = 0;
    let nudge: ReturnType<typeof setTimeout>;
    let corrections: ReturnType<typeof setTimeout>[] = [];
    let cleanupListeners = () => {};

    const run = () => {
      const el = sectionRefs.current.get(initialScrollSection);
      // Sections mount with the shop data, which is not always ready on the
      // first frame. A fixed timeout either fired before they existed and
      // did nothing, or waited longer than it needed to.
      if (!el) {
        if (tries++ < 60) frame = requestAnimationFrame(run);
        return;
      }
      hasScrolled.current = true;

      // Where it stops is set by scroll-margin on the section itself, so the
      // browser owns the movement — no hand-computed scrollTop, which is
      // what turned a scroll into a fight with itself.
      const goThere = () => el.scrollIntoView({ behavior: "smooth", block: "start" });
      goThere();

      // Everything above the section is still arriving — the offers reel,
      // the powers row, their artwork — and each thing that lands pushes it
      // further down, so one scroll leaves the heading wherever the page
      // happened to be a moment later. Asking again twice puts it back.
      // Landing correctly makes these no-ops: the browser has nowhere to
      // move it to.
      //
      // Unless the player has taken over. Correcting after that would drag
      // them back from wherever they chose to be.
      let cancelled = false;
      const release = () => { cancelled = true; };
      window.addEventListener("wheel", release, { once: true, passive: true });
      window.addEventListener("touchstart", release, { once: true, passive: true });
      corrections = [700, 1400].map((ms) =>
        setTimeout(() => { if (!cancelled) goThere(); }, ms)
      );

      // After the travel, not during it — a shake competing with a scroll
      // reads as a glitch rather than as an answer to "which one is mine".
      nudge = setTimeout(() => setArrivedAt(initialScrollSection), 1700);
      cleanupListeners = () => {
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchstart", release);
      };
    };

    frame = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(nudge);
      corrections.forEach(clearTimeout);
      cleanupListeners();
    };
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
        <motion.div
          key={section.id}
          ref={(el) => {
            if (el) sectionRefs.current.set(section.id, el);
          }}
          // Where scrollIntoView stops. One value at every width: which
          // element ends up doing the scrolling depends on the layout, and
          // on the narrow one the sticky shop header is inside it — a
          // heading parked flush with the top lands under the header, which
          // is the whole complaint. Erring high costs a little space above
          // the title; erring low hides it. Declared here so the browser
          // stays in charge of the scroll itself.
          className="scroll-mt-24"
          // One left-right nudge on arrival. Small on purpose: it is a
          // pointer, not an alert.
          animate={arrivedAt === section.id ? { x: [0, -7, 7, 0] } : { x: 0 }}
          transition={{ duration: 0.42, ease: "easeInOut" }}
          onAnimationComplete={() => {
            if (arrivedAt === section.id) setArrivedAt(null);
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
        </motion.div>
      ))}

    </div>
  );
}
