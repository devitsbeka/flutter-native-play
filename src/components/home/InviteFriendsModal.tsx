import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { useClipboard } from "@/hooks/use-clipboard";
import { Copy, Check, Share2, X, Loader2 } from "lucide-react";
import { useVipStatus } from "@/hooks/useVipStatus";
import { InviteBanner, SKIN_INVITE } from "@/components/shop/ProBannerCard";
import crownIcon from "@/assets/icons/icon-vip-crown.png";
import groupOfPeopleIcon from "@/assets/icons/group-of-people.png";
import { siteUrl } from "@/config/site";

const SESSION_KEY = "invite_modal_dismissed";

export function useInviteModalVisibility(isVip: boolean, vipLoading: boolean, suppress = false, freeGamesExhausted = false) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  void user;

  // NOTE: this modal no longer auto-opens on app open - it interrupted every
  // session for free-tier users (and chained into the play-limit modal).
  // The persistent FloatingGiftButton is the entry point instead; the eligibility
  // params are kept so the button can decide when to render.
  void suppress;
  void freeGamesExhausted;

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
      setReferralLink(siteUrl(`auth?ref=${code}&mode=signup`));
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
      {/* The banner is 575 design pixels wide and scales to its box, so the
          dialog gives it a phone-friendly width and lets it size itself. */}
      <DialogContent className="max-w-[420px] border-none bg-transparent p-0 shadow-none [&>button]:hidden">
        <DialogTitle className="sr-only">{t("extra.inviteFriendsTitle")}</DialogTitle>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative px-2"
        >
          {/* The same banner the shop and the profile show. This popup used
              to draw its own purple-gradient version of the offer, so the
              two said the same thing in two designs and only one of them was
              the one in the frame. */}
          <InviteBanner
            skin={SKIN_INVITE}
            art={groupOfPeopleIcon}
            crown={crownIcon}
            headline={t("extra.inviteFriends")}
            body={`${t("extra.shareLink")} ${t("extra.tenDayPro")}`}
            reward={t("extra.tenDayPro")}
            copyLabel={
              <>
                {copied ? <Check className="size-[18px]" /> : <Copy className="size-[18px]" />}
                {copied ? t("extra.copiedBtn") : t("extra.copyBtn")}
              </>
            }
            onCopy={handleCopy}
            copyDisabled={!referralLink}
            actionLabel={
              generating ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Share2 className="size-[18px]" />
                  {t("extra.shareBtn")}
                </>
              )
            }
            onAction={() => void handleShare()}
            actionDisabled={!referralLink}
          />

          {/* Dismiss. The banner owns the card's own edges, so this sits
              above it rather than inside. */}
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("extra.laterBtn")}
            className="absolute right-5 top-3 flex size-9 items-center justify-center rounded-full bg-white/70 text-[#543990] shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <X className="size-4" />
          </button>

          <AnimatePresence>
            {shared && (
              <motion.p
                initial={{ opacity: 0, y: 5, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 5, height: 0 }}
                className="mt-2 px-2 text-center text-xs leading-relaxed text-white"
              >
                {t("extra.sharedConfirmation")}{" "}
                <span className="font-semibold text-yellow-300">{t("extra.tenDayProSuffix")}</span>!
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
