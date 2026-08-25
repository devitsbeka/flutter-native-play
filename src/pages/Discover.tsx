import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserCategoryRanks } from "@/hooks/useUserCategoryRanks";
import { useNewCategories } from "@/hooks/useNewCategories";
import { useLanguage } from "@/contexts/LanguageContext";
import { IconTabBar } from "@/components/shared/IconTabBar";
import { SectionHeader } from "@/components/discover/SectionHeader";
import { CategoryCarousel } from "@/components/discover/CategoryCarousel";
import { CategoryGrid } from "@/components/discover/CategoryGrid";

import { PageHeader } from "@/components/shared/PageHeader";
import { HeaderActions } from "@/components/shared/HeaderActions";
import { Capacitor } from "@capacitor/core";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProPaywallModal } from "@/components/pro/ProPaywallModal";
import { useInAppPurchases } from "@/hooks/useInAppPurchases";
import { useStorePrice } from "@/hooks/useStorePrice";
import { availablePlans, defaultPlan } from "@/config/proPlans";
import { PRICES } from "@/config/pricing";
import { matchesQuery } from "@/utils/searchMatch";
import { orderByPopularity, readRecentlyViewedIds, RECENTLY_VIEWED_KEY } from "@/utils/categoryTabs";
import { funRowCategories } from "@/utils/discoverRows";

/* The cover's artwork, drawn at the 500x946 the design was laid out at.
   object-cover on a narrower phone crops the sides, which is what the
   bubbles at the edges are there to absorb.

   This replaced the explore-bg video loop: the design's cover is this
   still, and the promo copy sits on the calm middle of it. The video and
   its poster are still in public/videos, unused by this page. */
const HERO_ART = "/images/bgs.png";

/* Where the cover stops and the sheet starts: 47% of what the phone can
   actually show, the viewport less the safe-area insets the root already
   pads for.

   That is the frame's own line — its sheet opens at 444 of 946 — and it is
   a share rather than a subtraction because it has to hold on a screen of
   any height. It used to be everything minus a 96px peek, which left the
   sheet a handle's worth of itself above the nav.

   The offer above it is laid out against the same 47%, so the two move
   together: see the tops in the cover's copy below. */
// Written out in full, never assembled: Tailwind reads these files as text,
// so a class name built from a template literal is a class that never gets
// generated — the hero collapsed to nothing the first time this was one.
/** PageHeader's row, which every page shares. */
const HEADER_HEIGHT = 76;

const HERO_HEIGHT =
  "h-[calc((100dvh_-_var(--safe-top)_-_var(--safe-bottom))_*_0.47)]";

// ─── Lazy Section: only mounts children when scrolled near viewport ─────

