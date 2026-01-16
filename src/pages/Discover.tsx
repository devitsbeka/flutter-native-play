import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserCategoryRanks } from "@/hooks/useUserCategoryRanks";
import { useNewLevels } from "@/hooks/useNewLevels";
import { useLanguage } from "@/contexts/LanguageContext";
import { IconTabBar } from "@/components/shared/IconTabBar";
import { SectionHeader } from "@/components/discover/SectionHeader";
import { CategoryCarousel } from "@/components/discover/CategoryCarousel";
import { CategoryGrid } from "@/components/discover/CategoryGrid";

import { PageHeader } from "@/components/shared/PageHeader";

export default function Discover() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const tabs = useMemo(() => [
    { id: "all", label: t("discover.all") },
    { id: "favorites", label: t("discover.favorites") },
    { id: "classic", label: t("discover.classic") },
    { id: "fun", label: t("discover.fun") },
    { id: "educational", label: t("discover.educational") },
  ], [t]);

  // Track scroll position for compact header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { categories, loading } = useCategories();
  const { progress } = useCategoryProgress();
  const { favorites, toggleFavorite } = useFavorites();
  const { ranks: leaderboardRanks } = useUserCategoryRanks();
  const { newLevelCategories } = useNewLevels();

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
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (cat) =>
          cat.name.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query)
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
    
    // Sort: 1) New levels first, 2) In-progress, 3) Not started, 4) Completed last
    return favs.sort((a, b) => {
      const aProgress = progressMap[a.id] || 0;
      const bProgress = progressMap[b.id] || 0;
      const aTotalLevels = (a as any).totalLevels || (a as any).total_levels || 20;
      const bTotalLevels = (b as any).totalLevels || (b as any).total_levels || 20;
      
      const aHasNew = newLevelCategories.has(a.uuid || a.id);
      const bHasNew = newLevelCategories.has(b.uuid || b.id);
      const aCompleted = aProgress >= aTotalLevels;
      const bCompleted = bProgress >= bTotalLevels;
      
      // Priority 1: Categories with NEW levels first
      if (aHasNew && !bHasNew) return -1;
      if (!aHasNew && bHasNew) return 1;
      
      // Priority 2: Completed categories go last
      if (aCompleted && !bCompleted) return 1;
      if (!aCompleted && bCompleted) return -1;
      
      // Priority 3: In-progress before not-started
      const aInProgress = aProgress > 0 && !aCompleted;
      const bInProgress = bProgress > 0 && !bCompleted;
      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;
      
      return 0;
    });
  }, [categories, favorites, progressMap, newLevelCategories]);

  // Get popular categories (first 6 from mixed types)
  const popularCategories = useMemo(
    () => categories.slice(0, 6),
    [categories]
  );

  // Get recently viewed from localStorage
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
    // Save to recently viewed
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

  // Show search results if searching
  const isSearching = searchQuery.trim().length > 0;

  return (
    <MainLayout showPlayButton={false}>
      <div className="min-h-screen pb-24 bg-[#F8F6FC]">
      {/* Subtle overlay for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-white/30 via-white/10 to-white/20 pointer-events-none z-0" />

        {/* Content above mask */}
        <div className="relative z-10">
          {/* Sticky header section */}
          <div className={`sticky top-0 z-20 bg-white/50 backdrop-blur-sm transition-all duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
            {/* Header with Page Title - hide when scrolled */}
            <AnimatePresence>
              {!isScrolled && (
                <motion.div
                  initial={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <PageHeader
                    title={t("discover.title")}
                    showBack={false}
                    rightElements={
                      <button
                        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 shadow-sm hover:bg-white transition-colors"
                      >
                        {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                      </button>
                    }
                  />

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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <div className={`px-4 ${isScrolled ? 'py-2' : 'pt-2 pb-1'}`}>
              <IconTabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                compact={isScrolled}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : isSearching ? (
            /* Search Results */
            <AnimatePresence mode="wait">
              <motion.div
                key="search-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SectionHeader
                  title={t("discover.searchResults").replace("{count}", String(filteredCategories.length))}
                />
                <CategoryCarousel
                  categories={filteredCategories}
                  progress={progressMap}
                  favorites={favorites}
                  leaderboardRanks={leaderboardRanks}
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
              </motion.div>
            </AnimatePresence>
          ) : activeTab === "all" ? (
            /* All Categories - Show Sections */
            <div className="space-y-6">
              {/* Favorites */}
              {favoriteCategories.length > 0 && (
                <section>
                  <SectionHeader
                    title={t("discover.myFavorites")}
                    subtitle={t("discover.chosenByYou")}
                  />
                  <CategoryCarousel
                    categories={favoriteCategories}
                    progress={progressMap}
                    favorites={favorites}
                    leaderboardRanks={leaderboardRanks}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}

              {/* Recently Viewed */}
              {recentlyViewed.length > 0 && (
                <section>
                  <SectionHeader
                    title={t("discover.recentlyViewed")}
                  />
                  <CategoryCarousel
                    categories={recentlyViewed as any[]}
                    progress={progressMap}
                    favorites={favorites}
                    leaderboardRanks={leaderboardRanks}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}

              {/* Popular */}
              <section>
                <SectionHeader
                  title={t("discover.popular")}
                  subtitle={t("discover.mostPlayed")}
                />
                <CategoryCarousel
                  categories={popularCategories}
                  progress={progressMap}
                  favorites={favorites}
                  leaderboardRanks={leaderboardRanks}
                  onCategoryClick={handleCategoryClick}
                  onFavoriteToggle={toggleFavorite}
                  getBadge={getBadge}
                />
              </section>

              {/* Classic */}
              {classicCategories.length > 0 && (
                <section>
                  <SectionHeader
                    title={t("discover.classicTrivia")}
                    subtitle={t("discover.classicSubtitle")}
                    onSeeAll={() => setActiveTab("classic")}
                  />
                  <CategoryCarousel
                    categories={classicCategories}
                    progress={progressMap}
                    favorites={favorites}
                    leaderboardRanks={leaderboardRanks}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}

              {/* Fun */}
              {funCategories.length > 0 && (
                <section>
                  <SectionHeader
                    title={t("discover.fun")}
                    subtitle={t("discover.funSubtitle")}
                    onSeeAll={() => setActiveTab("fun")}
                  />
                  <CategoryCarousel
                    categories={funCategories}
                    progress={progressMap}
                    favorites={favorites}
                    leaderboardRanks={leaderboardRanks}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}

              {/* Educational */}
              {educationalCategories.length > 0 && (
                <section>
                  <SectionHeader
                    title={t("discover.educational")}
                    subtitle={t("discover.educationalSubtitle")}
                    onSeeAll={() => setActiveTab("educational")}
                  />
                  <CategoryCarousel
                    categories={educationalCategories}
                    progress={progressMap}
                    favorites={favorites}
                    leaderboardRanks={leaderboardRanks}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}
            </div>
          ) : activeTab === "favorites" ? (
            /* Favorites Tab - Grid Layout */
            <section>
              <SectionHeader title={t("discover.favorites")} />
              <CategoryGrid
                categories={favoriteCategories}
                progress={progressMap}
                favorites={favorites}
                leaderboardRanks={leaderboardRanks}
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
            /* Filtered by Tab - Grid Layout */
            <section>
              <SectionHeader
                title={tabs.find((t) => t.id === activeTab)?.label || ""}
              />
              <CategoryGrid
                categories={filteredCategories}
                progress={progressMap}
                favorites={favorites}
                leaderboardRanks={leaderboardRanks}
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
