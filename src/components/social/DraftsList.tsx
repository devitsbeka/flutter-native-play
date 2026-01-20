import { motion } from "framer-motion";
import { Trash2, FileText, Clock, Layers } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { useDrafts } from "@/hooks/useDrafts";
import { useTriviaDrafts } from "@/hooks/useTriviaDrafts";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";

interface DraftsListProps {
  onResumeDraft: (draftId: string, type: "collection" | "trivia" | "personal") => void;
  onClose: () => void;
}

export function DraftsList({ onResumeDraft, onClose }: DraftsListProps) {
  const { drafts: collectionDrafts, isLoading: isLoadingCollections, deleteDraft: deleteCollectionDraft, isDeletingDraft: isDeletingCollection } = useDrafts();
  const { drafts: triviaDrafts, isLoading: isLoadingTrivias, deleteDraft: deleteTriviaDraft, isDeletingDraft: isDeletingTrivia } = useTriviaDrafts();

  const isLoading = isLoadingCollections || isLoadingTrivias;
  const isDeletingDraft = isDeletingCollection || isDeletingTrivia;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasCollectionDrafts = collectionDrafts && collectionDrafts.length > 0;
  const hasTriviaDrafts = triviaDrafts && triviaDrafts.length > 0;

  if (!hasCollectionDrafts && !hasTriviaDrafts) {
    return null;
  }

  return (
    <div className="border-t border-white/20 pt-4 mt-2">
      <div className="flex items-center gap-2 mb-3 px-1">
        <FileText className="w-4 h-4 text-white/60" />
        <span className="text-xs font-medium text-white/60">შენახული დრაფტები</span>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {/* Trivia Drafts (both trivia and personal) */}
        {triviaDrafts?.slice(0, 5).map((draft) => {
          const questionCount = Array.isArray(draft.questions) ? draft.questions.length : 0;
          const isPersonal = draft.draft_type === 'personal';
          const displayTitle = draft.title || (isPersonal ? "უსათაურო MyTrivia" : "უსათაურო ტრივია");
          
          return (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/15 transition-colors group"
            >
              {/* Draft Preview - Different icon for personal vs trivia */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isPersonal 
                  ? "bg-gradient-to-br from-pink-500/30 to-rose-600/30" 
                  : "bg-gradient-to-br from-purple-500/30 to-violet-600/30"
              }`}>
                <img 
                  src={isPersonal ? iconGroupOfPeople : triviaBuzzer} 
                  alt="" 
                  className="w-7 h-7 object-contain"
                />
              </div>
              
              {/* Draft Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {displayTitle}
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>{questionCount} კითხვა</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(draft.updated_at), { 
                      addSuffix: true, 
                      locale: ka 
                    })}
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTriviaDraft(draft.id);
                  }}
                  disabled={isDeletingDraft}
                  className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    onClose();
                    onResumeDraft(draft.id, isPersonal ? "personal" : "trivia");
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  გაგრძელება
                </button>
              </div>
            </motion.div>
          );
        })}

        {/* Collection Drafts */}
        {collectionDrafts?.slice(0, 3).map((draft) => {
          const roundsConfig = draft.rounds_config as { subject: string }[] | undefined;
          const subjects = roundsConfig?.map(r => r.subject).filter(Boolean).join(", ") || "უსათაურო";
          const displayTitle = draft.title || subjects;
          const roundCount = roundsConfig?.length || 0;
          
          return (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/15 transition-colors group"
            >
              {/* Draft Preview - Collection icon or cover */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {draft.cover_image ? (
                  <img 
                    src={draft.cover_image} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={iconCollections} 
                    alt="" 
                    className="w-7 h-7 object-contain"
                  />
                )}
              </div>
              
              {/* Draft Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {displayTitle}
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Layers className="w-3 h-3" />
                  <span>{roundCount} რაუნდი</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(draft.updated_at), { 
                      addSuffix: true, 
                      locale: ka 
                    })}
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCollectionDraft(draft.id);
                  }}
                  disabled={isDeletingDraft}
                  className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    onClose();
                    onResumeDraft(draft.id, "collection");
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  გაგრძელება
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