function LazySection({ children, minHeight = 280 }: { children: React.ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? children : <div style={{ height: minHeight }} />}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

export default function Discover() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // The input reads searchQuery so the caret never lags; the filtering reads
  // this, which React is free to leave a frame behind. Without it every
  // keystroke re-filtered and re-rendered the whole grid before the character
  // appeared, which is the delay when typing.
  const deferredQuery = useDeferredValue(searchQuery);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Phones open on the cover, with the category sheet resting at the bottom
  // of it; the sheet is ordinary page content, so pulling it up is just
  // scrolling. `isMobile` gates the header's overlay treatment — the layout
  // itself is CSS, so it is right on the first paint rather than the second.
  const isMobile = useIsMobile();
  const sheetRef = useRef<HTMLDivElement>(null);

  // True once the sheet has risen far enough that the header is over the
  // categories rather than over the cover. The header then takes a white
  // surface and the accent colour, because white-on-artwork stops working
  // the moment the artwork is gone.
  //
  // Read off the scroller rather than an IntersectionObserver: the threshold
  // is the sheet's own top less the header's height, which is a number this
  // page already knows, and rAF keeps it to one read per frame.
  const [headerDocked, setHeaderDocked] = useState(false);

  // The cover's offer opens the paywall here rather than routing to the PRO
  // tab: the offer names a trial and a price, and a screen that asks which
  // plan is the screen that can honour it.
  const [paywallOpen, setPaywallOpen] = useState(false);

  // The cover's price line, read off the same plan the paywall would open
  // on. It used to be a sentence in the locale file naming a trial the store
  // does not grant and a price nobody is charged — the design's "$10 / თვე"
  // was the 9.99 GEL web price wearing a dollar sign.
  const { products } = useInAppPurchases();
  const resolvePrice = useStorePrice();
  const offerNote = useMemo(() => {
    const plan = defaultPlan(
      availablePlans(products.map((p) => p.productId), Capacitor.isNativePlatform()),
    );
    if (!plan) return "";
    const price = resolvePrice(plan.productId, PRICES[plan.priceKey].USD, plan.priceKey).display;
    // The trial is whatever the store product actually carries, not a figure
    // from the bundle — promising free days App Store Connect does not grant
    // is the same 2.3.1 problem here as on the paywall itself.
    const trialDays = products.find((p) => p.productId === plan.productId)?.introFreeDays;
    return (trialDays ? t("discover.promoNoteTrial") : t("discover.promoNote"))
      .replace("{days}", String(trialDays ?? 0))
      .replace("{price}", price);
  }, [products, resolvePrice, t]);

  useEffect(() => {
    const scroller = document.getElementById("main-scroll-container");
    if (!scroller) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const sheet = sheetRef.current;
      if (!sheet) return;
      setHeaderDocked(scroller.scrollTop >= sheet.offsetTop - HEADER_HEIGHT);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    read();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);


  // Bring the sheet up to the top of the scroller. Tapping the grab handle
  // does it, and so does opening search — a search box that scrolls itself
  // into view beats one that opens off screen.
  const expandSheet = useCallback(() => {
    const scroller = document.getElementById("main-scroll-container");
    const sheet = sheetRef.current;
    if (!scroller || !sheet) return;
    if (scroller.scrollTop >= sheet.offsetTop - 1) return;
    scroller.scrollTo({ top: sheet.offsetTop, behavior: "smooth" });
  }, []);

  const tabs = useMemo(() => [
    // Free and premium lead the strip, as the design has them. They are the
    // only two tabs that split the catalogue by what a subscription buys
    // rather than by subject, which is why they sit apart from the rest.
    { id: "free", label: t("discover.free") },
    { id: "premium", label: t("discover.premium") },
    { id: "all", label: t("discover.all") },
    { id: "favorites", label: t("discover.favorites") },
    { id: "recently_viewed", label: t("discover.recentlyViewedTab") },
    { id: "popular", label: t("discover.popularTab") },
    { id: "classic", label: t("discover.classic") },
    { id: "fun", label: t("discover.fun") },
    { id: "educational", label: t("discover.educational") },
  ], [t]);

  const { categories, loading } = useCategories();
  const { progress } = useCategoryProgress();
  const { favorites, toggleFavorite } = useFavorites();
  const { ranks: leaderboardRanks } = useUserCategoryRanks();
  const { newCategories } = useNewCategories();

  // Transform progress to simple number map
  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(progress).forEach(([key, value]) => {
      map[key] = value?.completedLevels?.length || 0;
    });
    return map;
  }, [progress]);

  // Filter categories based on search and tab
  const filteredCategories = useMemo(() => {
    let result = categories;

    // Latin spelling finds a Georgian category, same as the rooms list:
    // "ბუნება" answers to `buneba` and to `bu`.
    if (deferredQuery.trim()) {
      result = result.filter((cat) =>
        matchesQuery(deferredQuery, [cat.name, cat.description])
      );
    }

    // `is_premium` is a column the client can ship without: before the
    // migration lands it comes back undefined, isPremium is false, and Free
    // shows the whole catalogue rather than an empty grid.
    if (activeTab === "free") {
      result = result.filter((cat) => !cat.isPremium);
    } else if (activeTab === "premium") {
      result = result.filter((cat) => cat.isPremium);
    } else if (activeTab !== "all") {
      result = result.filter((cat) => cat.type === activeTab);
    }

    return result;
  }, [categories, deferredQuery, activeTab]);

  // Group categories by type
  const classicCategories = useMemo(
    () => categories.filter((cat) => cat.type === "classic"),
    [categories]
  );
  // Fun shows what Popular is not already showing — see funRowCategories.
  const funCategories = useMemo(() => funRowCategories(categories), [categories]);
  const educationalCategories = useMemo(
    () => categories.filter((cat) => cat.type === "educational"),
    [categories]
  );

  // Get favorite categories - match by uuid, sorted by priority
  const favoriteCategories = useMemo(() => {
    const favs = categories.filter((cat) => favorites.has(cat.uuid || cat.id));

    return favs.sort((a, b) => {
      const aProgress = progressMap[a.id] || 0;
      const bProgress = progressMap[b.id] || 0;
      const aTotalLevels = (a as any).totalLevels || (a as any).total_levels || 20;
      const bTotalLevels = (b as any).totalLevels || (b as any).total_levels || 20;

      const aHasNew = newCategories.has(a.uuid || a.id);
      const bHasNew = newCategories.has(b.uuid || b.id);
      const aCompleted = aProgress >= aTotalLevels;
      const bCompleted = bProgress >= bTotalLevels;

      if (aHasNew && !bHasNew) return -1;
      if (!aHasNew && bHasNew) return 1;
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;

      const aInProgress = aProgress > 0 && !aCompleted;
      const bInProgress = bProgress > 0 && !bCompleted;
      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;

      return 0;
    });
  }, [categories, favorites, progressMap, newCategories]);

  // Popular categories — a curated dozen of the topics people actually
  // search and play the most (cinema, TV, music, sports...), in that order.
  // Replaces the old daily shuffle that surfaced niche picks like geology.
  const popularCategories = useMemo(() => orderByPopularity(categories), [categories]);

  // Recently viewed from localStorage, newest first.
  const recentlyViewed = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    return readRecentlyViewedIds()
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 6);
  }, [categories]);

  // Stable, so the memoised cards below actually skip a re-render. A new
  // function identity every keystroke would defeat memo() on all forty of
  // them, which is the same as not having it.
  const handleCategoryClick = useCallback((categoryId: string) => {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    let ids: string[] = [];
    try {
      ids = stored ? JSON.parse(stored) : [];
    } catch {
      ids = [];
    }
    ids = [categoryId, ...ids.filter((id) => id !== categoryId)].slice(0, 10);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids));

    navigate(`/category/${categoryId}`);
  }, [navigate]);

  const getBadge = useCallback((_category: any, index: number) => {
    if (index < 2) return t("discover.trending");
    return undefined;
  }, [t]);

  // Read the DEFERRED query, not the live one.
  //
  // This flag swaps the entire page — four category carousels out, the
  // results carousel in. Derived from `searchQuery` it flipped during the
  // urgent render that puts the character in the box, so the first keystroke
  // paid for tearing down and rebuilding the whole page before the caret
  // moved: 273ms to show one letter, against ~100ms for every letter after.
  // Deferred, the swap happens in the interruptible pass that the list
  // already renders in, and the character appears at once.
  const isSearching = deferredQuery.trim().length > 0;

  /* Search and the bell. On the phone they sit on the video, so the icons
     invert to white — the bell's grey is baked into HeaderActions, hence the
     descendant rule rather than a prop nobody else would use. */
  const headerActions = (
    <div
      className={`flex items-center gap-1 ${
        isMobile ? (headerDocked ? "[&_svg]:text-[#6D28D9]" : "[&_svg]:text-white") : ""
      }`}
    >
      <button
        onClick={() => {
          if (!isSearchExpanded) expandSheet();
          setIsSearchExpanded(!isSearchExpanded);
        }}
        aria-label={t("discover.searchPlaceholder")}
        className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
          isMobile
            ? headerDocked
              ? "text-[#6D28D9] hover:bg-[#6D28D9]/10"
              : "text-white hover:bg-white/20"
            : "text-gray-600 hover:bg-white/30"
        }`}
      >
        {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
      </button>
      <HeaderActions showSearch={false} />
    </div>
  );

  const pageHeader = (
    <PageHeader
      title={t("discover.title")}
      showBack={false}
      overlay={isMobile}
      docked={headerDocked}
      rightElements={headerActions}
    />
  );

  return (
    <MainLayout showPlayButton={false}>
      <div className="relative min-h-full bg-[#F8F6FC]">

        {/* The page's own header, first in the flow and sticky, so it stays
            on screen for the whole page — over the cover at rest, over the
            categories once the sheet is up — and above both (z-30) rather
            than sliding under the sheet.
         *
         * Two things this cannot be. Absolute, as it was, leaves the cover
         * the moment the sheet rises. Sticky further down the file pins at
         * 770px, its own place in the flow, because sticky does not lift an
         * element to the top — it stops it from leaving. Hence: first, and
         * h-0 so the box it takes in the flow is nothing and the cover still
         * starts at the top of the page. */}
        {isMobile && (
          <div className="sticky top-0 z-30 h-0">{pageHeader}</div>
        )}

        {/* The video, on phones only.
         *
         * Sticky rather than fixed: `position: fixed` inside this scroller
         * is measured from whichever ancestor happens to be carrying a
         * transform, and framer-motion writes transforms on this page all
         * the time. Sticky is measured from the scroller itself, so the
         * video holds still while the sheet slides up over it. */}
        <div
          className={`md:hidden pointer-events-none sticky top-0 z-0 w-full ${HERO_HEIGHT}`}
        >
          {/* The artwork and its scrims, hidden from screen readers as one
              group. The cover's own copy sits outside this — it is the
              page's offer, not decoration, and a button inside an
              aria-hidden subtree is a button nobody using VoiceOver can
              reach. */}
          <div aria-hidden className="absolute inset-0">
          {/* Sized to the whole scroller, not to the hero: the sheet is
              translucent, so the video has to keep going behind it or the
              glass turns to flat wash at the hero's bottom edge — a seam
              straight across the middle of the page. In flow the hero is
              still only its own height, which is what sets the peek. */}
          <img
            src={HERO_ART}
            alt=""
            className="absolute inset-x-0 top-0 h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] w-full object-cover"
          />
          {/* The readability fade, under the copy and over the art.
           *
           * The artwork is at its brightest exactly where the price note
           * sits — the pale horizon band — and white on that is a guess
           * rather than a read. This is a violet of the art's own family
           * rather than black, so it darkens without greying, strongest
           * behind the header and gone by the sheet's edge.
           *
           * The frame's own wash — linear-gradient(194.854deg,
           * rgba(98,66,212,0.588) …) — is deliberately not here: this export
           * already carries that gradient, and painting it twice flattened
           * the bubbles into a sheet of lilac. */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(45,18,92,0.30)_0%,rgba(48,20,96,0.28)_40%,rgba(52,22,104,0.22)_72%,rgba(58,26,112,0.10)_90%,rgba(58,26,112,0)_100%)]" />

          {/* Kept from before the frame, which does not draw this far down:
              the sheet's rounded edge needs something to sit on when the
              video under it is bright. */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black/25" />
          </div>

          {/* The cover's offer.
           *
           * Positioned the way the frame positions it: tops of 133 / 235 /
           * 293 / 363 at the 500px width it was drawn at.
           *
           * Written as 78px + a share of the viewport, not as those numbers
           * flat. 78 is the rule, which hangs off a header that is 76px on
           * every device; everything under it is min(frame px, the same
           * distance as a share of the width), so the block shrinks in step
           * with the cover. Flat, the price note sat at 363 inside a cover
           * that is 358 tall on a 390x844 phone — under the sheet. Type
           * scales the same way, which is also what keeps the headline on
           * two lines instead of three.
           *
           * pointer-events-auto is on the button alone; everything else here
           * stays transparent to touch, so a drag from the middle of the
           * cover still pulls the sheet up. */}
          <div className="absolute inset-x-0 top-0 text-center text-white [text-shadow:0px_3px_21px_rgba(0,0,0,0.16)]">
            {/* The rule under the header: 441 wide at the frame's 500, one
                pixel, in the lilac the file draws it in — at 70%, a third
                quieter than the frame has it, which is where it stops
                competing with the title. */}
            <div aria-hidden className="absolute left-1/2 -translate-x-1/2 top-[78px] h-px w-[min(441px,88.2vw)] bg-[#b8a6f5]/70" />

            <h2 className="absolute left-1/2 -translate-x-1/2 top-[calc(78px_+_min(55px,11vw))] w-[min(393px,86vw)] font-display uppercase text-[min(40px,8vw)] leading-[min(43px,8.6vw)] tracking-[0.5px]">
              {t("discover.promoTitle")}
            </h2>

            <p className="absolute left-1/2 -translate-x-1/2 top-[calc(78px_+_min(157px,31.4vw))] w-full px-6 text-[min(18px,3.6vw)] leading-[min(20.7px,4.14vw)] tracking-[-0.16px]">
              {t("discover.promoSubtitle")}
            </p>

            <button
              type="button"
              onClick={() => setPaywallOpen(true)}
              className="pointer-events-auto absolute left-1/2 -translate-x-1/2 top-[calc(78px_+_min(215px,43vw))] h-[min(53px,10.6vw)] w-[min(192px,38.4vw)] rounded-[min(18.386px,3.68vw)] border-[1.532px] border-solid border-[#e8e0f5] bg-white/80 text-[#5d247f] text-[min(16px,3.2vw)] font-bold uppercase tracking-[-0.16px] [text-shadow:none] shadow-[0px_3.698px_0px_0px_#d8d0e8,0px_5.546px_14.79px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-[0px_1.5px_0px_0px_#d8d0e8,0px_2px_8px_0px_rgba(0,0,0,0.1)] transition-all"
            >
              {t("discover.promoCta")}
            </button>

            <p className="absolute left-1/2 -translate-x-1/2 top-[calc(78px_+_min(285px,57vw))] w-full px-6 text-[min(14px,2.8vw)] leading-[min(20.7px,4.14vw)] tracking-[-0.16px]">
              {offerNote}
            </p>
          </div>

          {/* Last, and over the copy, as the frame stacks it. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[224px] bg-[linear-gradient(180deg,rgba(41,17,84,0.12)_0%,rgba(48,20,96,0.096)_34%,rgba(58,26,112,0)_64%,rgba(58,26,112,0)_100%)]"
          />
        </div>


        {/* The sheet: everything the page used to be, on a surface that
         * starts one tenth from the bottom on phones and is the page itself
         * from md up. min-h is a full scroller so there is always enough
         * scroll left to bring its top to the top — with a short tab (an
         * empty Favourites) there would otherwise be nothing to pull. */}
        <div
          ref={sheetRef}
          className="relative z-10 rounded-t-[28px] border-t border-white/60 bg-[#F6F3FB] shadow-[0_-12px_32px_rgba(41,17,84,0.35)] min-h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] pb-[calc(var(--bottom-nav-height)_+_var(--safe-bottom)_+_1rem)] md:rounded-none md:border-0 md:bg-[#F8F6FC] md:shadow-none md:min-h-full"
        >

        {/* The grab handle, and the whole of what the peek has to say before
         * the first scroll — the tab strip below it does the rest. Tapping
         * lifts the sheet for anyone who does not think to drag. */}
        <button
          type="button"
          onClick={expandSheet}
          aria-label={t("discover.title")}
          className="md:hidden w-full flex items-center justify-center rounded-t-[28px] pt-2.5 pb-1"
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-400/50" />
        </button>

        {/* Sticky header section. The title and its actions are on the video
            on phones; what pins here is the search box and the tabs. */}
        {/* Search and tabs pin under the header — 76px down on phones, where
            the header is its own sticky element, and at the top from md up,
            where the header is inside this block. */}
        <div className="sticky top-[76px] md:top-0 z-20 bg-[#F6F3FB] md:bg-[#F8F6FC]/95">
          {!isMobile && <div>{pageHeader}</div>}

          {/* Expandable Search Bar */}
          <AnimatePresence>
            {isSearchExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden px-4 pt-2 pb-2"
              >
                <div
                  className={`flex items-center gap-3 bg-white/90 border border-slate-200 rounded-full px-4 py-3 transition-all shadow-sm ${
                    isSearchFocused ? "ring-2 ring-primary/30" : ""
                  }`}
                >
                  <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder={t("discover.searchPlaceholder")}
                    className="flex-1 bg-transparent text-slate-800 placeholder:text-slate-400 text-base outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="px-4 pt-2 pb-1">
            <IconTabBar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              compact={false}
            />
          </div>
        </div>

        {/* Content */}
        <div className="py-4 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : isSearching ? (
            <div>
              <SectionHeader
                title={t("discover.searchResults").replace("{count}", String(filteredCategories.length))}
              />
              <CategoryCarousel
                categories={filteredCategories}
                progress={progressMap}
                favorites={favorites}
                leaderboardRanks={leaderboardRanks}
                newCategories={newCategories}
                onCategoryClick={handleCategoryClick}
                onFavoriteToggle={toggleFavorite}
              />
              {filteredCategories.length === 0 && (
                <div className="text-center py-12 px-4">
                  <p className="text-slate-500">
                    {t("discover.nothingFound").replace("{query}", searchQuery)}
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === "all" ? (
            <>
              {/* Popular — renders immediately (above the fold) */}
              <section className="mb-6">
                <SectionHeader title={t("discover.popular")} />
                <CategoryCarousel
                  categories={popularCategories}
                  progress={progressMap}
                  favorites={favorites}
                  leaderboardRanks={leaderboardRanks}
                  newCategories={newCategories}
                  onCategoryClick={handleCategoryClick}
                  onFavoriteToggle={toggleFavorite}
                  getBadge={getBadge}
                />
              </section>

              {/* Classic — lazy */}
              <LazySection>
                <section className="mb-6">
                  <SectionHeader title={t("discover.classicTrivia")} />
                  <CategoryCarousel
                    categories={classicCategories}
                    progress={progressMap}
                    favorites={favorites}
                    leaderboardRanks={leaderboardRanks}
                    newCategories={newCategories}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              </LazySection>

              {/* Fun — lazy */}
              <LazySection>
                <section className="mb-6">
                  <SectionHeader title={t("discover.fun")} />
                  <CategoryCarousel
                    categories={funCategories}
                    progress={progressMap}
                    favorites={favorites}
                    leaderboardRanks={leaderboardRanks}
                    newCategories={newCategories}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              </LazySection>

              {/* Educational — lazy */}
              <LazySection>
                <section className="mb-6">
                  <SectionHeader title={t("discover.educational")} />
                  <CategoryCarousel
                    categories={educationalCategories}
                    progress={progressMap}
                    favorites={favorites}
                    leaderboardRanks={leaderboardRanks}
                    newCategories={newCategories}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              </LazySection>

              {/* Recently Viewed — lazy */}
              {recentlyViewed.length > 0 && (
                <LazySection>
                  <section className="mb-6">
                    <SectionHeader title={t("discover.recentlyViewed")} />
                    <CategoryCarousel
                      categories={recentlyViewed as any[]}
                      progress={progressMap}
                      favorites={favorites}
                      leaderboardRanks={leaderboardRanks}
                      newCategories={newCategories}
                      onCategoryClick={handleCategoryClick}
                      onFavoriteToggle={toggleFavorite}
                    />
                  </section>
                </LazySection>
              )}

              {/* Favorites — lazy */}
              {favoriteCategories.length > 0 && (
                <LazySection>
                  <section className="mb-6">
                    <SectionHeader title={t("discover.favorites")} />
                    <CategoryCarousel
                      categories={favoriteCategories}
                      progress={progressMap}
                      favorites={favorites}
                      leaderboardRanks={leaderboardRanks}
                      newCategories={newCategories}
                      onCategoryClick={handleCategoryClick}
                      onFavoriteToggle={toggleFavorite}
                    />
                  </section>
                </LazySection>
              )}
            </>
          ) : activeTab === "recently_viewed" ? (
            <section>
              <SectionHeader title={t("discover.recentlyViewed")} />
              <CategoryGrid
                categories={recentlyViewed as any[]}
                progress={progressMap}
                favorites={favorites}
                leaderboardRanks={leaderboardRanks}
                newCategories={newCategories}
                onCategoryClick={handleCategoryClick}
                onFavoriteToggle={toggleFavorite}
              />
              {recentlyViewed.length === 0 && (
                <div className="text-center py-12 px-4">
                  <p className="text-slate-500">
                    {t("discover.noRecentlyViewed")}
                  </p>
                </div>
              )}
            </section>
          ) : activeTab === "popular" ? (
            <section>
              <SectionHeader title={t("discover.popular")} />
              <CategoryGrid
                categories={popularCategories}
                progress={progressMap}
                favorites={favorites}
                leaderboardRanks={leaderboardRanks}
                newCategories={newCategories}
                onCategoryClick={handleCategoryClick}
                onFavoriteToggle={toggleFavorite}
                getBadge={getBadge}
              />
            </section>
          ) : activeTab === "favorites" ? (
            <section>
              <SectionHeader title={t("discover.favorites")} />
              <CategoryGrid
                categories={favoriteCategories}
                progress={progressMap}
                favorites={favorites}
                leaderboardRanks={leaderboardRanks}
                newCategories={newCategories}
                onCategoryClick={handleCategoryClick}
                onFavoriteToggle={toggleFavorite}
              />
              {favoriteCategories.length === 0 && (
                <div className="text-center py-12 px-4">
                  <p className="text-slate-500">
                    {t("discover.noFavoritesYet")}
                  </p>
                </div>
              )}
            </section>
          ) : (
            <section>
              <SectionHeader
                title={tabs.find((t) => t.id === activeTab)?.label || ""}
              />
              <CategoryGrid
                categories={filteredCategories}
                progress={progressMap}
                favorites={favorites}
                leaderboardRanks={leaderboardRanks}
                newCategories={newCategories}
                onCategoryClick={handleCategoryClick}
                onFavoriteToggle={toggleFavorite}
              />
              {filteredCategories.length === 0 && (
                <div className="text-center py-12 px-4">
                  <p className="text-slate-500">
                    {t("discover.nothingInCategory")}
                  </p>
                </div>
              )}
            </section>
          )}
          </div>

        </div>

      </div>

      <ProPaywallModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </MainLayout>
  );
}
