import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { Gamepad2, Loader2 } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon_slug: string | null;
}

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const { createRoom, loading } = useMultiplayer();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, category_id, name, icon_slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
      } else if (data) {
        setCategories(data);
        if (data.length > 0 && !selectedCategory) {
          setSelectedCategory(data[0]);
        }
      }
      setLoadingCategories(false);
    };

    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!selectedCategory) return;
    await createRoom(selectedCategory.category_id, selectedCategory.name);
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="primary"
      icon={<Gamepad2 className="w-10 h-10" />}
      title="ახალი ოთახი"
      subtitle="აირჩიე კატეგორია და მოიწვიე მეგობარი"
      showSparkles
    >
      <div className="flex flex-col h-full">
        {/* Sticky header */}
        <p className="text-sm text-muted-foreground text-center py-2 sticky top-0 bg-background z-10">
          კატეგორია
        </p>
        
        {/* Scrollable categories section */}
        {loadingCategories ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 pr-1 pb-4" style={{ maxHeight: "calc(60vh - 200px)" }}>
            {categories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                className="relative p-3 rounded-xl text-left transition-all"
                style={{
                  background: selectedCategory?.id === category.id
                    ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                    : "#F9FAFB",
                  border: selectedCategory?.id === category.id
                    ? "2px solid #A78BFA"
                    : "2px solid #E5E7EB",
                  boxShadow: selectedCategory?.id === category.id
                    ? "0 3px 0 #C4B5FD"
                    : "0 2px 0 #E5E7EB",
                }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98, y: 1 }}
              >
              <div className="flex items-center gap-2">
                  <DynamicIcon 
                    slug={category.icon_slug || undefined}
                    categoryId={category.category_id} 
                    size={24} 
                  />
                  <span className="text-sm font-medium text-gray-800 line-clamp-1">
                    {category.name}
                  </span>
                </div>
                
                {selectedCategory?.id === category.id && (
                  <motion.div
                    layoutId="category-selected"
                    className="absolute inset-0 rounded-xl border-2 border-primary"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        )}
        
        {/* Sticky footer button */}
        <div className="sticky bottom-0 bg-background pt-4">
          <GameModalFooter
            primaryLabel={loading ? "იქმნება..." : "შექმნა"}
            onPrimary={selectedCategory ? handleCreate : undefined}
            isLoading={loading || !selectedCategory}
          />
        </div>
      </div>
    </GameModal>
  );
}
