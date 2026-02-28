import { useState } from "react";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFriendInvites } from "@/hooks/useFriendInvites";
import { toast } from "sonner";

export function InviteFriendsMiniCard() {
  const { t } = useLanguage();
  const { createLinkInvite } = useFriendInvites();
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const referralCode = await createLinkInvite("friend_pro");
      if (referralCode) {
        const link = `${window.location.origin}/auth?ref=${referralCode}`;
        const shareText = t("extra.getProFree");
        if (navigator.share) {
          try {
            await navigator.share({ title: "My Trivia", text: shareText, url: link });
          } catch { /* cancelled */ }
        } else {
          await navigator.clipboard.writeText(link);
          toast.success(t("extra.linkCopiedInvite"));
        }
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 overflow-hidden relative flex flex-col items-center text-center gap-2"
      style={{
        background: "linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)",
        border: "1px solid rgba(147, 51, 234, 0.25)",
      }}
    >
      <p className="text-sm font-semibold text-foreground leading-tight">
        {t("extra.inviteMiniTitle")}
      </p>
      <span
        className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
        style={{ background: "linear-gradient(135deg, #9333EA, #F59E0B)" }}
      >
        🎁 {t("extra.inviteMiniReward")}
      </span>
      <motion.button
        onClick={handleShare}
        disabled={sharing}
        className="px-5 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-70"
        style={{ background: "linear-gradient(135deg, #9333EA 0%, #A855F7 100%)" }}
        whileHover={{ scale: sharing ? 1 : 1.05 }}
        whileTap={{ scale: sharing ? 1 : 0.95 }}
      >
        <Share2 className="w-4 h-4" />
        {t("extra.shareBtn")}
      </motion.button>
    </motion.div>
  );
}
