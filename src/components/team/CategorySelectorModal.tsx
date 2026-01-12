import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { GameModal } from "@/components/ui/game-modal";

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
    const query = searchQuery.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  const handleSelect = (category: Category) => {
    onSelect(category);
    onOpenChange(false);
  };

  return (
    <GameModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="ბიბლიოთეკა"
      hideFooter
    >
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ძიება..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <ScrollArea className="max-h-[50vh]">
        <div className="grid grid-cols-2 gap-3 pb-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-2xl bg-gray-100 animate-pulse"
              />
            ))
          ) : filteredCategories.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-gray-500 text-sm">
              კატეგორია ვერ მოიძებნა
            </div>
          ) : (
            filteredCategories.map((category) => {
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
                      {category.total_levels} დონე
                    </p>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </GameModal>
  );
}
