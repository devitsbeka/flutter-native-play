import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Category {
  id: string;
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
        .select("id, name, icon, color, image_url, total_levels")
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 rounded-3xl overflow-hidden max-h-[85vh]">
        <DialogTitle className="sr-only">აირჩიე კატეგორია</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="w-9" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">ბიბლიოთეკა</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -mr-2 hover:bg-muted rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძიება..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-4 pt-2 grid grid-cols-2 gap-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-2xl bg-muted/50 animate-pulse"
                />
              ))
            ) : filteredCategories.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-muted-foreground text-sm">
                კატეგორია ვერ მოიძებნა
              </div>
            ) : (
              filteredCategories.map((category) => (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(category)}
                  className={`relative aspect-[4/3] rounded-2xl overflow-hidden transition-all ${
                    selectedCategoryId === category.id
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                >
                  {/* Background - always show gradient if no image_url */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: category.image_url 
                        ? undefined 
                        : `linear-gradient(135deg, ${category.color || 'hsl(var(--primary))'}, ${category.color || 'hsl(var(--primary))'}88)`,
                    }}
                  >
                    {category.image_url && (
                      <>
                        <video
                          src={category.image_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      </>
                    )}
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 p-3 flex flex-col justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <span className="text-sm font-semibold text-white truncate drop-shadow-md">
                        {category.name}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 mt-0.5 drop-shadow-sm">
                      {category.total_levels} დონე
                    </p>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
