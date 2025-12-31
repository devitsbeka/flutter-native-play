import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryProgress } from "@/hooks/useCategoryProgress";
import { useFavorites } from "@/hooks/useFavorites";
import { IconTab } from "@/components/discover/IconTab";
import { SectionHeader } from "@/components/discover/SectionHeader";
import { CategoryCarousel } from "@/components/discover/CategoryCarousel";
import { PageTransition } from "@/components/shared/PageTransition";

const tabs = [
  { id: "all", label: "ყველა", icon: "🏠" },
  { id: "classic", label: "კლასიკური", icon: "🏛️" },
  { id: "fun", label: "გართობა", icon: "🎈" },
  { id: "educational", label: "სასწავლო", icon: "📚" },
];

export default function Discover() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { categories, loading } = useCategories();
  const { progress } = useCategoryProgress();
  const { favorites, toggleFavorite } = useFavorites();

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

  // Get favorite categories
  const favoriteCategories = useMemo(
    () => categories.filter((cat) => favorites.has(cat.id)),
    [categories, favorites]
  );

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
    if (index < 2) return "ტრენდული";
    return undefined;
  };

  // Show search results if searching
  const isSearching = searchQuery.trim().length > 0;

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        {/* Light mask overlay for Spline background */}
        <div className="fixed inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/60 pointer-events-none z-0" />

        {/* Content above mask */}
        <div className="relative z-10">
          {/* Search Bar */}
          <div className="sticky top-0 z-20 backdrop-blur-md px-5 pt-4 pb-2">
            <div
              className={`flex items-center gap-3 bg-white/50 border border-white/40 rounded-full px-4 py-3 transition-all shadow-sm ${
                isSearchFocused ? "ring-2 ring-foreground/20" : ""
              }`}
            >
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="მოძებნე კატეგორია..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
              />
            </div>
          </div>

          {/* Icon Tabs */}
          <div className="sticky top-[72px] z-10 backdrop-blur-md border-b border-white/20">
            <div className="flex overflow-x-auto scrollbar-hide pl-5" style={{ scrollbarWidth: "none" }}>
              {tabs.map((tab) => (
                <IconTab
                  key={tab.id}
                  icon={tab.icon}
                  label={tab.label}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
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
                  title={`ძებნის შედეგები (${filteredCategories.length})`}
                />
                <CategoryCarousel
                  categories={filteredCategories}
                  progress={progressMap}
                  favorites={favorites}
                  onCategoryClick={handleCategoryClick}
                  onFavoriteToggle={toggleFavorite}
                />
                {filteredCategories.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <p className="text-muted-foreground">
                      არაფერი მოიძებნა "{searchQuery}"
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
                    title="ჩემი ფავორიტები"
                    subtitle="შენს მიერ არჩეული"
                  />
                  <CategoryCarousel
                    categories={favoriteCategories}
                    progress={progressMap}
                    favorites={favorites}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}

              {/* Recently Viewed */}
              {recentlyViewed.length > 0 && (
                <section>
                  <SectionHeader
                    title="ბოლოს ნანახი"
                  />
                  <CategoryCarousel
                    categories={recentlyViewed as any[]}
                    progress={progressMap}
                    favorites={favorites}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}

              {/* Popular */}
              <section>
                <SectionHeader
                  title="პოპულარული"
                  subtitle="ყველაზე ხშირად თამაშობენ"
                />
                <CategoryCarousel
                  categories={popularCategories}
                  progress={progressMap}
                  favorites={favorites}
                  onCategoryClick={handleCategoryClick}
                  onFavoriteToggle={toggleFavorite}
                  getBadge={getBadge}
                />
              </section>

              {/* Classic */}
              {classicCategories.length > 0 && (
                <section>
                  <SectionHeader
                    title="კლასიკური ტრივია"
                    subtitle="ისტორია, გეოგრაფია, მეცნიერება"
                    onSeeAll={() => setActiveTab("classic")}
                  />
                  <CategoryCarousel
                    categories={classicCategories}
                    progress={progressMap}
                    favorites={favorites}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}

              {/* Fun */}
              {funCategories.length > 0 && (
                <section>
                  <SectionHeader
                    title="გართობა"
                    subtitle="ფილმები, მუსიკა, სპორტი"
                    onSeeAll={() => setActiveTab("fun")}
                  />
                  <CategoryCarousel
                    categories={funCategories}
                    progress={progressMap}
                    favorites={favorites}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}

              {/* Educational */}
              {educationalCategories.length > 0 && (
                <section>
                  <SectionHeader
                    title="სასწავლო"
                    subtitle="ენები, ლიტერატურა, ხელოვნება"
                    onSeeAll={() => setActiveTab("educational")}
                  />
                  <CategoryCarousel
                    categories={educationalCategories}
                    progress={progressMap}
                    favorites={favorites}
                    onCategoryClick={handleCategoryClick}
                    onFavoriteToggle={toggleFavorite}
                  />
                </section>
              )}
            </div>
          ) : (
            /* Filtered by Tab */
            <section>
              <SectionHeader
                title={tabs.find((t) => t.id === activeTab)?.label || ""}
              />
              <CategoryCarousel
                categories={filteredCategories}
                progress={progressMap}
                favorites={favorites}
                onCategoryClick={handleCategoryClick}
                onFavoriteToggle={toggleFavorite}
              />
              {filteredCategories.length === 0 && (
                <div className="text-center py-12 px-4">
                  <p className="text-muted-foreground">
                    ამ კატეგორიაში ჯერ არაფერია
                  </p>
                </div>
              )}
            </section>
          )}
          </div>
        </div>

        <UniversalBottomNav />
      </div>
    </PageTransition>
  );
}
