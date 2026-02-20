import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { useClipboard } from "@/hooks/use-clipboard";
import { Copy, Check, Share2, Users } from "lucide-react";
import crownIcon from "@/assets/icons/icon-vip-crown.png";
import confettiGunIcon from "@/assets/icons/confetti-gun.png";

const SESSION_KEY = "invite_modal_dismissed";

export function useInviteModalVisibility(isVip: boolean, vipLoading: boolean, freeGamesExhausted: boolean) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || vipLoading || isVip || !freeGamesExhausted) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {}
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [user, isVip, vipLoading, freeGamesExhausted]);

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
  const { createLinkInvite } = useFriendInvites();
  const { copy, copied } = useClipboard();
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open && !referralLink) {
      generateLink();
    }
  }, [open]);

  const generateLink = async () => {
    setGenerating(true);
    const code = await createLinkInvite("standard");
    if (code) {
      setReferralLink(`https://flutter-native-play.lovable.app/auth?ref=${code}&mode=signup`);
    }
    setGenerating(false);
  };

  const handleCopy = () => {
    if (referralLink) copy(referralLink);
  };

  const handleShare = async () => {
    if (!referralLink) return;
    try {
      await navigator.share({
        title: "MyTrivia LIVE",
        text: "შემოგვიერთდი MyTrivia LIVE-ზე და მიიღე 10 დღიანი PRO უფასოდ!",
        url: referralLink,
      });
    } catch {
      handleCopy();
    }
  };

  const handleClose = () => {
    onDismiss();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">მეგობრების მოწვევა</DialogTitle>
        <motion.div
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
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 50%, #6D28D9 100%)",
                  boxShadow: "0 6px 0 #5B21B6, 0 0 30px rgba(124,58,237,0.4)",
                }}
              >
                <Users className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-lg font-bold text-gray-900 text-center mb-2"
            >
              მოიწვიე მეგობრები!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-gray-600 text-center text-sm leading-relaxed mb-4"
            >
              მოიწვიე მეგობრები ამ ლინკით და მიიღეთ{" "}
              <span className="font-semibold text-amber-600">10 დღიანი PRO</span>,
              სასიამოვნო გართობას გისურვებთ!
            </motion.p>

            {/* PRO badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{
                background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                boxShadow: "0 3px 0 #C4B5FD",
              }}
            >
              <img src={crownIcon} alt="" className="w-6 h-6 object-contain" />
              <span className="font-display text-sm font-bold text-purple-700">
                10 დღიანი PRO საჩუქარი
              </span>
            </motion.div>

            {/* Referral link */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="w-full mb-4"
            >
              {generating ? (
                <div className="w-full py-3 px-4 rounded-xl bg-gray-100 text-center text-sm text-gray-500">
                  ლინკი იქმნება...
                </div>
              ) : referralLink ? (
                <div
                  className="w-full py-3 px-4 rounded-xl text-xs text-gray-600 break-all select-all cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.04)" }}
                  onClick={handleCopy}
                >
                  {referralLink}
                </div>
              ) : null}
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full flex gap-2"
            >
              <ChunkyButton
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleCopy}
                disabled={!referralLink}
                icon={copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              >
                {copied ? "დაკოპირდა!" : "კოპირება"}
              </ChunkyButton>

              {"share" in navigator && (
                <ChunkyButton
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={handleShare}
                  disabled={!referralLink}
                  icon={<Share2 className="w-5 h-5" />}
                >
                  გაზიარება
                </ChunkyButton>
              )}
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              onClick={handleClose}
              className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              მოგვიანებით
            </motion.button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
