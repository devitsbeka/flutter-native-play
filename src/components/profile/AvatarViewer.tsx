import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVipStatus } from "@/contexts/VipContext";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { useAnimateAvatar } from "@/hooks/useAnimateAvatar";
import crownIcon from "@/assets/crown-icon.png";

/**
 * The avatar, big, and the one thing worth doing to it.
 *
 * The reel draws every avatar at 64px and enlarges the centred one to 128px,
 * which is the whole of what a player could ever see of a picture they paid
 * gems to have made. Tapping it did nothing but focus it.
 *
 * Animating was in the same position: the button existed inside the avatar
 * studio, three taps away, next to the one that animates the *homepage
 * scene*. From the profile — where the avatar actually is — there was no way
 * to reach it.
 *
 * Starting an animation closes this after a beat and leaves the shell's
 * floating bubble running: Kling takes minutes, and the poll does not care
 * whether anything is on screen.
 */

const AUTO_CLOSE_MS = 2500;

interface AvatarViewerProps {
  isOpen: boolean;
  onClose: () => void;
  /** The still. */
  imageUrl: string;
  /** Its loop, if it has already been animated. */
  animatedUrl?: string | null;
  /** Called with the new loop when one lands while this is still open. */
  onAnimated?: (videoUrl: string) => void;
}

export function AvatarViewer({
  isOpen,
  onClose,
  imageUrl,
  animatedUrl,
  onAnimated,
}: AvatarViewerProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isVip } = useVipStatus();
  const { reportGenerating } = useAvatarModal();
  const { animate, animating } = useAnimateAvatar();
  const navigate = useNavigate();
  const [loop, setLoop] = useState<string | null>(animatedUrl ?? null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoop(animatedUrl ?? null);
  }, [animatedUrl, isOpen]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const startAnimation = async () => {
    if (!user || animating) return;

    reportGenerating(true, imageUrl, "animation");
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      onClose();
    }, AUTO_CLOSE_MS);

    try {
      const videoUrl = await animate({
        mode: "avatar",
        imageUrl,
        userId: user.id,
        // The player has been sent back to whatever they were doing; a
        // running commentary of "still processing" belongs to the screen
        // that started it, and that screen has closed.
        quiet: true,
      });
      if (videoUrl) {
        setLoop(videoUrl);
        onAnimated?.(videoUrl);
        toast.success(t("avatar.avatarAnimated"));
      }
    } finally {
      reportGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 p-6 pt-[calc(1.5rem_+_var(--safe-top))] pb-[calc(1.5rem_+_var(--safe-bottom))]"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            /* `absolute` resolves against the padding box, and the backdrop's
               padding already carries the status-bar inset — so this clears
               it. Adding the inset again here is the double-spacing bug this
               app has shipped twice. */
            className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Stop the backdrop's close from firing on the picture itself. */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[320px] aspect-square rounded-full overflow-hidden border-4 border-white/90 shadow-2xl bg-white"
          >
            {loop ? (
              <video
                src={loop}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            )}
          </motion.div>

          <div onClick={(e) => e.stopPropagation()}>
            {isVip ? (
              <button
                type="button"
                onClick={startAnimation}
                disabled={animating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-sm font-bold text-purple-700 shadow-lg disabled:opacity-60"
              >
                {animating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("avatar.animating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {loop ? t("avatar.reAnimate") : t("avatar.animateAvatar")}
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/profile?tab=PRO");
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 text-sm font-medium text-white"
              >
                <Lock className="w-4 h-4" />
                {t("avatar.animationPro")}
                <img src={crownIcon} alt="" className="w-4 h-4 object-contain" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
