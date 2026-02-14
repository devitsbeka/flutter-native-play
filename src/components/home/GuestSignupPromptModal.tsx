import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Lock } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface GuestSignupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const benefits = [
  {
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    text: "შექმენი ანიმირებული ავატარი",
    bg: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
    shadow: "0 3px 0 #C4B5FD",
  },
  {
    icon: <Trophy className="w-5 h-5 text-emerald-600" />,
    text: "შეინახე პროგრესი",
    bg: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)",
    shadow: "0 3px 0 #6EE7B7",
  },
  {
    icon: <Lock className="w-5 h-5 text-blue-600" />,
    text: "გახსენი ყველა ფუნქცია",
    bg: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)",
    shadow: "0 3px 0 #93C5FD",
  },
];

export function GuestSignupPromptModal({ isOpen, onClose }: GuestSignupPromptModalProps) {
  const { startOnboarding } = useOnboarding();

  const handleStart = () => {
    onClose();
    startOnboarding();
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={false}
      showSparkles
      showStars
      iconSrc={triviaBuzzer}
      title="შექმენი ანგარიში და გააგრძელე თამაში"
    >
      <div className="cursor-pointer" onClick={handleStart}>
        <div className="space-y-3 pb-2">
          {benefits.map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: benefit.bg,
                boxShadow: benefit.shadow,
              }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center"
                style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}
              >
                {benefit.icon}
              </div>
              <span className="font-bold text-gray-800 text-sm">{benefit.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pt-3"
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(236,72,153,0.2)",
                "0 0 30px rgba(236,72,153,0.5), 0 0 60px rgba(168,85,247,0.3)",
                "0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(236,72,153,0.2)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl"
          >
            <ChunkyButton
              variant="primary"
              size="lg"
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
              onClick={handleStart}
              icon={<Sparkles className="w-5 h-5" />}
            >
              დავიწყოთ!
            </ChunkyButton>
          </motion.div>
        </motion.div>
      </div>
    </GameModal>
  );
}
