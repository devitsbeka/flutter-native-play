import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Gamepad2, Share2, Trophy } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
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
            <div className="bg-gradient-to-b from-[#7E7BDC] to-[#6560C9] rounded-3xl p-6 shadow-2xl border border-white/20">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">როგორ მუშაობს?</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <HelpItem
                  icon={<Gamepad2 className="w-5 h-5" />}
                  title="თამაშის შექმნა"
                  description="დააჭირე '+ თამაშის შექმნა' ღილაკს და აირჩიე კატეგორია. მიიღებ უნიკალურ კოდს."
                />
                
                <HelpItem
                  icon={<Share2 className="w-5 h-5" />}
                  title="კოდის გაზიარება"
                  description="გაუზიარე კოდი მეგობარს და დაელოდე სანამ შემოვა ოთახში."
                />
                
                <HelpItem
                  icon={<Users className="w-5 h-5" />}
                  title="მეგობრებთან თამაში"
                  description="დაამატე მეგობრები და დაიწყე თამაში პირდაპირ მათ ბარათზე დაჭერით."
                />
                
                <HelpItem
                  icon={<Trophy className="w-5 h-5" />}
                  title="გამარჯვება"
                  description="უპასუხე კითხვებს სწრაფად და სწორად. ყველაზე მეტი ქულის მქონე იმარჯვებს!"
                />
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full mt-6 py-3 rounded-2xl bg-white/20 text-white font-medium"
              >
                გასაგებია
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function HelpItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-white mb-0.5">{title}</h3>
        <p className="text-white/70 text-sm">{description}</p>
      </div>
    </div>
  );
}
