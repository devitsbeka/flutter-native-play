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
import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { getResponsiveVideoSrc, videoUrl } from "@/config/videoConfig";
import { useIsMobile } from "@/hooks/use-mobile";
import { matchesQuery } from "@/utils/searchMatch";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";
import { funRowCategories } from "@/utils/discoverRows";

const HERO_VIDEO = "/videos/explore-bg.mp4";
const HERO_STILL = "/videos/explore-bg-still.jpg";

/* The video takes what the phone can actually show — the viewport less the
   safe-area insets the root already pads for, less the bottom nav floating
   over the scroller — minus the sheet's peek. Measured against a bare
   100dvh the peek lands behind the nav, where nobody sees it.

   96px is what the peek needs to be worth peeking at: the grab handle plus
   enough of the 76px heading row to read the page's name. A proportional
   tenth left a bare handle above the nav and nothing else. */
// Written out in full, never assembled: Tailwind reads these files as text,
// so a class name built from a template literal is a class that never gets
// generated — the hero collapsed to nothing the first time this was one.
const HERO_HEIGHT =
  "h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom)_-_var(--bottom-nav-height)_-_96px)]";

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

  // Phones open on the video, with the category sheet resting at the bottom
  // of it; the sheet is ordinary page content, so pulling it up is just
  // scrolling. `isMobile` only gates mounting the <video> — the layout
  // itself is CSS, so it is right on the first paint rather than the second.
  const isMobile = useIsMobile();
  const sheetRef = useRef<HTMLDivElement>(null);

  const heroSources = useMemo(() => {
    const { webm, mp4 } = getResponsiveVideoSrc(HERO_VIDEO);
    return [
      { src: webm, type: "video/webm" },
      { src: mp4, type: "video/mp4" },
    ];
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

    if (activeTab !== "all") {
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
  const popularCategories = useMemo(() => {
    // The six picture-guess categories front the row (launch decision:
    // they replace the old curated topic list — see popularImageCategories).
    // Until their migration has run in a given environment they don't exist
    // in `categories`, so fall back to the old curated list rather than
    // rendering an empty Popular row.
    const FALLBACK_IDS = [
      "movies", "tv_series", "music", "sports", "world_history", "geography",
      "science", "pop_culture", "video_games", "celebrities", "animals", "fun_facts",
    ];
    const byId = new Map(categories.map((c) => [c.id, c]));
    const pictureGuess = POPULAR_IMAGE_CATEGORY_IDS
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    if (pictureGuess.length > 0) return pictureGuess;
    return FALLBACK_IDS.map((id) => byId.get(id)).filter(
      (c): c is NonNullable<typeof c> => Boolean(c)
    );
  }, [categories]);

  // Recently viewed from localStorage
  const recentlyViewed = useMemo(() => {
    const stored = localStorage.getItem("recentlyViewedCategories");
    if (!stored) return [];
    try {
      const ids = JSON.parse(stored) as string[];
      return ids
        .map((id) => categories.find((cat) => cat.id === id))
        .filter(Boolean)
        .slice(0, 6);
    } catch {
      return [];
    }
  }, [categories]);

  // Stable, so the memoised cards below actually skip a re-render. A new
  // function identity every keystroke would defeat memo() on all forty of
  // them, which is the same as not having it.
  const handleCategoryClick = useCallback((categoryId: string) => {
    const stored = localStorage.getItem("recentlyViewedCategories");
    let ids: string[] = [];
    try {
      ids = stored ? JSON.parse(stored) : [];
    } catch {
      ids = [];
    }
    ids = [categoryId, ...ids.filter((id) => id !== categoryId)].slice(0, 10);
    localStorage.setItem("recentlyViewedCategories", JSON.stringify(ids));

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
    <div className={`flex items-center gap-1 ${isMobile ? "[&_svg]:text-white" : ""}`}>
      <button
        onClick={() => {
          if (!isSearchExpanded) expandSheet();
          setIsSearchExpanded(!isSearchExpanded);
        }}
        aria-label={t("discover.searchPlaceholder")}
        className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
          isMobile ? "text-white hover:bg-white/20" : "text-gray-600 hover:bg-white/30"
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
      rightElements={headerActions}
    />
  );

  return (
    <MainLayout showPlayButton={false}>
      <div className="relative min-h-full bg-[#F8F6FC]">

        {/* The video, on phones only.
         *
         * Sticky rather than fixed: `position: fixed` inside this scroller
         * is measured from whichever ancestor happens to be carrying a
         * transform, and framer-motion writes transforms on this page all
         * the time. Sticky is measured from the scroller itself, so the
         * video holds still while the sheet slides up over it. */}
        <div
          aria-hidden
          className={`md:hidden pointer-events-none sticky top-0 z-0 w-full ${HERO_HEIGHT}`}
        >
          {/* Sized to the whole scroller, not to the hero: the sheet is
              translucent, so the video has to keep going behind it or the
              glass turns to flat wash at the hero's bottom edge — a seam
              straight across the middle of the page. In flow the hero is
              still only its own height, which is what sets the peek. */}
          {isMobile && (
            <BackgroundVideo
              sources={heroSources}
              still={videoUrl(HERO_STILL)}
              className="absolute inset-x-0 top-0 h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-hidden"
            />
          )}
          {/* Darkens the top so a white title and the bar's glass read against
              whatever the video is doing under them, and the bottom so the
              sheet's rounded edge has something to sit on. */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black/25" />
        </div>

        {/* The page's own header, in white, riding on the video. Absolute
            rather than sticky — it belongs to the cover, so it travels up
            with it and leaves the sheet the whole screen once it is open. */}
        {isMobile && (
          <div className="absolute inset-x-0 top-0 z-20">{pageHeader}</div>
        )}

        {/* The sheet: everything the page used to be, on a surface that
         * starts one tenth from the bottom on phones and is the page itself
         * from md up. min-h is a full scroller so there is always enough
         * scroll left to bring its top to the top — with a short tab (an
         * empty Favourites) there would otherwise be nothing to pull. */}
        <div
          ref={sheetRef}
          className="relative z-10 rounded-t-[28px] border-t border-white/60 bg-[rgba(248,246,252,0.84)] backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)] shadow-[0_-12px_32px_rgba(41,17,84,0.35)] min-h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] pb-[calc(var(--bottom-nav-height)_+_var(--safe-bottom)_+_1rem)] md:rounded-none md:border-0 md:bg-[#F8F6FC] md:backdrop-blur-none md:shadow-none md:min-h-full"
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
        <div className="sticky top-0 z-20 bg-[rgba(248,246,252,0.78)] backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)] md:bg-[#F8F6FC]/95 md:backdrop-blur-none">
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
    </MainLayout>
  );
}
