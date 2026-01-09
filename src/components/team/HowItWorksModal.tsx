import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Shuffle, Library, Sparkles, Gamepad2 } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  { 
    icon: Users, 
    title: "შექმენი ოთახი", 
    desc: "მოიწვიე მეგობრები და ითამაშეთ ერთად",
    color: "from-blue-500 to-cyan-500"
  },
  { 
    icon: Shuffle, 
    title: "შემთხვევითი", 
    desc: "რანდომულად შეირჩევა კატეგორია",
    color: "from-purple-500 to-pink-500"
  },
  { 
    icon: Library, 
    title: "ბიბლიოთეკა", 
    desc: "აირჩიე კატეგორია კოლექციიდან",
    color: "from-orange-500 to-amber-500"
  },
  { 
    icon: Sparkles, 
    title: "შექმენი შენი", 
    desc: "გააკეთე საკუთარი ტრივია",
    color: "from-emerald-500 to-teal-500"
  },
];

export const HowItWorksModal = ({ isOpen, onClose }: HowItWorksModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">როგორ მუშაობს?</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Steps */}
            <div className="p-4 space-y-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 pt-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20"
              >
                <Gamepad2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">გართობა გარანტირებულია!</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
