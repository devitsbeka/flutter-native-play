import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Ban, X, AlertTriangle, MessageSquare, Shield, Swords, HelpCircle } from "lucide-react";
import { useUserModeration, ReportType } from "@/hooks/useUserModeration";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  messageId?: string;
  roomId?: string;
}

// Report reasons - labels will be translated via t()
const REPORT_REASON_KEYS: { type: ReportType; labelKey: string; icon: React.ElementType }[] = [
  { type: "spam", labelKey: "extra.reportSpam", icon: MessageSquare },
  { type: "harassment", labelKey: "extra.reportHarassment", icon: AlertTriangle },
  { type: "inappropriate", labelKey: "extra.reportInappropriate", icon: Shield },
  { type: "cheating", labelKey: "extra.reportCheating", icon: Swords },
  { type: "other", labelKey: "extra.reportOther", icon: HelpCircle },
];

export function UserActionMenu({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  messageId,
  roomId,
}: UserActionMenuProps) {
  const { reportUser, blockUser, isUserBlocked, unblockUser } = useUserModeration();
  const { t } = useLanguage();
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const isBlocked = isUserBlocked(targetUserId);

  const handleReport = async () => {
    if (!selectedReason) return;
    
    setLoading(true);
    const success = await reportUser(
      targetUserId,
      selectedReason,
      description || undefined,
      messageId,
      roomId
    );
    setLoading(false);

    if (success) {
      handleClose();
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    if (isBlocked) {
      await unblockUser(targetUserId);
    } else {
      await blockUser(targetUserId);
    }
    setLoading(false);
    handleClose();
  };

  const handleClose = () => {
    setShowReportOptions(false);
    setSelectedReason(null);
    setDescription("");
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
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 p-4 pb-8 safe-area-inset-bottom"
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {showReportOptions ? t("extra.reportReason") : targetUserName}
              </h3>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {!showReportOptions ? (
              /* Main Actions */
              <div className="space-y-2">
                <button
                  onClick={() => setShowReportOptions(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Flag className="w-5 h-5 text-amber-600" />
                  </div>
                   <div className="text-left">
                     <p className="font-medium text-foreground">{t("extra.reportBtn")}</p>
                     <p className="text-sm text-muted-foreground">{t("extra.reportHint")}</p>
                   </div>
                </button>

                <button
                  onClick={handleBlock}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isBlocked ? "bg-green-100" : "bg-red-100"
                  }`}>
                    <Ban className={`w-5 h-5 ${isBlocked ? "text-green-600" : "text-red-600"}`} />
                  </div>
                  <div className="text-left">
                     <p className="font-medium text-foreground">
                       {isBlocked ? t("extra.unblockBtn") : t("extra.blockBtn")}
                     </p>
                     <p className="text-sm text-muted-foreground">
                       {isBlocked ? t("extra.unblockHint") : t("extra.blockHint")}
                     </p>
                  </div>
                </button>
              </div>
            ) : (
              /* Report Options */
              <div className="space-y-3">
                {/* Reason Selection */}
                <div className="grid grid-cols-2 gap-2">
                {REPORT_REASON_KEYS.map(({ type, labelKey, icon: Icon }) => (
                     <button
                       key={type}
                       onClick={() => setSelectedReason(type)}
                       className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                         selectedReason === type
                           ? "border-primary bg-primary/10"
                           : "border-border bg-muted hover:bg-muted/80"
                       }`}
                     >
                       <Icon className={`w-4 h-4 ${
                         selectedReason === type ? "text-primary" : "text-muted-foreground"
                       }`} />
                       <span className={`text-sm font-medium ${
                         selectedReason === type ? "text-primary" : "text-foreground"
                       }`}>
                         {t(labelKey)}
                       </span>
                     </button>
                   ))}
                </div>

                {/* Optional Description */}
                {selectedReason && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("extra.additionalDetails")}
                      className="w-full p-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground resize-none"
                      rows={3}
                    />
                  </motion.div>
                )}

                {/* Submit Button */}
                <ChunkyButton
                  onClick={handleReport}
                  disabled={!selectedReason || loading}
                  className="w-full"
                  variant="primary"
                >
                  {loading ? t("extra.reportSending") : t("extra.sendReport")}
                </ChunkyButton>

                <button
                  onClick={() => setShowReportOptions(false)}
                  className="w-full py-2 text-sm text-muted-foreground"
                >
                  {t("extra.goBack")}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
