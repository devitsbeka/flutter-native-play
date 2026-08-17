import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * The avatar, big.
 *
 * The reel draws every avatar at 64px and enlarges the centred one to 128px,
 * which is the whole of what a player could ever see of a picture they paid
 * gems to have made. Tapping it did nothing but focus it — this shows it
 * full-size, playing its animated loop when one exists.
 *
 * There used to be an "animate" button under the picture; the feature was
 * retired, and the close control now sits in its place — under the avatar,
 * where the thumb already is — instead of a small × in the top corner.
 */

interface AvatarViewerProps {
  isOpen: boolean;
  onClose: () => void;
  /** The still. */
  imageUrl: string;
  /** Its loop, if it has already been animated. */
  animatedUrl?: string | null;
}

export function AvatarViewer({
  isOpen,
  onClose,
  imageUrl,
  animatedUrl,
}: AvatarViewerProps) {
  const { t } = useLanguage();
  const [loop, setLoop] = useState<string | null>(animatedUrl ?? null);

  useEffect(() => {
    setLoop(animatedUrl ?? null);
  }, [animatedUrl, isOpen]);

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

          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="w-12 h-12 rounded-full bg-white text-purple-700 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
