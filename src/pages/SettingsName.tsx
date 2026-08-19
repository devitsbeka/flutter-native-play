import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { translateErrorMessage } from "@/utils/errorTranslations";
import { containsBlockedText } from "@/utils/contentFilter";

export default function SettingsName() {
  const { user, profile, fetchProfile } = useAuth();
  const { notify } = useNotificationModal();
  const { t } = useLanguage();

  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname);
    }
  }, [profile?.nickname]);

  const handleSave = async () => {
    if (!user || !nickname.trim()) return;

    // The display name is public (feed, leaderboards, rooms) — screen it.
    // This path previously wrote nickname.trim() with no validation at all.
    if (containsBlockedText(nickname)) {
      notify.error(t("extra.textNotAllowed"));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: nickname.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      if (user) await fetchProfile(user.id);
      notify.success(t("settings.nameChanged"), { icon: "✅" });
    } catch (error: any) {
      notify.error(t("errors.generic"), { description: translateErrorMessage(error.message) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <PageHeader title={t("settings.editName")} />

      <div className="p-4 pb-12 space-y-6 max-w-[700px] md:max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("settings.editName")}</h3>
              <p className="text-sm text-muted-foreground">{t("extra.settingsNameSubtitle")}</p>
            </div>
          </div>

          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t("auth.usernamePlaceholder")}
            className="h-12 rounded-xl"
            maxLength={20}
          />

          <ChunkyButton
            variant="mint"
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={isLoading || !nickname.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("common.save")
            )}
          </ChunkyButton>
        </motion.div>
      </div>
    </div>
  );
}
