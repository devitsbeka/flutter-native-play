import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Gamepad2 } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import storyDice from "@/assets/story-dice.png";
import secretBookcase from "@/assets/secret-bookcase.png";
import triviaBuzzer from "@/assets/trivia-buzzer-3.png";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  { 
    icon: storyDice, 
    title: "შემთხვევითი", 
    desc: "რანდომულად შეირჩევა კატეგორია",
    color: "from-purple-500 to-pink-500"
  },
  { 
    icon: secretBookcase, 
    title: "ბიბლიოთეკა", 
    desc: "აირჩიე კატეგორია კოლექციიდან",
    color: "from-orange-500 to-amber-500"
  },
  { 
    icon: triviaBuzzer, 
    title: "შექმენი შენი", 
    desc: "გააკეთე საკუთარი ტრივია",
    color: "from-emerald-500 to-teal-500"
  },
];

export const HowItWorksModal = ({ isOpen, onClose }: HowItWorksModalProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">როგორ მუშაობს?</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                    <img src={step.icon} alt="" className="w-7 h-7 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-2 py-4 mt-6 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20"
            >
              <Gamepad2 className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">გართობა გარანტირებულია!</span>
            </motion.div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background">
            <ChunkyButton onClick={onClose} className="w-full">
              გასაგებია!
            </ChunkyButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
