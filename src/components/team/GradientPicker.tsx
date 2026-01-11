import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { ROOM_GRADIENTS } from "@/config/roomGradients";
import { cn } from "@/lib/utils";

interface GradientPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentGradient: string;
  onSelect: (gradientId: string) => void;
}

export function GradientPicker({ isOpen, onClose, currentGradient, onSelect }: GradientPickerProps) {
  const handleSelect = (gradientId: string) => {
    onSelect(gradientId);
    onClose();
  };

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="ფონის არჩევა"
      subtitle="აირჩიე შენი ოთახის ფერები"
    >
      <div className="grid grid-cols-3 gap-3 p-4 pb-6">
        {ROOM_GRADIENTS.map((gradient) => (
          <motion.button
            key={gradient.id}
            onClick={() => handleSelect(gradient.id)}
            className={cn(
              "aspect-square rounded-xl overflow-hidden relative transition-all",
              currentGradient === gradient.id 
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-95" 
                : "hover:scale-105"
            )}
            style={{ background: gradient.gradient }}
            whileHover={{ scale: currentGradient === gradient.id ? 0.95 : 1.05 }}
            whileTap={{ scale: 0.9 }}
          >
            {currentGradient === gradient.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/20"
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </div>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </GameModal>
  );
}
