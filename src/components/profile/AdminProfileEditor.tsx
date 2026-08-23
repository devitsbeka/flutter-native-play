import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface AdminProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentNickname: string;
  currentCountryCode: string | null;
  currentAvatarUrl: string | null;
  currentAnimatedAvatarUrl: string | null;
  onSaved: () => void;
}

export function AdminProfileEditor({
  open,
  onOpenChange,
  userId,
  currentNickname,
  currentCountryCode,
  currentAvatarUrl,
  currentAnimatedAvatarUrl,
  onSaved,
}: AdminProfileEditorProps) {
  const [nickname, setNickname] = useState(currentNickname);
  const [countryCode, setCountryCode] = useState(currentCountryCode || "");
  const [animatedAvatarUrl, setAnimatedAvatarUrl] = useState(currentAnimatedAvatarUrl || "");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  // Sync state when props change (e.g., reopening with different user)
  useEffect(() => {
    if (open) {
      setNickname(currentNickname);
      setCountryCode(currentCountryCode || "");
      setAnimatedAvatarUrl(currentAnimatedAvatarUrl || "");
    }
  }, [open, currentNickname, currentCountryCode, currentAnimatedAvatarUrl]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string | null> = {
        nickname,
        country_code: countryCode || null,
        animated_avatar_url: animatedAvatarUrl || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(t("extra.adminProfileUpdated"));
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error(t("extra.adminProfileError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm z-[250]" style={{ zIndex: 250 }}>
        <DialogHeader>
          <DialogTitle>{t("extra.adminEditProfile")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("extra.adminNicknameLabel")}</Label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("extra.adminNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("extra.adminCountryCodeLabel")}</Label>
            <Input
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="GE"
              maxLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("extra.adminAnimatedAvatarLabel")}</Label>
            <Input
              value={animatedAvatarUrl}
              onChange={(e) => setAnimatedAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("extra.adminCancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !nickname.trim()}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("extra.adminSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
