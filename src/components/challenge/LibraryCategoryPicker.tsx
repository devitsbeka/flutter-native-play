import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  image_url: string | null;
}

interface LibraryCategoryPickerProps {
  onSelect: (category: { id: string; name: string }) => void;
}

export function LibraryCategoryPicker({ onSelect }: LibraryCategoryPickerProps) {
  const [search, setSearch] = useState("");
  const { t } = useLanguage();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-for-challenge"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon, color, image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const searchLower = search.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchLower)
    );
  }, [categories, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("extra.searchCategoryPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
        {filteredCategories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => onSelect({ id: category.id, name: category.name })}
            className="relative aspect-square rounded-xl overflow-hidden"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {category.image_url ? (
              <img
                src={category.image_url}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${category.color}99, ${category.color}dd)`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <span className="text-2xl block mb-0.5">{category.icon}</span>
              <p className="text-xs font-medium text-white truncate">
                {category.name}
              </p>
            </div>
          </motion.button>
        ))}

        {filteredCategories.length === 0 && (
          <div className="col-span-3 py-8 text-center text-muted-foreground">
            <p>{t("extra.categoryNotFoundMsg")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
