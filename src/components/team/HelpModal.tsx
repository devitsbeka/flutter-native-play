import { motion } from "framer-motion";
import { Users, Gamepad2, Share2, Trophy } from "lucide-react";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";

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
  icon: React.ReactNode; 
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
        <div className="text-purple-600">{icon}</div>
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
          icon={<Gamepad2 className="w-5 h-5" />}
          title="თამაშის შექმნა"
          description="დააჭირე '+ თამაშის შექმნა' ღილაკს და აირჩიე კატეგორია. მიიღებ უნიკალურ კოდს."
          index={0}
        />
        
        <HelpItem
          icon={<Share2 className="w-5 h-5" />}
          title="კოდის გაზიარება"
          description="გაუზიარე კოდი მეგობარს და დაელოდე სანამ შემოვა ოთახში."
          index={1}
        />
        
        <HelpItem
          icon={<Users className="w-5 h-5" />}
          title="მეგობრებთან თამაში"
          description="დაამატე მეგობრები და დაიწყე თამაში პირდაპირ მათ ბარათზე დაჭერით."
          index={2}
        />
        
        <HelpItem
          icon={<Trophy className="w-5 h-5" />}
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
