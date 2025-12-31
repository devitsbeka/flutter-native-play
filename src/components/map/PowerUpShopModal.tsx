import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Star, Sparkles } from "lucide-react";
import { PowerUpBadge } from "@/components/game/PowerUpBadge";
import { useUserPowerUps, PowerUpType } from "@/hooks/useUserPowerUps";

interface PowerUpShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PowerUpInfo {
  type: PowerUpType;
  name: string;
  description: string;
}

const POWER_UP_INFO: PowerUpInfo[] = [
  {
    type: "5050",
    name: "50/50",
    description: "წაშლის 2 არასწორ პასუხს",
  },
  {
    type: "freeze",
    name: "გაყინვა",
    description: "აყინებს მოწინააღმდეგეს 5 წამით",
  },
  {
    type: "replace",
    name: "ჩანაცვლება",
    description: "ცვლის ერთ არასწორ პასუხს",
  },
  {
    type: "time-drain",
    name: "დრო+",
    description: "ამატებს 3 წამს",
  },
];

export function PowerUpShopModal({ isOpen, onClose }: PowerUpShopModalProps) {
  const { powerUps, isLoading } = useUserPowerUps();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-gradient-to-b from-[#1a1a2e] to-[#16213e] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-3">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-display text-white mb-1">
                    ⚡ ძალები
                  </h2>
                  <p className="text-white/60 text-sm">
                    შენი სუპერ ძალები
                  </p>
                </div>
              </div>

              {/* Power-ups Grid */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {POWER_UP_INFO.map((info, index) => (
                    <motion.div
                      key={info.type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 rounded-2xl p-4 border border-white/10"
                    >
                      <div className="flex flex-col items-center text-center">
                        <PowerUpBadge
                          type={info.type === "5050" ? "fifty-fifty" : info.type}
                          size="md"
                          count={isLoading ? 0 : powerUps[info.type]}
                          disabled={powerUps[info.type] === 0}
                        />
                        <h3 className="text-white font-medium mt-2 text-sm">
                          {info.name}
                        </h3>
                        <p className="text-white/50 text-xs mt-1 leading-tight">
                          {info.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* How to get more */}
              <div className="px-6 pb-6">
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/20">
                  <h3 className="text-amber-400 font-medium text-sm mb-2 flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    როგორ მივიღო მეტი?
                  </h3>
                  <ul className="space-y-1.5 text-white/60 text-xs">
                    <li className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-amber-400" />
                      ყოველდღიური ჯილდოები
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-amber-400" />
                      დონის ამაღლება
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-amber-400" />
                      მატჩების მოგება
                    </li>
                  </ul>
                </div>
              </div>

              {/* Close Button */}
              <div className="px-6 pb-6">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
                >
                  დახურვა
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
