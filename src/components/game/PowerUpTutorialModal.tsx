import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";

import fiftyFiftyImg from "@/assets/powers/5050.png";
import freezeImg from "@/assets/powers/freeze.png";
import replaceImg from "@/assets/powers/replace.png";
import timeDrainImg from "@/assets/powers/time-drain.png";

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
    icon: fiftyFiftyImg,
    title: "50/50",
    description: "წაშლის 2 არასწორ პასუხს და დარჩება მხოლოდ 2 ვარიანტი",
    howToUse: "გამოიყენე როცა დარწმუნებული არ ხარ პასუხში. დაგეხმარება შანსების გაორმაგებაში! ⚡",
    color: { from: "#E85C3A", to: "#FFB347" },
  },
  {
    icon: freezeImg,
    title: "გაყინვა",
    description: "აჩერებს ტაიმერს 5 წამით და გაძლევს დამატებით დროს ფიქრისთვის",
    howToUse: "გამოიყენე როცა კითხვა რთულია და მეტი დრო გჭირდება პასუხის მოსაფიქრებლად! ❄️",
    color: { from: "#1C8CA8", to: "#95EBE9" },
  },
  {
    icon: replaceImg,
    title: "შეცვლა",
    description: "ცვლის მიმდინარე კითხვას სრულიად ახალი კითხვით",
    howToUse: "გამოიყენე როცა კითხვა საერთოდ არ იცი. მიიღებ ახალ შანსს! 🔄",
    color: { from: "#1CA88C", to: "#95EBD4" },
  },
  {
    icon: timeDrainImg,
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
  
  // Reset to first slide when modal opens
  if (!isOpen && currentSlide !== 0) {
    setCurrentSlide(0);
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div 
                className="relative px-6 pt-6 pb-10"
                style={{
                  background: `linear-gradient(135deg, ${slide.color.from}, ${slide.color.to})`,
                }}
              >
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white mb-1">როგორ გამოვიყენო ძალები?</h2>
                  <p className="text-white/80 text-sm">გაეცანი თითოეულ ძალას</p>
                </div>
                
                {/* Slide indicator dots */}
                <div className="flex justify-center gap-2 mt-4">
                  {TUTORIAL_SLIDES.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSlide 
                          ? "bg-white w-6" 
                          : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Content */}
              <div className="px-6 py-6 -mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    {/* Power-up icon */}
                    <motion.div 
                      className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${slide.color.from}20, ${slide.color.to}20)`,
                        border: `2px solid ${slide.color.from}40`,
                      }}
                      animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 2, -2, 0],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <img 
                        src={slide.icon} 
                        alt={slide.title} 
                        className="w-14 h-14 object-contain"
                      />
                    </motion.div>
                    
                    {/* Title */}
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
                      className="p-4 rounded-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${slide.color.from}10, ${slide.color.to}10)`,
                        border: `1px solid ${slide.color.from}20`,
                      }}
                    >
                      <p 
                        className="text-sm font-medium"
                        style={{ color: slide.color.from }}
                      >
                        💡 {slide.howToUse}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              
              {/* Navigation buttons */}
              <div className="px-6 pb-6 flex gap-3">
                {!isFirstSlide && (
                  <ChunkyButton
                    onClick={handlePrev}
                    variant="secondary"
                    className="flex-1"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    უკან
                  </ChunkyButton>
                )}
                
                <ChunkyButton
                  onClick={handleNext}
                  variant="success"
                  className="flex-1"
                >
                  {isLastSlide ? (
                    "გასაგებია!"
                  ) : (
                    <>
                      შემდეგი
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </ChunkyButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
