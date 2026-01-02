import { motion } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { Trophy, Zap, Coins, Target, Timer } from "lucide-react";

interface VSMatchHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  index: number;
}

const HelpItem = ({ icon, title, description, gradient, index }: HelpItemProps) => (
  <motion.div
    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50"
    style={{ boxShadow: "0 2px 0 #E5E7EB" }}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <div 
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: gradient }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
      <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

export function VSMatchHelpModal({ isOpen, onClose }: VSMatchHelpModalProps) {
  const helpItems = [
    {
      icon: <Target className="w-5 h-5 text-white" />,
      title: "რა არის სწრაფი მატჩი?",
      description: "შეჯიბრი რანდომ მოწინააღმდეგესთან და უპასუხე კითხვებს მასზე სწრაფად!",
      gradient: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    },
    {
      icon: <Timer className="w-5 h-5 text-white" />,
      title: "როგორ მოვიგოთ?",
      description: "უპასუხე კითხვებს სწორად და რაც შეიძლება სწრაფად. რაც უფრო სწრაფად პასუხობ, მით მეტ ქულას იღებ!",
      gradient: "linear-gradient(135deg, #F59E0B, #EF4444)",
    },
    {
      icon: <Trophy className="w-5 h-5 text-white" />,
      title: "XP ქულები",
      description: "მოიგე მატჩი და მიიღე XP ქულები შენი დონის ასამაღლებლად. მეტი XP = მაღალი დონე!",
      gradient: "linear-gradient(135deg, #10B981, #059669)",
    },
    {
      icon: <Coins className="w-5 h-5 text-white" />,
      title: "მონეტები",
      description: "ყოველ მატჩში იღებ მონეტებს. გამოიყენე ისინი მაღაზიაში power-up-ების შესაძენად!",
      gradient: "linear-gradient(135deg, #F2C860, #F59E0B)",
    },
    {
      icon: <Zap className="w-5 h-5 text-white" />,
      title: "Power-Ups",
      description: "გამოიყენე სპეციალური ძალები თამაშში უპირატესობის მოსაპოვებლად!",
      gradient: "linear-gradient(135deg, #EC4899, #8B5CF6)",
    },
  ];

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="სწრაფი მატჩი"
      iconEmoji="⚔️"
      showSparkles={false}
    >
      <div className="space-y-2 mb-4">
        {helpItems.map((item, index) => (
          <HelpItem
            key={index}
            icon={item.icon}
            title={item.title}
            description={item.description}
            gradient={item.gradient}
            index={index}
          />
        ))}
      </div>
      
      <GameModalFooter
        primaryLabel="გასაგებია!"
        onPrimary={onClose}
      />
    </GameModal>
  );
}
