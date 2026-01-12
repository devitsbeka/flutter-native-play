import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import { DraftsList } from "./DraftsList";

interface CreateTriviaTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSingle: () => void;
  onSelectCollection: (draftId?: string) => void;
  onSelectPersonal?: () => void;
}

export function CreateTriviaTypeModal({
  open,
  onOpenChange,
  onSelectSingle,
  onSelectCollection,
  onSelectPersonal,
}: CreateTriviaTypeModalProps) {
  const handleResumeDraft = (draftId: string) => {
    onSelectCollection(draftId);
  };

  const handleClose = () => onOpenChange(false);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">რა შევქმნათ?</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
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
              className="w-full p-5 rounded-2xl border-2 border-border hover:border-primary/50 bg-gradient-to-br from-purple-500/5 to-purple-500/10 transition-all text-left flex items-center gap-4 group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-purple-500/30 transition-shadow">
                <img src={triviaBuzzer} alt="" className="w-[41px] h-[41px] object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-foreground text-lg">ტრივია</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  1 რაუნდი, სწრაფი შექმნა
                </p>
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
              className="w-full p-5 rounded-2xl border-2 border-border hover:border-primary/50 bg-gradient-to-br from-cyan-500/5 to-blue-500/10 transition-all text-left flex items-center gap-4 group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-cyan-500/30 transition-shadow">
                <img src={iconCollections} alt="" className="w-[41px] h-[41px] object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-foreground text-lg">კოლექცია</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  რამდენიმე რაუნდი ერთად
                </p>
              </div>
            </motion.button>

            {/* MyTrivia Party Card */}
            {onSelectPersonal && (
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
                className="w-full p-5 rounded-2xl border-2 border-border hover:border-primary/50 bg-gradient-to-br from-pink-500/5 to-rose-500/10 transition-all text-left flex items-center gap-4 group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-pink-500/30 transition-shadow">
                  <img src={iconGroupOfPeople} alt="" className="w-[41px] h-[41px] object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground text-lg">MyTrivia Party</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    შენი კითხვები, შენი პასუხები
                  </p>
                </div>
              </motion.button>
            )}

            {/* Drafts List */}
            <DraftsList 
              onResumeDraft={handleResumeDraft}
              onClose={handleClose}
            />

            {/* Hint */}
            <p className="text-xs text-center text-muted-foreground pt-2">
              💡 კოლექცია იდეალურია თემატური ტურნირისთვის
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
