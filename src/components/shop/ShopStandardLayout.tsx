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
    // The player taking over wins over anything left to do here: moving the
    // page after that would drag them back from where they chose to be.
    let cancelled = false;
    const release = () => { cancelled = true; };
    window.addEventListener("wheel", release, { once: true, passive: true });
    window.addEventListener("touchstart", release, { once: true, passive: true });

    // Calls `then` once `measure` has held the same value for a few frames —
    // never before `minMs`, and never later than `capMs`. Watching what the
    // page is actually doing is what replaces guessing at it with timeouts.
    const whenStill = (
      measure: () => number,
      { minMs = 0, capMs }: { minMs?: number; capMs: number },
      then: () => void,
    ) => {
      let last = NaN;
      let steady = 0;
      const startedAt = performance.now();
      const tick = () => {
        if (cancelled) return;
        const value = Math.round(measure());
        steady = value === last ? steady + 1 : 0;
        last = value;
        const elapsed = performance.now() - startedAt;
        if ((steady >= 5 && elapsed >= minMs) || elapsed > capMs) {
          then();
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    // Which element actually scrolls depends on the layout — on the narrow
    // one it is a container inside the page, not the document — and the two
    // report their position through different properties. Everything below
    // reads and moves whichever one it turns out to be.
    const scrollerOf = (el: HTMLElement): HTMLElement => {
      for (let n = el.parentElement; n; n = n.parentElement) {
        const overflowY = getComputedStyle(n).overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && n.scrollHeight > n.clientHeight + 4) {
          return n;
        }
      }
      return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
    };

    // Anything that loads above the section after it has been scrolled to
    // pushes it down again. Rather than scrolling a second time — the jump
    // that made arriving feel like two separate landings — the page is moved
    // by the same amount underneath it, which holds the section exactly where
    // it is and is invisible. Held for a short while, and dropped the moment
    // the scroll position changes for any reason other than this: whatever
    // else moved the page is the player, and they win.
    const pinInPlace = (el: HTMLElement, scroller: HTMLElement) => {
      const restingTop = Math.round(el.getBoundingClientRect().top);
      let ownTop = Math.round(scroller.scrollTop);
      const until = performance.now() + 1200;
      const hold = () => {
        if (cancelled || performance.now() > until) return;
        if (Math.round(scroller.scrollTop) !== ownTop) return;
        const drift = Math.round(el.getBoundingClientRect().top) - restingTop;
        if (drift !== 0) {
          scroller.scrollBy({ top: drift, behavior: "auto" });
          ownTop = Math.round(scroller.scrollTop);
        }
        frame = requestAnimationFrame(hold);
      };
      frame = requestAnimationFrame(hold);
    };

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
      const scroller = scrollerOf(el);

      // Everything above the section is still arriving — the offers reel,
      // the powers row, their artwork — and each thing that lands pushes the
      // section further down. Scrolling into that meant landing wrong and
      // being yanked back twice; waiting for the section to stop moving
      // first buys one scroll that goes straight there.
      whenStill(() => el.getBoundingClientRect().top + scroller.scrollTop, { capMs: 1500 }, () => {
        // Where it stops is set by scroll-margin on the section itself, so
        // the browser owns the movement — no hand-computed scrollTop, which
        // is what turned a scroll into a fight with itself.
        el.scrollIntoView({ behavior: "smooth", block: "start" });

        // After the travel, not during it — a shake competing with a scroll
        // reads as a glitch rather than as an answer to "which one is mine".
        // It fires when the page actually stops, however long that took.
        whenStill(() => el.getBoundingClientRect().top, { minMs: 150, capMs: 2000 }, () => {
          setArrivedAt(initialScrollSection);
          pinInPlace(el, scroller);
        });
      });
    };

    frame = requestAnimationFrame(run);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
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
    <div className="flex-1 pt-4 pb-8">
      {/* The reel opens the page with no heading over it. The banners say what
          they are — a discount, an invite, a PRO tier — and "შეთავაზებები"
          above them only repeated that, one line further from the offer.

          One reel at every width: it shows one banner on a phone and two or
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
