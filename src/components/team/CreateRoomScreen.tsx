import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import secretBookcase from "@/assets/secret-bookcase.png";
import spinTheBottle from "@/assets/spin-the-bottle.png";

type GameType = "trivia" | "collection" | "party" | "random" | "library";

interface CreateRoomScreenProps {
  onClose: () => void;
  onSelectTrivia: () => void;
  onSelectCollection: () => void;
  onSelectPersonalTrivia: () => void;
  onSelectRandom: () => void;
  onSelectLibrary: () => void;
}

interface GameOption {
  id: GameType;
  imageIcon: string;
  title: string;
  subtitle: string;
  glowColor: string;
  fullWidth?: boolean;
}

export function CreateRoomScreen({
  onClose,
  onSelectTrivia,
  onSelectCollection,
  onSelectPersonalTrivia,
  onSelectRandom,
  onSelectLibrary,
}: CreateRoomScreenProps) {
  const [selectedType, setSelectedType] = useState<GameType | null>(null);

  const allOptions: GameOption[] = [
    {
      id: "trivia",
      imageIcon: triviaBuzzer,
      title: "ტრივია",
      subtitle: "1 რაუნდი",
      glowColor: "rgba(139, 92, 246, 0.4)",
    },
    {
      id: "collection",
      imageIcon: iconCollections,
      title: "კოლექცია",
      subtitle: "რამდენიმე რაუნდი",
      glowColor: "rgba(34, 211, 238, 0.4)",
    },
    {
      id: "party",
      imageIcon: iconGroupOfPeople,
      title: "MyTrivia Party",
      subtitle: "შენი კითხვები",
      glowColor: "rgba(236, 72, 153, 0.4)",
    },
    {
      id: "random",
      imageIcon: spinTheBottle,
      title: "შემთხვევითი კატეგორია",
      subtitle: "სწრაფი სტარტი",
      glowColor: "rgba(245, 158, 11, 0.4)",
    },
    {
      id: "library",
      imageIcon: secretBookcase,
      title: "აირჩიე ბიბლიოთეკიდან",
      subtitle: "კატეგორიების არჩევა",
      glowColor: "rgba(139, 92, 246, 0.4)",
    },
  ];

  const handleCreate = () => {
    if (!selectedType) return;

    switch (selectedType) {
      case "trivia":
        onSelectTrivia();
        break;
      case "collection":
        onSelectCollection();
        break;
      case "party":
        onSelectPersonalTrivia();
        break;
      case "random":
        onSelectRandom();
        break;
      case "library":
        onSelectLibrary();
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 flex items-center gap-3 px-4 py-4 safe-top"
      >
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white/80" />
          <h2 className="text-xl font-bold text-white">შექმენი ოთახი</h2>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 safe-bottom">
        {/* Section Title */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          აირჩიე რას ითამაშებთ
        </motion.p>

        {/* Grid for all options */}
        <div className="grid grid-cols-2 gap-3">
          {allOptions.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedType(option.id)}
              className={`relative p-4 rounded-2xl overflow-hidden text-left transition-all ${
                selectedType === option.id ? "ring-2 ring-white ring-offset-2 ring-offset-purple-600" : ""
              }`}
              style={{
                background: selectedType === option.id 
                  ? "rgba(255, 255, 255, 0.25)" 
                  : "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `radial-gradient(circle at top right, ${option.glowColor}, transparent 60%)`,
                }}
              />
              
              {/* Selection indicator */}
              {selectedType === option.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center"
                >
                  <div className="w-3 h-3 rounded-full bg-purple-600" />
                </motion.div>
              )}
              
              {/* Icon */}
              <div className="relative mb-3">
                <img src={option.imageIcon} alt="" className="w-14 h-14 object-contain" />
              </div>
              
              {/* Text */}
              <h3 className="font-bold text-white text-base mb-0.5">{option.title}</h3>
              <p className="text-white/60 text-xs">{option.subtitle}</p>
            </motion.button>
          ))}
        </div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-center text-white/50 mt-6"
        >
          💡 მეგობრების მოწვევა შეძლებ ოთახის შექმნის შემდეგ
        </motion.p>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex-shrink-0 px-4 pb-6 safe-bottom"
      >
        <ChunkyButton
          variant="secondary"
          size="lg"
          onClick={handleCreate}
          disabled={!selectedType}
          className="w-full"
        >
          შექმენი ოთახი
        </ChunkyButton>
      </motion.div>
    </motion.div>
  );
}
