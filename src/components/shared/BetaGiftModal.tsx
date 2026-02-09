import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import crownIcon from "@/assets/icons/icon-vip-crown.png";
import confettiGunIcon from "@/assets/icons/confetti-gun.png";
import aiSparkleIcon from "@/assets/icons/icon-ai-sparkle.png";
import roomsIcon from "@/assets/icons/rooms-icon.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import chestIcon from "@/assets/icons/icon-chest-box.png";
import adFreeIcon from "@/assets/icons/icon-ad-free.png";
import unboxingGiftIcon from "@/assets/icons/unboxing-gift.png";

const GIFT_STORAGE_KEY = "returnee_gift_claimed";
const LAST_VISIT_KEY = "last_visit_ts";
/** Minimum time away (ms) to qualify as a "return" — 30 minutes */
const MIN_AWAY_MS = 30 * 60 * 1000;

/** Phase 1: Appreciation message + claim button. Phase 2: Success + what's unlocked. */
type Phase = "offer" | "success";

const UNLOCKED_FEATURES = [
  { icon: aiSparkleIcon, text: "AI-ით ტრივიების შექმნა" },
  { icon: roomsIcon, text: "მეგობრებთან ოთახებში თამაში" },
  { icon: xpIcon, text: "2x XP ყველა თამაშში" },
  { icon: chestIcon, text: "დამატებითი ყოველდღიური სპინები" },
  { icon: adFreeIcon, text: "სრული თამაში რეკლამების გარეშე" },
];

export function BetaGiftModal() {
  const { user } = useAuth();
  const { isVip, activateVip, loading: vipLoading } = useVipStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("offer");
  const [claiming, setClaiming] = useState(false);
  const hasChecked = useRef(false);

  // Detect returning users who have been away 30+ min and played at least 1 game
  useEffect(() => {
    if (hasChecked.current || vipLoading || !user) return;
    hasChecked.current = true;

    // Don't show if already claimed or already VIP
    const claimed = localStorage.getItem(`${GIFT_STORAGE_KEY}_${user.id}`);
    if (claimed || isVip) {
      localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, Date.now().toString());
      return;
    }

    const lastVisit = localStorage.getItem(`${LAST_VISIT_KEY}_${user.id}`);
    const now = Date.now();
    localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, now.toString());

    // First ever visit — just record timestamp, no gift yet
    if (!lastVisit) return;

    const timeSinceLastVisit = now - parseInt(lastVisit, 10);
    if (timeSinceLastVisit < MIN_AWAY_MS) return;

    // User returned after 30+ min — check if they've played before
    const checkEngagement = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("games_played")
        .eq("user_id", user.id)
        .single();

      if (profile && (profile.games_played ?? 0) >= 1) {
        setTimeout(() => setIsOpen(true), 2000);
      }
    };
    checkEngagement();
  }, [user, vipLoading, isVip]);

  const handleClaim = async () => {
    setClaiming(true);
    const success = await activateVip("day");
    if (success) {
      localStorage.setItem(`${GIFT_STORAGE_KEY}_${user!.id}`, "true");
      // Fire confetti
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
      setTimeout(() => {
        confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, zIndex: 9999 });
        confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, zIndex: 9999 });
      }, 300);
      setPhase("success");
    }
    setClaiming(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">ბეტა საჩუქარი</DialogTitle>
        <AnimatePresence mode="wait">
          {phase === "offer" ? (
            <motion.div
              key="offer"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 40%, #F0EBFF 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 16px 40px rgba(0, 0, 0, 0.2)",
                border: "3px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              {/* Decorative top glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)",
                }}
              />

              <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
                {/* Confetti gun icon with floating animation */}
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-4"
                >
                  <img src={confettiGunIcon} alt="" className="w-[4.5rem] h-[4.5rem] object-contain" />
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-display text-xl font-bold text-gray-900 text-center mb-2"
                >
                  მადლობა, რომ ჩვენთან ხარ!
                </motion.h2>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-gray-600 text-center text-sm leading-relaxed mb-6"
                >
                  <span className="font-semibold text-amber-600">
                    საჩუქრად გიგზავნით 24 საათიან PRO-ს.
                  </span>
                  <br />
                  სასიამოვნო გართობას გისურვებთ!
                </motion.p>

                {/* Crown badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                  style={{
                    background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                    boxShadow: "0 3px 0 #C4B5FD",
                  }}
                >
                  <img src={crownIcon} alt="" className="w-6 h-6 object-contain" />
                  <span className="font-display text-sm font-bold text-purple-700">
                    1 დღიანი PRO
                  </span>
                </motion.div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="w-full"
                >
                  <ChunkyButton
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleClaim}
                    disabled={claiming}
                    showParticles
                    icon={<img src={unboxingGiftIcon} alt="" className="w-7 h-7 object-contain" />}
                  >
                    {claiming ? "იტვირთება..." : "მიიღე საჩუქარი"}
                  </ChunkyButton>
                </motion.div>

                {/* Dismiss */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={handleClose}
                  className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  მოგვიანებით
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 40%, #F0EBFF 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 16px 40px rgba(0, 0, 0, 0.2)",
                border: "3px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
                {/* Success crown */}
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="mb-4"
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #6D28D9 100%)",
                      boxShadow: "0 6px 0 #5B21B6, 0 0 30px rgba(124,58,237,0.4)",
                    }}
                  >
                    <img src={crownIcon} alt="" className="w-12 h-12 object-contain" />
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-display text-xl font-bold text-gray-900 text-center mb-2"
                >
                  PRO აქტივირებულია!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-gray-500 text-center text-sm mb-5"
                >
                  აი რას მიიღებ მომდევნო 24 საათში:
                </motion.p>

                {/* Unlocked features list */}
                <div className="w-full space-y-2 mb-6">
                  {UNLOCKED_FEATURES.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.06 }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.8)",
                        boxShadow: "0 2px 0 rgba(0,0,0,0.04)",
                      }}
                    >
                      <img src={feature.icon} alt="" className="w-6 h-6 object-contain" />
                      <span className="text-sm font-medium text-gray-700">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Close button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="w-full"
                >
                  <ChunkyButton
                    variant="success"
                    size="lg"
                    className="w-full"
                    onClick={handleClose}
                    icon={<img src={confettiGunIcon} alt="" className="w-5 h-5 object-contain" />}
                  >
                    დავიწყოთ!
                  </ChunkyButton>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
