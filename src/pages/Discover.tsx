import { useState, useMemo, useEffect, useRef } from "react";
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
import { matchesQuery } from "@/utils/searchMatch";

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

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
    if (searchQuery.trim()) {
      result = result.filter((cat) =>
        matchesQuery(searchQuery, [cat.name, cat.description])
      );
    }

    if (activeTab !== "all") {
      result = result.filter((cat) => cat.type === activeTab);
    }

    return result;
  }, [categories, searchQuery, activeTab]);

  // Group categories by type
  const classicCategories = useMemo(
    () => categories.filter((cat) => cat.type === "classic"),
    [categories]
  );
  const funCategories = useMemo(
    () => categories.filter((cat) => cat.type === "fun"),
    [categories]
  );
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
    const POPULAR_IDS = [
      "movies",
      "tv_series",
      "music",
      "sports",
      "world_history",
      "geography",
      "science",
      "pop_culture",
      "video_games",
      "celebrities",
      "animals",
      "fun_facts",
    ];
    const byId = new Map(categories.map((c) => [c.id, c]));
    return POPULAR_IDS.map((id) => byId.get(id)).filter(
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

  const handleCategoryClick = (categoryId: string) => {
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
  };

  const getBadge = (_category: any, index: number) => {
    if (index < 2) return t("discover.trending");
    return undefined;
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <MainLayout showPlayButton={false}>
      <div className="min-h-screen pb-24 bg-[#F8F6FC]">

        {/* Sticky header section */}
        <div className="sticky top-0 z-20 bg-[#F8F6FC]/95">
          <div>
            <PageHeader
              title={t("discover.title")}
              showBack={false}
              rightElements={
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                    className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors text-gray-600"
                  >
                    {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                  </button>
                  <HeaderActions showSearch={false} />
                </div>
              }
            />
          </div>

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
    </MainLayout>
  );
}
