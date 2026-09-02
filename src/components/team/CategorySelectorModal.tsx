import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Search, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { excludePartyCategories, pinPartyCategoriesFirst } from "@/config/partyCategories";
import { categoryGradient } from "@/utils/categoryGradient";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GameModal } from "@/components/ui/game-modal";
import { buildBilingualSearchTerms } from "@/utils/transliteration";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { IconTabBar } from "@/components/shared/IconTabBar";
import { useFavorites } from "@/hooks/useFavorites";
import {
  CategoryTabId,
  filterCategoriesByTab,
  readRecentlyViewedIds,
} from "@/utils/categoryTabs";

// Mixed category constants (name is set dynamically via t())
const MIXED_CATEGORY_BASE = {
  id: "__mixed__",
  category_id: "__mixed__",
  icon: "🎁",
  color: "#8B5CF6",
  icon_slug: "mystery-box",
  total_levels: 0,
} as const;

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  icon_slug?: string | null;
  color: string;
  image_url?: string | null;
  total_levels: number;
  type?: string | null;
}

interface CategorySelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (category: Category) => void;
  selectedCategoryId?: string | null;
  /** Party categories are a private room's game — see CategoryPickerModal. */
  allowParty?: boolean;
}

export function CategorySelectorModal({
  open,
  onOpenChange,
  onSelect,
  selectedCategoryId,
  allowParty = false,
}: CategorySelectorModalProps) {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTabId>("all");
  const { favorites } = useFavorites();

  // The same tabs Discover has, in the same order and with the same icons —
  // this is the same wall of categories reached from a different door, and it
  // used to offer a search box and seventy tiles.
  const tabs = useMemo(
    () => [
      { id: "all", label: t("discover.all") },
      { id: "favorites", label: t("discover.favorites") },
      { id: "recently_viewed", label: t("discover.recentlyViewedTab") },
      { id: "popular", label: t("discover.popularTab") },
      { id: "classic", label: t("discover.classic") },
      { id: "fun", label: t("discover.fun") },
      { id: "educational", label: t("discover.educational") },
    ],
    [t]
  );

  // Read once per open rather than on every render: localStorage is
  // synchronous and this list is short, but it cannot change while the modal
  // is up — nothing in here navigates to a category page.
  const recentIds = useMemo(() => (open ? readRecentlyViewedIds() : []), [open]);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-for-room", language, allowParty],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, category_id, name, icon, icon_slug, color, image_url, total_levels, is_language_specific, language, type")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Filter language-specific categories
      const filtered = filterCategoriesForLanguage(data || [], language);

      // Fetch translations for non-Georgian languages
      if (language !== "ka") {
        const { data: translations } = await supabase
          .from("category_translations")
          .select("category_id, name")
          .eq("language", language);

        if (translations && translations.length > 0) {
          const transMap: Record<string, string> = {};
          translations.forEach((t: any) => { transMap[t.category_id] = t.name; });
          return (allowParty ? pinPartyCategoriesFirst : excludePartyCategories)(filtered.map((cat: any) => ({
            ...cat,
            name: transMap[cat.id] || cat.name,
          }))) as Category[];
        }
      }

      // Party categories ("Most Likely To") lead a private room's wall and
      // are absent from every other — see CategoryPickerModal.
      return (allowParty ? pinPartyCategoriesFirst : excludePartyCategories)(filtered) as Category[];
    },
    enabled: open,
  });

  const filteredCategories = useMemo(() => {
    // Tab first, then the query within it. A search that ignored the tab
    // would answer a question nobody asked — you picked Favourites for a
    // reason.
    const inTab = filterCategoriesByTab(categories, activeTab, { favorites, recentIds });
    if (!searchQuery.trim()) return inTab;

    // Build bilingual search terms for better matching
    const searchTerms = buildBilingualSearchTerms(searchQuery);

    return inTab.filter((cat) => {
      const catName = cat.name.toLowerCase();
      const catId = cat.category_id.toLowerCase();

      // Check if any search term matches category name or id
      return searchTerms.some(term =>
        catName.includes(term) || catId.includes(term)
      );
    });
  }, [categories, searchQuery, activeTab, favorites, recentIds]);

  const handleSelect = (category: Category) => {
    onSelect(category);
    onOpenChange(false);
  };

  // Check if mixed category should show in search results
  const mixedCategoryName = t("extra.csmMixedLabel");
  
  const showMixedCategory = useMemo(() => {
    // Mixed is not a category: it has no type, cannot be favourited and is
    // never "recently viewed". It belongs to the unfiltered view only.
    if (activeTab !== "all") return false;
    if (!searchQuery.trim()) return true;
    const searchTerms = buildBilingualSearchTerms(searchQuery);
    const mixedName = mixedCategoryName.toLowerCase();
    return searchTerms.some(term => mixedName.includes(term));
  }, [searchQuery, mixedCategoryName, activeTab]);

  return (
    <GameModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={t("extra.libraryOption")}
      hideFooter
      className="!pb-0"
    >
      {/* Search */}
      <div className="mt-3 mb-4 max-w-[700px] md:max-w-[800px] lg:max-w-[900px] mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("extra.csmSearchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Tabs, edge to edge: it is a horizontal scroller, so a pill mid-scroll
          should be cut by the sheet's edge rather than stopping short inside
          the padding.

          The number is arithmetic, not taste. GameModal pads its children by
          24px (px-6) and IconTabBar already bleeds itself out by 16px
          (-mx-4, re-padding its scroller by the same), so 8px is what is
          left to cancel. This was -mx-5: 16 + 20 put the strip 12px past the
          sheet on each side, and because the modal body scrolls vertically
          its overflow-x computes to auto — so that spill turned the whole
          sheet into a sideways scroller. */}
      <div className="-mx-2 mb-2">
        <IconTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as CategoryTabId)}
          compact
        />
      </div>

      {/* Categories Grid - use flex-1 to fill remaining space */}
      <div className="flex-1 overflow-y-auto -mx-5 px-5 pb-safe">
        <div className="max-w-[700px] md:max-w-[800px] lg:max-w-[900px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-2xl bg-gray-100 animate-pulse"
              />
            ))
          ) : filteredCategories.length === 0 && !showMixedCategory ? (
            <div className="col-span-2 lg:col-span-4 py-8 text-center text-gray-500 text-sm">
              {t("extra.csmCategoryNotFound")}
            </div>
          ) : (
            <>
            {/* Mixed Questions - always first */}
            {showMixedCategory && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect({
                  id: MIXED_CATEGORY_BASE.id,
                  category_id: MIXED_CATEGORY_BASE.category_id,
                  name: mixedCategoryName,
                  icon: MIXED_CATEGORY_BASE.icon,
                  color: MIXED_CATEGORY_BASE.color,
                  total_levels: MIXED_CATEGORY_BASE.total_levels,
                })}
                className={`relative aspect-[4/3] rounded-2xl overflow-hidden transition-all ${
                  selectedCategoryId === MIXED_CATEGORY_BASE.id
                    ? "ring-2 ring-primary ring-offset-2"
                    : ""
                }`}
                style={{
                  boxShadow: "0 3px 0 rgba(0,0,0,0.1)",
                }}
              >
                {/* Background - gradient for mixed */}
                <div className="absolute inset-0">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, #8B5CF6, #EC4899)`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>

                {/* Icon, drawn like every other card's — same size, same
                    place, full strength. At 30% over a magenta gradient the
                    box simply was not there: the one card in the grid with
                    nothing on it, and the one card that is not a category. */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <DynamicIcon slug="mystery-box" size={56} />
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-3 flex flex-col justify-end">
                  <span className="text-sm font-semibold text-white truncate drop-shadow-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {mixedCategoryName}
                  </span>
                  <p className="text-xs text-white/90 mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    {t("extra.csmMixedQuestions")}
                  </p>
                </div>

                {/* Selected check */}
                {selectedCategoryId === MIXED_CATEGORY_BASE.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <Check className="w-4 h-4 text-purple-600" />
                  </div>
                )}
              </motion.button>
            )}
            {filteredCategories.map((category) => {
              // Fallback gradient colors
              const fallbackColors = [
                '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
                '#f97316', '#eab308', '#22c55e', '#14b8a6',
                '#06b6d4', '#3b82f6', '#a855f7', '#d946ef'
              ];
              const fallbackColor = fallbackColors[filteredCategories.indexOf(category) % fallbackColors.length];
              const bgColor = category.color || fallbackColor;
              
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(category)}
                  className={`relative aspect-[4/3] rounded-2xl overflow-hidden transition-all ${
                    selectedCategoryId === category.id
                      ? "ring-2 ring-primary ring-offset-2"
                      : ""
                  }`}
                  style={{
                    boxShadow: "0 3px 0 rgba(0,0,0,0.1)",
                  }}
                >
                  {/* Background: the category's icon on its gradient.
                      This used to play the category's video when one existed
                      and fall back to the icon when it did not, so a grid of
                      categories was a grid of playing videos — a dozen of
                      them decoding at once behind a picker you are about to
                      leave. The video belongs on the category's own page,
                      where it is one video and the point of the header. */}
                  <div className="absolute inset-0">
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: categoryGradient(bgColor) }}
                    >
                      <CategoryArtwork
                        categoryId={category.category_id}
                        iconSlug={category.icon_slug}
                        size={56}
                      />
                    </div>
                    {/* Deep enough for a label to sit on: these gradients
                        include pale yellows. */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 p-3 flex flex-col justify-end">
                    <span className="text-sm font-semibold text-white truncate drop-shadow-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                      {category.name}
                    </span>
                    <p className="text-xs text-white/90 mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {t("extra.csmLevels", { count: category.total_levels })}
                    </p>
                  </div>
                </motion.button>
              );
            })}
            </>
          )}
          </div>
        </div>
      </div>
    </GameModal>
  );
}
