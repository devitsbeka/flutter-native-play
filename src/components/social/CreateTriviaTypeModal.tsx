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
            {/* Single Trivia Card */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                handleClose();
                onSelectSingle();
              }}
              className="relative w-full p-4 rounded-2xl overflow-hidden text-left flex items-center gap-4"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: "radial-gradient(circle at left center, rgba(139, 92, 246, 0.4), transparent 50%)",
                }}
              />
              
              {/* Icon */}
              <div className="relative shrink-0">
                <img src={triviaBuzzer} alt="" className="w-14 h-14 object-contain" />
              </div>
              
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-[17.6px]">{t("extra.triviaLabel")}</h3>
                  <p className="text-white/60 text-[13.8px]">{t("extra.triviaDesc2")}</p>
              </div>
            </motion.button>

            {/* Collection Card */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                handleClose();
                onSelectCollection();
              }}
              className="relative w-full p-4 rounded-2xl overflow-hidden text-left flex items-center gap-4"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: "radial-gradient(circle at left center, rgba(34, 211, 238, 0.4), transparent 50%)",
                }}
              />
              
              {/* Icon */}
              <div className="relative shrink-0">
                <img src={iconCollections} alt="" className="w-14 h-14 object-contain" />
              </div>
              
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-[17.6px]">{t("extra.collectionLabel")}</h3>
                  <p className="text-white/60 text-[13.8px]">{t("extra.collectionDesc2")}</p>
              </div>
            </motion.button>

            {/* MyTrivia Party Card */}
            {onSelectPersonal && (
              <>
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleClose();
                    onSelectPersonal();
                  }}
                  className="relative w-full p-4 rounded-2xl overflow-hidden text-left flex items-center gap-4"
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  {/* Glow effect */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: "radial-gradient(circle at left center, rgba(236, 72, 153, 0.4), transparent 50%)",
                    }}
                  />
                  
                  {/* Icon */}
                  <div className="relative shrink-0">
                    <img src={iconGroupOfPeople} alt="" className="w-14 h-14 object-contain" />
                  </div>
                  
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-[17.6px]">My Trivia Party</h3>
                    <p className="text-white/60 text-[13.8px]">{t("extra.myTriviaPartyDesc2")}</p>
                  </div>
                </motion.button>
              </>
            )}

            {/* Game Room Card */}
            {onSelectGameRoom && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  handleClose();
                  onSelectGameRoom();
                }}
                className="relative w-full p-4 rounded-2xl overflow-hidden text-left flex items-center gap-4"
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {/* Glow effect */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: "radial-gradient(circle at left center, rgba(16, 185, 129, 0.4), transparent 50%)",
                  }}
                />
                
                {/* Icon */}
                <div className="relative shrink-0">
                  <img src={danceFloor} alt="" className="w-14 h-14 object-contain" />
                </div>
                
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-[17.6px]">{t("extra.gameRoomLabel")}</h3>
                  <p className="text-white/60 text-[13.8px]">{t("extra.playWithFriends")}</p>
                </div>
              </motion.button>
            )}

              {/* Drafts List */}
              <div className="h-[50px]" aria-hidden />
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
