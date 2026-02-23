import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Search, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { GameModal } from "@/components/ui/game-modal";
import { buildBilingualSearchTerms } from "@/utils/transliteration";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

// Mixed category constants
const MIXED_CATEGORY = {
  id: "__mixed__",
  category_id: "__mixed__",
  name: "სხვადასხვა",
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
  color: string;
  image_url?: string | null;
  total_levels: number;
}

interface CategorySelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (category: Category) => void;
  selectedCategoryId?: string | null;
}

export function CategorySelectorModal({
  open,
  onOpenChange,
  onSelect,
  selectedCategoryId,
}: CategorySelectorModalProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-for-room"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, category_id, name, icon, color, image_url, total_levels")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: open,
  });

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    
    // Build bilingual search terms for better matching
    const searchTerms = buildBilingualSearchTerms(searchQuery);
    
    return categories.filter((cat) => {
      const catName = cat.name.toLowerCase();
      const catId = cat.category_id.toLowerCase();
      
      // Check if any search term matches category name or id
      return searchTerms.some(term => 
        catName.includes(term) || catId.includes(term)
      );
    });
  }, [categories, searchQuery]);

  const handleSelect = (category: Category) => {
    onSelect(category);
    onOpenChange(false);
  };

  // Check if mixed category should show in search results
  const showMixedCategory = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const searchTerms = buildBilingualSearchTerms(searchQuery);
    const mixedName = MIXED_CATEGORY.name.toLowerCase();
    return searchTerms.some(term => mixedName.includes(term));
  }, [searchQuery]);

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

      {/* Categories Grid - use flex-1 to fill remaining space */}
      <div className="flex-1 overflow-y-auto -mx-5 px-5 pb-safe">
        <div className="max-w-[700px] md:max-w-[800px] lg:max-w-[900px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pb-8">
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
                  id: MIXED_CATEGORY.id,
                  category_id: MIXED_CATEGORY.category_id,
                  name: MIXED_CATEGORY.name,
                  icon: MIXED_CATEGORY.icon,
                  color: MIXED_CATEGORY.color,
                  total_levels: MIXED_CATEGORY.total_levels,
                })}
                className={`relative aspect-[4/3] rounded-2xl overflow-hidden transition-all ${
                  selectedCategoryId === MIXED_CATEGORY.id
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

                {/* Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <DynamicIcon slug="mystery-box" size={60} />
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-3 flex flex-col justify-end">
                  <span className="text-sm font-semibold text-white truncate drop-shadow-lg" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {MIXED_CATEGORY.name}
                  </span>
                  <p className="text-xs text-white/90 mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    {t("extra.csmMixedQuestions")}
                  </p>
                </div>

                {/* Selected check */}
                {selectedCategoryId === MIXED_CATEGORY.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <Check className="w-4 h-4 text-purple-600" />
                  </div>
                )}
              </motion.button>
            )}
            {filteredCategories.map((category) => {
              const videoUrl = CATEGORY_VIDEOS[category.category_id];
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
                  {/* Background - Video or gradient */}
                  <div className="absolute inset-0">
                    {videoUrl ? (
                      <>
                        <PingPongVideo
                          src={videoUrl}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      </>
                    ) : (
                      <>
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`,
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </>
                    )}
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
