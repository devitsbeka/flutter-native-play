import { motion } from "framer-motion";
import { X, Sparkles, Users } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 rounded-3xl overflow-hidden">
        <DialogTitle className="sr-only">აირჩიე ტრივიას ტიპი</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="w-9" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">რა შევქმნათ?</span>
          </div>
          <button 
            onClick={() => onOpenChange(false)} 
            className="p-2 -mr-2 hover:bg-muted rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Single Trivia Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onOpenChange(false);
              onSelectSingle();
            }}
            className="w-full p-5 rounded-2xl border-2 border-border hover:border-primary/50 bg-gradient-to-br from-purple-500/5 to-purple-500/10 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-purple-500/30 transition-shadow">
              <img src={triviaBuzzer} alt="" className="w-9 h-9 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-foreground text-lg">🎯 ტრივია</span>
              </div>
              <p className="text-sm text-muted-foreground">
                1 რაუნდი, სწრაფი შექმნა
              </p>
            </div>
          </motion.button>

          {/* Collection Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onOpenChange(false);
              onSelectCollection();
            }}
            className="w-full p-5 rounded-2xl border-2 border-border hover:border-primary/50 bg-gradient-to-br from-cyan-500/5 to-blue-500/10 transition-all text-left flex items-center gap-4 group"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-cyan-500/30 transition-shadow">
              <img src={iconCollections} alt="" className="w-9 h-9 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-foreground text-lg">📚 კოლექცია</span>
              </div>
              <p className="text-sm text-muted-foreground">
                რამდენიმე რაუნდი ერთად
              </p>
            </div>
          </motion.button>

          {/* MyTrivia Party Card */}
          {onSelectPersonal && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onOpenChange(false);
                onSelectPersonal();
              }}
              className="w-full p-5 rounded-2xl border-2 border-border hover:border-primary/50 bg-gradient-to-br from-pink-500/5 to-rose-500/10 transition-all text-left flex items-center gap-4 group"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-pink-500/30 transition-shadow">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-foreground text-lg">🎉 MyTrivia Party</span>
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
            onClose={() => onOpenChange(false)}
          />

          {/* Hint */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            💡 კოლექცია იდეალურია თემატური ტურნირისთვის
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
