import { useState, useEffect } from "react";
import { User, Lock, Loader2, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { GameModal } from "@/components/ui/game-modal";
import { translateErrorMessage } from "@/utils/errorTranslations";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, profile, fetchProfile } = useAuth();
  const { notify } = useNotificationModal();
  const { t, language, setLanguage, languages, currentLanguage } = useLanguage();

  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isNicknameLoading, setIsNicknameLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Update nickname when profile changes
  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname);
    }
  }, [profile?.nickname]);

  // Reset password fields when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen]);

  const handleSaveNickname = async () => {
    if (!user || !nickname.trim()) return;
    
    setIsNicknameLoading(true);
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
      setIsNicknameLoading(false);
    }
  };

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
    
    setIsPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      notify.success(t("settings.passwordChanged"), { icon: "🔐" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      notify.error(t("errors.generic"), { description: translateErrorMessage(error.message) });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.title")}
      hideFooter
    >
      <div className="space-y-6">
        {/* Language Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{t("settings.language")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {languages.filter(l => ['ka', 'en', 'fr', 'de', 'es', 'it', 'pt'].includes(l.code)).map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  language === lang.code
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="truncate">{lang.nativeName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Edit Name Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{t("settings.editName")}</h3>
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
            onClick={handleSaveNickname}
            disabled={isNicknameLoading || !nickname.trim()}
          >
            {isNicknameLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("common.save")
            )}
          </ChunkyButton>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Change Password Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{t("settings.changePassword")}</h3>
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
            disabled={isPasswordLoading || !newPassword || !confirmPassword}
          >
            {isPasswordLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("settings.changePassword")
            )}
          </ChunkyButton>
        </div>
      </div>
    </GameModal>
  );
}
