import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { ChevronRight, Clock } from "lucide-react";
import crownIcon from "@/assets/icons/icon-vip-crown.png";
import confettiGunIcon from "@/assets/icons/confetti-gun.png";
import triviaIcon from "@/assets/icons/trivia-icon.png";
import roomsIcon from "@/assets/icons/rooms-icon.png";
import retroTvIcon from "@/assets/retro-tv-colored.png";
import unboxingGiftIcon from "@/assets/icons/unboxing-gift-2.png";

const LAST_VISIT_KEY = "last_visit_ts";
const GIFT_CLAIMED_KEY = "returnee_gift_claimed";
/** Minimum time away (ms) to qualify as a "return" — 30 minutes */
const MIN_AWAY_MS = 30 * 60 * 1000;

type Phase = "offer" | "success";

interface BetaGiftModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onClaimed: () => void;
}

const FEATURE_CLUES = [
  { icon: triviaIcon, text: "შექმენი ტრივია", path: "/team" },
  { icon: roomsIcon, text: "ითამაშე მეგობრებთან", path: "/team" },
  { icon: retroTvIcon, text: "ითამაშე TV-ზე", path: "/team?tvHint=true" },
];

/**
 * Hook that checks if the user qualifies for a one-time return gift.
 * Returns true once if user returned after 30+ min, is not VIP, played ≥1 game,
 * and has never claimed the gift before.
 */
export function useReturnGiftEligibility(): boolean {
  const { user } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();
  const [eligible, setEligible] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current || vipLoading || !user) return;
    hasChecked.current = true;

    // Don't offer to active VIP users
    if (isVip) {
      localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, Date.now().toString());
      return;
    }

    // One-time only: skip if already claimed
    if (localStorage.getItem(`${GIFT_CLAIMED_KEY}_${user.id}`)) {
      localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, Date.now().toString());
      return;
    }

    const lastVisit = localStorage.getItem(`${LAST_VISIT_KEY}_${user.id}`);
    const now = Date.now();
    localStorage.setItem(`${LAST_VISIT_KEY}_${user.id}`, now.toString());

    // First ever visit — just record timestamp
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

      if (profile && (profile.games_played ?? 0) >= 5) {
        setEligible(true);
      }
    };
    checkEngagement();
  }, [user, vipLoading, isVip]);

  return eligible;
}

const POWER_UP_NAMES: Record<string, string> = {
  "5050": "50/50",
  "freeze": "გაყინვა",
  "replace": "შეცვლა",
  "time-drain": "დროის წართმევა",
};

