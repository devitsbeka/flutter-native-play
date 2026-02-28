import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { GameModal } from "@/components/ui/game-modal";
import { translateErrorMessage } from "@/utils/errorTranslations";

interface ChangeNameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangeNameModal({ isOpen, onClose }: ChangeNameModalProps) {
  const { user, profile, fetchProfile } = useAuth();
  const { notify } = useNotificationModal();
  const { t } = useLanguage();

  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && profile?.nickname) {
      setNickname(profile.nickname);
    }
  }, [isOpen, profile?.nickname]);

  const handleSave = async () => {
    if (!user || !nickname.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: nickname.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchProfile(user.id);
      notify.success(t("settings.nameChanged"), { icon: "✅" });
      onClose();
    } catch (error: any) {
      notify.error(t("errors.generic"), { description: translateErrorMessage(error.message) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.editName")}
      hideFooter
    >
      <div className="space-y-4">
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t("auth.usernamePlaceholder")}
          className="h-12 rounded-xl"
          maxLength={20}
          autoFocus
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
      </div>
    </GameModal>
  );
}
