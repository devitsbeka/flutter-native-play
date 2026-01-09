import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { Gamepad2, Loader2, Shuffle, Library, Sparkles, Users, ChevronDown, Check } from "lucide-react";
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

type SourceType = "random" | "library" | "create";

const sourceOptions = [
  { id: "random" as SourceType, icon: Shuffle, label: "შემთხვევითი", desc: "რანდომ კატეგორია" },
  { id: "library" as SourceType, icon: Library, label: "ბიბლიოთეკა", desc: "აირჩიე კატეგორია" },
  { id: "create" as SourceType, icon: Sparkles, label: "შექმენი", desc: "შენი ტრივია" },
];

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const { createRoom, loading } = useMultiplayer();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>("library");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

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
    if (sourceType === "random" && categories.length > 0) {
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      await createRoom(randomCategory.category_id, randomCategory.name);
    } else if (sourceType === "library" && selectedCategory) {
      await createRoom(selectedCategory.category_id, selectedCategory.name);
    } else if (sourceType === "create") {
      // TODO: Navigate to create trivia flow
      console.log("Create trivia flow");
    }
  };

  const canCreate = sourceType === "random" || (sourceType === "library" && selectedCategory) || sourceType === "create";

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="primary"
      icon={<Gamepad2 className="w-10 h-10" />}
      title="ახალი ოთახი"
      subtitle="შექმენი ოთახი და მოიწვიე მეგობრები"
      showSparkles
    >
      <div className="flex flex-col gap-4 pb-2">
        {/* Room Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground px-1">ოთახის სახელი</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="მაგ: საღამოს თამაში..."
            className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Invite Friends Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground px-1">მოიწვიე მეგობრები</label>
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted/70 transition-all"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {selectedFriends.length > 0 
                  ? `${selectedFriends.length} მეგობარი არჩეული` 
                  : "არჩევა..."}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Source Type Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground px-1">კითხვების წყარო</label>
          <div className="grid grid-cols-3 gap-2">
            {sourceOptions.map((option) => {
              const isSelected = sourceType === option.id;
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.id}
                  onClick={() => {
                    setSourceType(option.id);
                    if (option.id === "library") setShowCategoryPicker(true);
                    else setShowCategoryPicker(false);
                  }}
                  className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                  style={{
                    background: isSelected
                      ? "linear-gradient(180deg, hsl(var(--primary)/0.15) 0%, hsl(var(--primary)/0.1) 100%)"
                      : "hsl(var(--muted)/0.5)",
                    border: isSelected
                      ? "2px solid hsl(var(--primary))"
                      : "2px solid hsl(var(--border)/0.5)",
                    boxShadow: isSelected
                      ? "0 2px 8px hsl(var(--primary)/0.2)"
                      : "none",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-xs font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {option.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight text-center">
                    {option.desc}
                  </span>
                  {isSelected && (
                    <motion.div
                      layoutId="source-indicator"
                      className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                      initial={false}
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Category Picker (shown when Library is selected) */}
        <AnimatePresence>
          {sourceType === "library" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-1">
                <label className="text-xs font-medium text-muted-foreground px-1">აირჩიე კატეგორია</label>
                {loadingCategories ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                    {categories.map((category) => {
                      const isSelected = selectedCategory?.id === category.id;
                      return (
                        <motion.button
                          key={category.id}
                          onClick={() => setSelectedCategory(category)}
                          className="flex items-center gap-2 p-2 rounded-lg text-left transition-all"
                          style={{
                            background: isSelected
                              ? "linear-gradient(180deg, hsl(var(--primary)/0.15) 0%, hsl(var(--primary)/0.1) 100%)"
                              : "hsl(var(--muted)/0.3)",
                            border: isSelected
                              ? "1.5px solid hsl(var(--primary))"
                              : "1.5px solid transparent",
                          }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <DynamicIcon 
                            slug={category.icon_slug || undefined}
                            categoryId={category.category_id} 
                            size={18} 
                          />
                          <span className={`text-xs font-medium line-clamp-1 ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {category.name}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Button */}
        <div className="pt-2">
          <GameModalFooter
            primaryLabel={loading ? "იქმნება..." : "შექმნა"}
            onPrimary={canCreate ? handleCreate : undefined}
            isLoading={loading || !canCreate}
          />
        </div>
      </div>
    </GameModal>
  );
}