export function BetaGiftModal({ isOpen, onDismiss, onClaimed }: BetaGiftModalProps) {
  const { user } = useAuth();
  const { activateVip } = useVipStatus();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("offer");
  const [claiming, setClaiming] = useState(false);
  const [grantedPowerUp, setGrantedPowerUp] = useState<string | null>(null);

  // Reset phase when modal reopens
  useEffect(() => {
    if (isOpen) {
      setPhase("offer");
      setGrantedPowerUp(null);
    }
  }, [isOpen]);

  const handleClaim = async () => {
    setClaiming(true);
    const success = await activateVip("10days");
    if (success && user) {
      // Mark as claimed (one-time)
      localStorage.setItem(`${GIFT_CLAIMED_KEY}_${user.id}`, "true");

      // Grant 150 coins
      try {
        await supabase.rpc("update_user_currency", {
          p_user_id: user.id,
          p_coins_delta: 150,
        });
      } catch (e) {
        console.error("Failed to grant coins:", e);
      }

      // Grant 1 random power-up
      const types = ["5050", "freeze", "replace", "time-drain"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      setGrantedPowerUp(randomType);
      try {
        // Try update first, then insert if no row exists
        const { data: existing } = await supabase
          .from("user_power_ups")
          .select("quantity")
          .eq("user_id", user.id)
          .eq("power_up_type", randomType)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_power_ups")
            .update({ quantity: (existing.quantity ?? 0) + 1 })
            .eq("user_id", user.id)
            .eq("power_up_type", randomType);
        } else {
          await supabase
            .from("user_power_ups")
            .insert({ user_id: user.id, power_up_type: randomType, quantity: 1 });
        }
      } catch (e) {
        console.error("Failed to grant power-up:", e);
      }

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
    if (phase === "success") {
      onClaimed();
    } else {
      onDismiss();
    }
  };

  const handleFeatureClick = (path: string) => {
    onClaimed();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">ბეტა საჩუქარი</DialogTitle>
        <AnimatePresence mode="wait">
          {phase === "offer" ? (
            <OfferPhase
              claiming={claiming}
              onClaim={handleClaim}
              onClose={handleClose}
            />
          ) : (
            <SuccessPhase
              onClose={handleClose}
              onFeatureClick={handleFeatureClick}
              grantedPowerUp={grantedPowerUp}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ── Offer Phase ── */
function OfferPhase({
  claiming,
  onClaim,
  onClose,
}: {
  claiming: boolean;
  onClaim: () => void;
  onClose: () => void;
}) {
  return (
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
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mb-4"
        >
          <img src={confettiGunIcon} alt="" className="w-[4.5rem] h-[4.5rem] object-contain" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-xl font-bold text-gray-900 text-center mb-2"
        >
          მადლობა, რომ ჩვენთან ხარ!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-gray-600 text-center text-sm leading-relaxed mb-6"
        >
          <span className="font-semibold text-amber-600">
            საჩუქრად გიგზავნით 10 დღიან PRO-ს.
          </span>
          <br />
          სასიამოვნო გართობას გისურვებთ!
        </motion.p>

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
            10 დღიანი PRO
          </span>
        </motion.div>

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
            onClick={onClaim}
            disabled={claiming}
            showParticles
            icon={<img src={unboxingGiftIcon} alt="" className="w-7 h-7 object-contain" />}
          >
            {claiming ? "იტვირთება..." : "მიიღე საჩუქარი"}
          </ChunkyButton>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={onClose}
          className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          მოგვიანებით
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Success Phase ── */
function SuccessPhase({
  onClose,
  onFeatureClick,
  grantedPowerUp,
}: {
  onClose: () => void;
  onFeatureClick: (path: string) => void;
  grantedPowerUp: string | null;
}) {
  return (
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
        {/* Crown icon */}
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
          PRO გააქტიურდა!
        </motion.h2>

        {/* 24hr badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full mb-5"
          style={{
            background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
            boxShadow: "0 2px 0 #F59E0B40",
          }}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
          <span className="text-xs font-bold text-amber-700">10 დღე</span>
        </motion.div>

        {/* Rewards earned */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="w-full flex gap-2 mb-5"
        >
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(251,191,36,0.15)" }}
          >
            <span className="text-lg">🪙</span>
            <span className="text-sm font-bold text-amber-700">+150 მონეტა</span>
          </div>
          {grantedPowerUp && (
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(124,58,237,0.12)" }}
            >
              <span className="text-lg">⚡</span>
              <span className="text-sm font-bold text-purple-700">
                +1 {POWER_UP_NAMES[grantedPowerUp] ?? grantedPowerUp}
              </span>
            </div>
          )}
        </motion.div>

        {/* Interactive feature clues */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-500 text-center text-sm mb-4"
        >
          სცადე PRO ფუნქციები:
        </motion.p>

        <div className="w-full space-y-2 mb-6">
          {FEATURE_CLUES.map((feature, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              onClick={() => onFeatureClick(feature.path)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl active:scale-[0.97] transition-transform min-h-[56px]"
              style={{
                background: "rgba(255,255,255,0.85)",
                boxShadow: "0 2px 0 rgba(0,0,0,0.05)",
              }}
            >
              <img src={feature.icon} alt="" className="w-9 h-9 object-contain" />
              <span className="text-[15px] font-semibold text-gray-700 flex-1 text-left">
                {feature.text}
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          ))}
        </div>

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
            onClick={onClose}
            icon={<img src={confettiGunIcon} alt="" className="w-5 h-5 object-contain" />}
          >
            დავიწყოთ!
          </ChunkyButton>
        </motion.div>
      </div>
    </motion.div>
  );
}
