import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { Gamepad2 } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

// Georgian category options with category IDs
const categories = [
  { id: "general", name: "ზოგადი ცოდნა" },
  { id: "geography", name: "გეოგრაფია" },
  { id: "world_history", name: "ისტორია" },
  { id: "science", name: "მეცნიერება" },
  { id: "sports", name: "სპორტი" },
  { id: "art", name: "კულტურა" },
  { id: "georgian_history", name: "საქართველოს ისტორია" },
  { id: "georgian_cuisine", name: "ქართული სამზარეულო" },
];

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const { createRoom, loading } = useMultiplayer();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  const handleCreate = async () => {
    await createRoom(selectedCategory.id, selectedCategory.name);
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
      <div className="space-y-3 mt-2">
        <p className="text-sm text-muted-foreground text-center mb-4">
          კატეგორია
        </p>
        
        <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className={`relative p-3 rounded-xl text-left transition-all ${
                selectedCategory.id === category.id
                  ? "bg-primary/10 border-2 border-primary"
                  : "bg-muted/50 border-2 border-transparent hover:bg-muted"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2">
                <DynamicIcon categoryId={category.id} size={24} />
                <span className="text-sm font-medium text-foreground line-clamp-1">
                  {category.name}
                </span>
              </div>
              
              {selectedCategory.id === category.id && (
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
      </div>
      
      <div className="mt-4">
        <GameModalFooter
          primaryLabel={loading ? "იქმნება..." : "შექმნა"}
          onPrimary={handleCreate}
          primaryIcon={<Gamepad2 className="w-5 h-5" />}
          isLoading={loading}
          secondaryLabel="გაუქმება"
          onSecondary={onClose}
        />
      </div>
    </GameModal>
  );
}
