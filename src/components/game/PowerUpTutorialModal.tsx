import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { GameModal } from "@/components/ui/game-modal";

// 3D hexagonal badge icons
import fiftyFiftyIcon from "@/assets/powers/5050.png";
import freezeIcon from "@/assets/powers/freeze.png";
import replaceIcon from "@/assets/powers/replace.png";
import timeDrainIcon from "@/assets/powers/time-drain.png";

interface PowerUpTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialSlide {
  icon: string;
  title: string;
  description: string;
  howToUse: string;
  color: { from: string; to: string };
}

const TUTORIAL_SLIDES: TutorialSlide[] = [
  {
    icon: fiftyFiftyIcon,
    title: "50/50",
    description: "წაშლის 2 არასწორ პასუხს და დარჩება მხოლოდ 2 ვარიანტი",
    howToUse: "გამოიყენე როცა დარწმუნებული არ ხარ პასუხში. დაგეხმარება შანსების გაორმაგებაში! ⚡",
    color: { from: "#E85C3A", to: "#FFB347" },
  },
  {
    icon: freezeIcon,
    title: "გაყინვა",
    description: "დრო გაიყინება 10 წამით. მშვიდად დაფიქრდი კითხვაზე დროის დაკარგვის გარეშე!",
    howToUse: "გამოიყენე როცა კითხვა რთულია და მეტი დრო გჭირდება! ❄️",
    color: { from: "#1C8CA8", to: "#95EBE9" },
  },
  {
    icon: replaceIcon,
    title: "შეცვლა",
    description: "ცვლის მიმდინარე კითხვას სრულიად ახალი კითხვით",
    howToUse: "გამოიყენე როცა კითხვა საერთოდ არ იცი. მიიღებ ახალ შანსს! 🔄",
    color: { from: "#1CA88C", to: "#95EBD4" },
  },
  {
    icon: timeDrainIcon,
    title: "დრო+",
    description: "ამატებს 10 წამს ტაიმერზე მყისიერად",
    howToUse: "გამოიყენე როცა დრო იწურება და კიდევ ცოტა გჭირდება პასუხისთვის! ⏰",
    color: { from: "#7B4BBF", to: "#C9A8E9" },
  },
];

export function PowerUpTutorialModal({ isOpen, onClose }: PowerUpTutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slide = TUTORIAL_SLIDES[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === TUTORIAL_SLIDES.length - 1;
  
  const handleNext = () => {
    if (isLastSlide) {
      onClose();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };
  
  const handlePrev = () => {
    if (!isFirstSlide) {
      setCurrentSlide((prev) => prev - 1);
    }
  };
  
  // Reset to first slide when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  // Custom header with help icon
  const headerIcon = (
    <motion.div
      className="relative w-16 h-16 rounded-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
        boxShadow: "0 4px 0 #F59E0B, inset 0 2px 4px rgba(255, 255, 255, 0.6)",
      }}
      animate={{ rotate: [-5, 5, -5], y: [0, -2, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span className="text-3xl">❓</span>
    </motion.div>
  );

  // Slide indicator dots
  const slideIndicators = (
    <div className="flex justify-center gap-2 mb-4">
      {TUTORIAL_SLIDES.map((_, index) => (
        <motion.button
          key={index}
          onClick={() => setCurrentSlide(index)}
          className={`h-2 rounded-full transition-all ${
            index === currentSlide 
              ? "bg-primary w-6" 
              : "bg-muted w-2"
          }`}
        />
      ))}
    </div>
  );

  // Footer with navigation
  const footer = (
    <div className="flex gap-3">
      {!isFirstSlide && (
        <ChunkyButton
          onClick={handlePrev}
          variant="secondary"
          size="compact"
          className="flex-1 whitespace-nowrap"
        >
          <span className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            უკან
          </span>
        </ChunkyButton>
      )}
      
      <ChunkyButton
        onClick={handleNext}
        variant="success"
        size="compact"
        className="flex-1 whitespace-nowrap"
      >
        {isLastSlide ? (
          "გასაგებია!"
        ) : (
          <span className="flex items-center gap-1">
            შემდეგი
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </ChunkyButton>
    </div>
  );
  
  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      icon={headerIcon}
      title="როგორ გამოვიყენო ძალები?"
      subtitle="გაეცანი თითოეულ ძალას"
      footer={footer}
      showSparkles
    >
      {slideIndicators}
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="text-center"
        >
          {/* Power-up icon - just the badge */}
          <motion.img 
            src={slide.icon} 
            alt={slide.title} 
            className="w-20 h-20 mx-auto mb-4 object-contain"
            style={{
              filter: `drop-shadow(0 4px 8px ${slide.color.from}40)`,
            }}
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Title with gradient */}
          <h3 
            className="text-2xl font-bold mb-2"
            style={{
              background: `linear-gradient(135deg, ${slide.color.from}, ${slide.color.to})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {slide.title}
          </h3>
          
          {/* Description */}
          <p className="text-muted-foreground mb-4">
            {slide.description}
          </p>
          
          {/* How to use tip */}
          <div 
            className="p-4 rounded-xl"
            style={{
              background: "#FEF7ED",
              border: "1px solid #FDE9D9",
              boxShadow: "0 2px 0 #FDDFC9",
            }}
          >
            <p className="text-sm font-medium text-gray-700">
              💡 {slide.howToUse}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </GameModal>
  );
}
