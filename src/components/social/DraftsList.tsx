import { motion } from "framer-motion";
import { Trash2, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { useDrafts } from "@/hooks/useDrafts";

interface DraftsListProps {
  onResumeDraft: (draftId: string) => void;
  onClose: () => void;
}

export function DraftsList({ onResumeDraft, onClose }: DraftsListProps) {
  const { drafts, isLoading, deleteDraft, isDeletingDraft } = useDrafts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border pt-4 mt-2">
      <div className="flex items-center gap-2 mb-3 px-1">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">შენახული დრაფტები</span>
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {drafts.slice(0, 5).map((draft) => {
          const roundsConfig = draft.rounds_config as { subject: string }[] | undefined;
          const subjects = roundsConfig?.map(r => r.subject).filter(Boolean).join(", ") || "უსათაურო";
          const displayTitle = draft.title || subjects;
          
          return (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
            >
              {/* Draft Preview */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-600/20 flex items-center justify-center flex-shrink-0">
                {draft.cover_image ? (
                  <img 
                    src={draft.cover_image} 
                    alt="" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <FileText className="w-5 h-5 text-primary" />
                )}
              </div>
              
              {/* Draft Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {displayTitle}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
                    deleteDraft(draft.id);
                  }}
                  disabled={isDeletingDraft}
                  className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    onClose();
                    onResumeDraft(draft.id);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
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
