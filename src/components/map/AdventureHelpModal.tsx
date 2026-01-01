import { motion } from "framer-motion";
import { Gift, Target, Package, Star, Zap, HelpCircle } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";

interface AdventureHelpModalProps {
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

function HelpItem({ icon, title, description, gradient, index }: HelpItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.1 }}
      className="flex items-start gap-3 p-3 rounded-xl"
      style={{ background: "rgba(255, 255, 255, 0.5)" }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-foreground text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </motion.div>
  );
}

export function AdventureHelpModal({ isOpen, onClose }: AdventureHelpModalProps) {
  const helpItems = [
    {
      icon: <Gift className="w-5 h-5 text-white" />,
      title: "საჩუქრები",
      description: "ყოველდღიური ჯილდოები - შემოდი ყოველ დღე და მიიღე ბონუსები!",
      gradient: "linear-gradient(135deg, #f472b6, #ec4899)",
    },
    {
      icon: <Target className="w-5 h-5 text-white" />,
      title: "მისიები",
      description: "შეასრულე დავალებები და მიიღე XP და მონეტები.",
      gradient: "linear-gradient(135deg, #60a5fa, #3b82f6)",
    },
    {
      icon: <Package className="w-5 h-5 text-white" />,
      title: "ხაზინა",
      description: "გახსენი ხაზინა და მიიღე შემთხვევითი ჯილდოები!",
      gradient: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    },
    {
      icon: <Star className="w-5 h-5 text-white" />,
      title: "XP და დონეები",
      description: "დააგროვე XP თამაშით და აიმაღლე დონე ახალი ჯილდოებისთვის.",
      gradient: "linear-gradient(135deg, #a855f7, #7c3aed)",
    },
    {
      icon: <Zap className="w-5 h-5 text-white" />,
      title: "ძალები",
      description: "გამოიყენე სპეციალური ძალები კითხვებზე პასუხის გასაადვილებლად.",
      gradient: "linear-gradient(135deg, #22c55e, #16a34a)",
    },
  ];

  return (
    <GameModal 
      isOpen={isOpen} 
      onClose={onClose}
      iconEmoji="❓"
      title="დახმარება"
      subtitle="როგორ მუშაობს თავგადასავალი"
      primaryLabel="გასაგებია"
      onPrimaryClick={onClose}
    >
      <div className="space-y-2">
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
    </GameModal>
  );
}
