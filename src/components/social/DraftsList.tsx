import { motion } from "framer-motion";
import { Trash2, FileText, Clock, Layers } from "lucide-react";
import { useDrafts } from "@/hooks/useDrafts";
import { useTriviaDrafts } from "@/hooks/useTriviaDrafts";
import { useLanguage } from "@/contexts/LanguageContext";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import iconCollections from "@/assets/icon-collections.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";

function formatTimeAgo(date: Date, t: (key: string, params?: Record<string, string | number>) => string) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return t("extra.draftsMinutesAgo", { count: diffMins });
  if (diffHours < 24) return t("extra.draftsHoursAgo", { count: diffHours });
  return t("extra.draftsDaysAgo", { count: diffDays });
}

interface DraftsListProps {
  onResumeDraft: (draftId: string, type: "collection" | "trivia" | "personal") => void;
  onClose: () => void;
}

export function DraftsList({ onResumeDraft, onClose }: DraftsListProps) {
  const { drafts: collectionDrafts, isLoading: isLoadingCollections, deleteDraft: deleteCollectionDraft, isDeletingDraft: isDeletingCollection } = useDrafts();
  const { drafts: triviaDrafts, isLoading: isLoadingTrivias, deleteDraft: deleteTriviaDraft, isDeletingDraft: isDeletingTrivia } = useTriviaDrafts();
  const { t } = useLanguage();

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
    // h-full + flex column, because the list below clamps itself with
    // flex-1/min-h-0. It used to be max-h-full against an auto-height
    // parent — a percentage with nothing to resolve against, so the list
    // never scrolled and the type-picker's overflow-hidden silently cropped
    // any draft past the fold.
    <div className="pt-4 h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
        <FileText className="w-[16px] h-[16px] text-[#6b5b86]" />
        <span className="font-[Nunito] text-[12px] font-bold uppercase tracking-[0.06em] text-[#6b5b86]">{t("extra.draftsSavedDrafts")}</span>
      </div>

      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {/* Trivia Drafts (both trivia and personal) */}
        {triviaDrafts?.slice(0, 5).map((draft) => {
          const questionCount = Array.isArray(draft.questions) ? draft.questions.length : 0;
          const isPersonal = draft.draft_type === 'personal';
          const displayTitle = draft.title || (isPersonal ? t("extra.draftsUntitledMyTrivia") : t("extra.draftsUntitledTrivia"));
          
          return (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3.5 min-h-[84px] sm:p-3 sm:min-h-0 rounded-[18px] border-[1.5px] border-white/80 bg-[rgba(255,255,255,0.6)] shadow-[0px_6px_18px_0px_rgba(88,50,160,0.10)] hover:bg-white/75 transition-colors group"
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
                <p className="text-sm font-semibold text-[#402666] truncate">
                  {displayTitle}
                </p>
                {/* Mobile: 3 rows (title / count / date). Desktop: single meta row. */}
                <div className="mt-[3px] flex flex-col gap-[6px] text-xs text-[#6b5b86] sm:mt-0 sm:flex-row sm:items-center sm:gap-2 sm:whitespace-nowrap">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="shrink-0">{t("extra.draftsQuestionCount", { count: questionCount })}</span>
                  </div>
                  <div className="hidden sm:block shrink-0">•</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {formatTimeAgo(new Date(draft.updated_at), t)}
                    </span>
                  </div>
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
                  className="p-1.5 text-[#e05a5a] hover:bg-red-500/10 rounded-lg opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    onClose();
                    onResumeDraft(draft.id, isPersonal ? "personal" : "trivia");
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-[#7126d5] bg-[#7126d5]/10 hover:bg-[#7126d5]/15 rounded-lg transition-colors"
                >
                  {t("extra.draftsContinueBtn")}
                </button>
              </div>
            </motion.div>
          );
        })}

        {/* Collection Drafts */}
        {collectionDrafts?.slice(0, 3).map((draft) => {
          const roundsConfig = draft.rounds_config as { subject: string }[] | undefined;
          const subjects = roundsConfig?.map(r => r.subject).filter(Boolean).join(", ") || t("extra.draftsUntitledLabel");
          const displayTitle = draft.title || subjects;
          const roundCount = roundsConfig?.length || 0;
          
          return (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3.5 min-h-[84px] sm:p-3 sm:min-h-0 rounded-[18px] border-[1.5px] border-white/80 bg-[rgba(255,255,255,0.6)] shadow-[0px_6px_18px_0px_rgba(88,50,160,0.10)] hover:bg-white/75 transition-colors group"
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
                <p className="text-sm font-semibold text-[#402666] truncate">
                  {displayTitle}
                </p>
                {/* Mobile: 3 rows (title / count / date). Desktop: single meta row. */}
                <div className="mt-[3px] flex flex-col gap-[6px] text-xs text-[#6b5b86] sm:mt-0 sm:flex-row sm:items-center sm:gap-2 sm:whitespace-nowrap">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Layers className="w-3 h-3 shrink-0" />
                    <span className="shrink-0">{t("extra.draftsRoundCount", { count: roundCount })}</span>
                  </div>
                  <div className="hidden sm:block shrink-0">•</div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {formatTimeAgo(new Date(draft.updated_at), t)}
                    </span>
                  </div>
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
                  className="p-1.5 text-[#e05a5a] hover:bg-red-500/10 rounded-lg opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    onClose();
                    onResumeDraft(draft.id, "collection");
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-[#7126d5] bg-[#7126d5]/10 hover:bg-[#7126d5]/15 rounded-lg transition-colors"
                >
                  {t("extra.draftsContinueBtn")}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
