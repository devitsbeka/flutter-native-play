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

  // Land on the asked-for section with its heading in view, then nudge it.
  useEffect(() => {
    if (!initialScrollSection || hasScrolled.current) return;

    let frame = 0;
    let tries = 0;
    let nudge: ReturnType<typeof setTimeout>;

    // The scroller is not always the window here: the shop body is its own
    // overflow-y-auto column on desktop and the page scroller on a phone.
    const scrollParentOf = (el: HTMLElement): HTMLElement | null => {
      let node = el.parentElement;
      while (node) {
        const overflow = getComputedStyle(node).overflowY;
        if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) {
          return node;
        }
        node = node.parentElement;
      }
      return null;
    };

    const run = () => {
      const el = sectionRefs.current.get(initialScrollSection);
      // Sections mount with the shop data, which is not always ready on the
      // first frame. A fixed timeout either fired too early and did nothing
      // or waited longer than it needed to.
      if (!el) {
        if (tries++ < 60) frame = requestAnimationFrame(run);
        return;
      }
      hasScrolled.current = true;

      const scroller = scrollParentOf(el);
      if (!scroller) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        nudge = setTimeout(() => setArrivedAt(initialScrollSection), 520);
        return;
      }

      // How far down the scroller's own top the content really starts. The
      // shop header is sticky, and on the narrow layout it sticks inside
      // this same scroller — landing the heading flush with the top would
      // park it underneath. Measured rather than assumed, because on the
      // wide layout the header sits outside this scroller and there is
      // nothing to clear.
      const stickyInset = () => {
        const scTop = scroller.getBoundingClientRect().top;
        let inset = 0;
        for (const node of Array.from(scroller.querySelectorAll<HTMLElement>("*"))) {
          if (getComputedStyle(node).position !== "sticky") continue;
          const r = node.getBoundingClientRect();
          if (r.height === 0 || r.top > scTop + 4) continue;
          inset = Math.max(inset, r.bottom - scTop);
        }
        return inset;
      };

      const HEADROOM = 16;
      const targetTop = () =>
        Math.max(
          0,
          el.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top +
            scroller.scrollTop -
            stickyInset() -
            HEADROOM
        );

      scroller.scrollTo({ top: targetTop(), behavior: "smooth" });

      // Everything above this section is still arriving — the offers reel,
      // the powers row, their artwork — and each thing that lands pushes the
      // section further down. Scrolling once put the heading wherever the
      // page happened to be a moment later, which is how you end up at a
      // section with its title off screen. Hold the position while the
      // layout settles, then stop and let the player scroll.
      const settleUntil = performance.now() + 1400;
      const hold = () => {
        const drift = targetTop() - scroller.scrollTop;
        if (Math.abs(drift) > 4) {
          scroller.scrollTo({ top: targetTop(), behavior: "auto" });
        }
        if (performance.now() < settleUntil) frame = requestAnimationFrame(hold);
        else setArrivedAt(initialScrollSection);
      };
      // Let the smooth scroll play first; correcting during it would fight it.
      nudge = setTimeout(() => {
        frame = requestAnimationFrame(hold);
      }, 460);
    };

    frame = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(nudge);
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
