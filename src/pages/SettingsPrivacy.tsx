import { toastIcon, ICON_URLS } from "@/lib/toast-icons";
import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import { useState } from "react";
import { motion } from "framer-motion";
import { BlockedPlayersSection } from "@/components/social/BlockedPlayersSection";
import { useNavigate } from "react-router-dom";
import { Shield, FileText, Download, Trash2, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AmbientBlobBackdrop, AMBIENT_HEADER_CLASS } from "@/components/shared/AmbientBlobBackdrop";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_SELECT_COLUMNS } from "@/integrations/supabase/profileColumns";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { translateErrorMessage } from "@/utils/errorTranslations";

export default function SettingsPrivacy() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { notify } = useNotificationModal();
  const { t } = useLanguage();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_COLUMNS)
        .eq("user_id", user.id)
        .single();

      const exportData = {
        email: user.email,
        profile,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mytrivia-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      notify.success(t("settings.dataExported"), { icon: toastIcon(ICON_URLS.box) });
    } catch (error: any) {
      notify.error(t("errors.generic"), { description: translateErrorMessage(error.message) });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // The edge function, not a profiles delete.
      //
      // This used to run `profiles.delete()` and sign out, which left the auth
      // user intact — you could sign straight back in — along with every
      // related row: game plays, friendships, chat messages, push tokens,
      // subscriptions. The account was not deleted in any sense a reviewer or
      // a data-protection request would accept, and this is the flow they
      // reach, since /delete-account was not linked from anywhere.
      //
      // delete-user-account removes the related tables and the auth user
      // itself, under the service role.
      const { error } = await supabase.functions.invoke("delete-user-account");
      if (error) throw error;

      await signOut();
      navigate("/");
      notify.success(t("settings.accountDeleted"), { icon: toastIcon(triviaBuzzer) });
    } catch (error: any) {
      notify.error(t("errors.generic"), { description: translateErrorMessage(error.message) });
    } finally {
      setIsDeleting(false);
    }
  };

  const privacyItems = [
    {
      icon: FileText,
      label: t("settings.privacyPolicy"),
      route: "/privacy-policy",
      color: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      icon: FileText,
      label: t("settings.termsOfService"),
      route: "/terms",
      color: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <div className="relative h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-hidden">
      <AmbientBlobBackdrop />
      {/* The page owns its scrolling (CLAUDE.md 4b); the backdrop stays put
          beneath it. */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
      <PageHeader title={t("menu.privacy")} className={AMBIENT_HEADER_CLASS} />

      <div className="p-4 pb-12 space-y-6 max-w-[700px] md:max-w-[600px] mx-auto">
        {/* Policy Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          {privacyItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <span className="flex-1 text-left font-medium text-foreground">
                  {item.label}
                </span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            );
          })}
        </motion.div>

        {/* People you've blocked, and the way back. */}
        {user && <BlockedPlayersSection />}

        {/* Data Actions */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-lg font-display font-bold text-foreground">
              {t("settings.dataManagement")}
            </h2>

            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                {isExporting ? (
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                ) : (
                  <Download className="w-6 h-6 text-amber-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground block">
                  {t("settings.exportData")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("settings.exportDataDescription")}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-destructive/30 hover:bg-destructive/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-medium text-destructive block">
                    {t("settings.deleteAccount")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("settings.deleteAccountDescription")}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-destructive/50" />
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-destructive/10 rounded-2xl p-6 border border-destructive/30 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                  <h3 className="font-semibold text-destructive">
                    {t("settings.deleteConfirmTitle")}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("settings.deleteConfirmMessage")}
                </p>
                <div className="flex gap-3">
                  <ChunkyButton
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {t("common.cancel")}
                  </ChunkyButton>
                  <ChunkyButton
                    variant="danger"
                    size="lg"
                    className="flex-1"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      t("settings.deleteAccount")
                    )}
                  </ChunkyButton>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
      </div>
    </div>
  );
}
