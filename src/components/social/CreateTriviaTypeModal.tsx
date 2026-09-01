import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import danceFloor from "@/assets/dance-floor.png";
import { DraftsList } from "./DraftsList";

interface CreateTriviaTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSingle: (draftId?: string) => void;
  onSelectCollection: (draftId?: string) => void;
  onSelectPersonal?: (draftId?: string) => void;
  onSelectGameRoom?: () => void;
}

export function CreateTriviaTypeModal({
  open,
  onOpenChange,
  onSelectSingle,
  onSelectCollection,
  onSelectPersonal,
  onSelectGameRoom,
}: CreateTriviaTypeModalProps) {
  const { t } = useLanguage();
  const handleResumeDraft = (draftId: string, type: "collection" | "trivia" | "personal") => {
    if (type === "trivia") {
      onSelectSingle(draftId);
    } else if (type === "personal") {
      onSelectPersonal?.(draftId);
    } else {
      onSelectCollection(draftId);
    }
  };

  const handleClose = () => onOpenChange(false);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Solid backdrop - appears instantly to prevent background bleed-through on mobile */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 safe-screen z-[49]"
            style={{ background: "#4C1D95" }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 safe-screen z-50 flex flex-col overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)",
            }}
          >
          {/* Fixed Header */}
          <div className="flex-shrink-0">
            <div className="max-w-2xl mx-auto w-full flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <h2 className="text-xl font-bold text-white">{t("extra.whatToCreate")}</h2>
              </div>
            </div>
          </div>

          {/* Content (no page scroll; drafts scroll internally if needed) */}
          <div className="flex-1 overflow-hidden px-4 py-6 pb-[calc(1.5rem_+_var(--safe-bottom))] max-w-2xl mx-auto w-full">
            <div className="flex h-full flex-col space-y-3">
            {/* The room comes first, and looks it.
                Four cards of identical weight made "create a room" the
                fourth option on a screen reached from a games list — the
                thing most people came to do, filed under three kinds of
                quiz. It leads now, at full size; the three quiz types are a
                secondary row under their own label. */}
            {onSelectGameRoom && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  handleClose();
                  onSelectGameRoom();
                }}
                className="relative w-full p-5 rounded-3xl overflow-hidden text-left flex items-center gap-4 shrink-0"
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(12px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.38)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: "radial-gradient(circle at left center, rgba(16, 185, 129, 0.55), transparent 55%)",
                  }}
                />
                <div className="relative shrink-0">
                  <img src={danceFloor} alt="" className="w-[72px] h-[72px] object-contain drop-shadow-lg" />
                </div>
                <div className="flex-1 min-w-0 relative">
                  <h3 className="font-display text-white text-[22px] leading-tight">{t("extra.gameRoomLabel")}</h3>
                  <p className="text-white/70 text-[14px] mt-0.5">{t("extra.playWithFriends")}</p>
                </div>
              </motion.button>
            )}

            {onSelectGameRoom && (
              <p className="shrink-0 pt-1 px-1 text-[12px] font-semibold uppercase tracking-wide text-white/50">
                {t("extra.orCreateTrivia")}
              </p>
            )}

            {/* The three quiz types, secondary to the room above */}
            {([
              {
                key: "trivia",
                icon: triviaBuzzer,
                title: t("extra.triviaLabel"),
                desc: t("extra.triviaDesc2"),
                glow: "rgba(139, 92, 246, 0.4)",
                onPick: () => onSelectSingle(),
              },
              {
                key: "collection",
                icon: iconCollections,
                title: t("extra.collectionLabel"),
                desc: t("extra.collectionDesc2"),
                glow: "rgba(34, 211, 238, 0.4)",
                onPick: () => onSelectCollection(),
              },
              ...(onSelectPersonal
                ? [{
                    key: "personal",
                    icon: iconGroupOfPeople,
                    title: "My Trivia Party",
                    desc: t("extra.myTriviaPartyDesc2"),
                    glow: "rgba(236, 72, 153, 0.4)",
                    onPick: () => onSelectPersonal(),
                  }]
                : []),
            ]).map((card, i) => (
              <motion.button
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (i + 1) }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  handleClose();
                  card.onPick();
                }}
                className={`relative w-full rounded-2xl overflow-hidden text-left flex items-center gap-4 shrink-0 ${
                  onSelectGameRoom ? "p-3" : "p-4"
                }`}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `radial-gradient(circle at left center, ${card.glow}, transparent 50%)`,
                  }}
                />
                <div className="relative shrink-0">
                  <img
                    src={card.icon}
                    alt=""
                    className={onSelectGameRoom ? "w-11 h-11 object-contain" : "w-14 h-14 object-contain"}
                  />
                </div>
                <div className="flex-1 min-w-0 relative">
                  <h3 className="font-bold text-white text-[16px]">{card.title}</h3>
                  <p className="text-white/60 text-[13px]">{card.desc}</p>
                </div>
              </motion.button>
            ))}

              {/* Drafts List */}
              <div className="h-[24px] shrink-0" aria-hidden />
              <div className="flex-1 min-h-0">
                <DraftsList 
                  onResumeDraft={handleResumeDraft}
                  onClose={handleClose}
                />
              </div>

            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
