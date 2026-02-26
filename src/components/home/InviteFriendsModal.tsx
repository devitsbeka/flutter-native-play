import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { useClipboard } from "@/hooks/use-clipboard";
import { Copy, Check, Share2 } from "lucide-react";
import { useVipStatus } from "@/hooks/useVipStatus";
import crownIcon from "@/assets/icons/icon-vip-crown.png";
import groupOfPeopleIcon from "@/assets/icons/group-of-people.png";

const SESSION_KEY = "invite_modal_dismissed";

export function useInviteModalVisibility(isVip: boolean, vipLoading: boolean, suppress = false, freeGamesExhausted = false) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || vipLoading || isVip || suppress || !freeGamesExhausted) return;
    try {
      if (localStorage.getItem("cached_vip_status") === "true") return;
    } catch {}
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {}
    setVisible(true);
  }, [user, isVip, vipLoading, suppress, freeGamesExhausted]);

  // Auto-dismiss if VIP status loads after modal was already shown
  useEffect(() => {
    if (visible && isVip && !vipLoading) {
      setVisible(false);
    }
  }, [visible, isVip, vipLoading]);

  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem(SESSION_KEY, "true"); } catch {}
  };

  return { visible, dismiss, setVisible };
}

interface InviteFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
}

export function InviteFriendsModal({ open, onOpenChange, onDismiss }: InviteFriendsModalProps) {
  const { t } = useLanguage();
  const { isVip, loading: vipLoading } = useVipStatus();
  const { createLinkInvite } = useFriendInvites();
  const { copy, copied } = useClipboard();
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [shared, setShared] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setReady(true), 150);
      return () => clearTimeout(timer);
    }
    setReady(false);
  }, [open]);

  useEffect(() => {
    if (open && ready && !referralLink) {
      generateLink();
    }
  }, [open, ready]);

  const generateLink = async () => {
    setGenerating(true);
    const code = await createLinkInvite("standard");
    if (code) {
      setReferralLink(`https://flutter-native-play.lovable.app/auth?ref=${code}&mode=signup`);
    }
    setGenerating(false);
  };

  const handleCopy = () => {
    if (referralLink) {
      copy(referralLink);
      setShared(true);
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;
    try {
      await navigator.share({
        title: "MyTrivia LIVE",
        text: t("extra.inviteShareText"),
        url: referralLink,
      });
      setShared(true);
    } catch {
      handleCopy();
    }
  };

  const handleClose = () => {
    onDismiss();
    onOpenChange(false);
  };

  if (!open || !ready || (isVip && !vipLoading)) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <style>{`
          @property --border-angle {
            syntax: '<angle>';
            initial-value: 0deg;
            inherits: false;
          }
          @keyframes borderSpin {
            to { --border-angle: 360deg; }
          }
        `}</style>
        <DialogTitle className="sr-only">მეგობრების მოწვევა</DialogTitle>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #a855f7 40%, #ec4899 100%)",
            boxShadow: "0 8px 0 rgba(88,28,135,0.5), 0 16px 40px rgba(124,58,237,0.4)",
            padding: "3px",
          }}
        >
          {/* Animated gradient border */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: "conic-gradient(from var(--border-angle, 0deg), #FFD700, #ec4899, #667eea, #a855f7, #FFD700)",
              animation: "borderSpin 4s linear infinite",
            }}
          />
          <div
            className="relative rounded-[calc(1.5rem-3px)] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #a855f7 40%, #ec4899 100%)",
            }}
          >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)",
            }}
          />

          <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mb-4"
            >
              <img src={groupOfPeopleIcon} alt="" className="w-20 h-20 object-contain" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display font-bold text-white text-center mb-2"
              style={{ fontSize: "1.54rem", marginTop: "-5px" }}
            >
              {t("extra.inviteFriends")}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-white/80 text-center leading-relaxed mb-4"
              style={{ fontSize: "0.95rem" }}
            >
              {t("extra.shareLink")}{" "}
              <span className="font-semibold text-yellow-300">{t("extra.tenDayPro")}</span>!
            </motion.p>

            {/* PRO badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <img src={crownIcon} alt="" className="w-6 h-6 object-contain" />
              <span className="font-display text-sm font-bold text-white">
                {t("extra.proGift")}
              </span>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full flex gap-2"
            >
              <ChunkyButton
                variant="white"
                size="md"
                className="flex-1 min-w-0"
                onClick={handleCopy}
                disabled={!referralLink}
                icon={copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              >
                {copied ? t("extra.copiedBtn") : t("extra.copyBtn")}
              </ChunkyButton>

              <ChunkyButton
                  variant="whitePurple"
                  size="md"
                  className="flex-1 min-w-0"
                  onClick={handleShare}
                  disabled={!referralLink}
                  icon={<Share2 className="w-5 h-5" />}
                >
                  {t("extra.shareBtn")}
                </ChunkyButton>
            </motion.div>

            <AnimatePresence>
              {shared && (
                <motion.p
                  initial={{ opacity: 0, y: 5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 5, height: 0 }}
                  className="text-white/90 text-center text-xs leading-relaxed mt-3 px-2"
                >
                  {t("extra.sharedConfirmation")}{" "}
                  <span className="font-semibold text-yellow-300">{t("extra.tenDayProSuffix")}</span>!
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              onClick={handleClose}
              className="mt-4 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              {t("extra.laterBtn")}
            </motion.button>
          </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
