import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { translateErrorMessage } from "@/utils/errorTranslations";

export default function SettingsPassword() {
  const { notify } = useNotificationModal();
  const { t } = useLanguage();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      notify.error(t("settings.passwordMismatch"));
      return;
    }

    if (newPassword !== confirmPassword) {
      notify.error(t("settings.passwordMismatch"));
      return;
    }

    if (newPassword.length < 6) {
      notify.error(t("auth.passwordTooShort"));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      notify.success(t("settings.passwordChanged"), { icon: "🔐" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      notify.error(t("errors.generic"), { description: translateErrorMessage(error.message) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <PageHeader title={t("settings.changePassword")} />

      <div className="p-4 pb-12 space-y-6 max-w-[700px] md:max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("settings.changePassword")}</h3>
              <p className="text-sm text-muted-foreground">{t("extra.settingsPasswordSubtitle")}</p>
            </div>
          </div>

          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("settings.newPassword")}
            className="h-12 rounded-xl"
          />

          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("settings.confirmPassword")}
            className="h-12 rounded-xl"
          />

          <ChunkyButton
            variant="mint"
            size="lg"
            className="w-full"
            onClick={handleChangePassword}
            disabled={isLoading || !newPassword || !confirmPassword}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("settings.changePassword")
            )}
          </ChunkyButton>
        </motion.div>
      </div>
    </div>
  );
}
