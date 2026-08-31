import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Users, Monitor } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";

// Helper to get gradient style (handles both CSS strings and Tailwind classes)
function getGradientProps(gradient: string) {
  if (gradient?.includes('gradient') || gradient?.includes('#') || gradient?.includes('rgb')) {
    return { style: { background: gradient }, className: '' };
  }
  return { style: undefined, className: `bg-gradient-to-br ${gradient || 'from-purple-500 to-pink-500'}` };
}

interface TriviaPlayModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trivia: {
    id: string;
    title: string;
    questionCount: number;
    coverImage?: string;
    coverGradient?: string;
    isBlind?: boolean;
  } | null;
  onPlaySolo: () => void;
  onCreateRoom: () => void;
  onPlayTV: () => void;
  /** The owner already played this blind trivia — solo is off the table
      (they know the answers now); what's left is challenging friends. */
  alreadyPlayed?: boolean;
}

export function TriviaPlayModeModal({
  isOpen,
  onClose,
  trivia,
  onPlaySolo,
  onCreateRoom,
  onPlayTV,
  alreadyPlayed,
}: TriviaPlayModeModalProps) {
  // Hook must run before the early return below
  const { t } = useLanguage();

  if (!trivia) return null;

  const gradientProps = getGradientProps(trivia.coverGradient || '');

  const handlePlaySolo = () => {
    onPlaySolo();
    onClose();
  };

  const handleCreateRoom = () => {
    onCreateRoom();
    onClose();
  };

  const handlePlayTV = () => {
    onPlayTV();
    onClose();
  };

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none"
          >
            {/* max-h + scroll: the card used to be vertically centred with no
                height cap, so on short viewports its last option was cut off */}
            <div className="bg-card rounded-3xl overflow-y-auto max-h-[85vh] w-full max-w-sm pointer-events-auto shadow-2xl border border-border mx-auto">
              {/* Header with cover */}
              <div className="relative h-24 shrink-0">
                {trivia.coverImage ? (
                  <>
                    <img 
                      src={trivia.coverImage} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  </>
                ) : (
                  <div 
                    className={`w-full h-full ${gradientProps.className}`}
                    style={gradientProps.style}
                  />
                )}

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Title */}
                <div className="absolute bottom-3 left-4 right-4">
                  <h2 className="text-base font-bold text-white drop-shadow-lg line-clamp-2">
                    {trivia.title}
                  </h2>
                  <p className="text-xs text-white/80 mt-0.5">
                    {trivia.questionCount} {t("extra.questionWordLabel")} • {t("extra.closedLabel")}
                  </p>
                </div>
              </div>

              {/* Play mode options */}
              <div className="p-3 space-y-2">
                <p className="text-center text-sm text-muted-foreground mb-2">
                  {t("extra.howToPlayPrompt")}
                </p>

                {/* Solo Play — gone once the owner has played it */}
                {!alreadyPlayed && (
                <button
                  onClick={handlePlaySolo}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-primary fill-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {t("extra.playSoloLabel")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("extra.playSoloDesc")}
                    </p>
                  </div>
                </button>
                )}

                {/* Create Room */}
                <button
                  onClick={handleCreateRoom}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground group-hover:text-purple-500 transition-colors">
                      {t("extra.createRoomOption")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("extra.withFriendsDesc")}
                    </p>
                  </div>
                </button>

                {/* TV Mode */}
                <button
                  onClick={handlePlayTV}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground group-hover:text-blue-500 transition-colors">
                      {t("extra.tvModeLabel")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("extra.onBigScreenDesc")}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
