import { motion } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";

// 3D icons
import iconParty from "@/assets/icons/icon-party.png";
import iconCompass from "@/assets/icons/icon-compass.png";
import iconOtherGames from "@/assets/icons/icon-other-games.png";
import iconTrophy from "@/assets/icons/icon-trophy-3d.png";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function HelpItem({ 
  icon, 
  title, 
  description,
  index 
}: { 
  icon: string; 
  title: string; 
  description: string;
  index: number;
}) {
  return (
    <motion.div 
      className="flex gap-3 p-3 rounded-xl"
      style={{
        background: "#F9FAFB",
        boxShadow: "0 2px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
          boxShadow: "0 2px 0 #C4B5FD",
        }}
      >
        <img src={icon} alt={title} className="w-6 h-6 object-contain" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 mb-0.5">{title}</h3>
        <p className="text-gray-500 text-sm leading-snug">{description}</p>
      </div>
    </motion.div>
  );
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="როგორ მუშაობს?"
      iconEmoji="❓"
      showSparkles={false}
    >
      {/* Content */}
      <div className="space-y-3 mb-4">
        <HelpItem
          icon={iconOtherGames}
          title="თამაშის შექმნა"
          description="დააჭირე '+ თამაშის შექმნა' ღილაკს და აირჩიე კატეგორია. მიიღებ უნიკალურ კოდს."
          index={0}
        />
        
        <HelpItem
          icon={iconCompass}
          title="კოდის გაზიარება"
          description="გაუზიარე კოდი მეგობარს და დაელოდე სანამ შემოვა ოთახში."
          index={1}
        />
        
        <HelpItem
          icon={iconParty}
          title="მეგობრებთან თამაში"
          description="დაამატე მეგობრები და დაიწყე თამაში პირდაპირ მათ ბარათზე დაჭერით."
          index={2}
        />
        
        <HelpItem
          icon={iconTrophy}
          title="გამარჯვება"
          description="უპასუხე კითხვებს სწრაფად და სწორად. ყველაზე მეტი ქულის მქონე იმარჯვებს!"
          index={3}
        />
      </div>

      <GameModalFooter
        primaryLabel="გასაგებია"
        onPrimary={onClose}
        primaryVariant="success"
      />
    </GameModal>
  );
}
