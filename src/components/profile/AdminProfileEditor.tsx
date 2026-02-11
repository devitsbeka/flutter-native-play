import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      toast.success("პროფილი განახლდა");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("შეცდომა პროფილის განახლებისას");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[240]" />
        <div className="fixed inset-0 z-[250] flex items-center justify-center">
          <DialogContent className="relative max-w-sm" style={{ position: 'relative', transform: 'none', left: 'auto', top: 'auto' }}>
            <DialogHeader>
              <DialogTitle>პროფილის რედაქტირება</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>სახელი (Nickname)</Label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="სახელი"
                />
              </div>

              <div className="space-y-2">
                <Label>ქვეყნის კოდი (Country Code)</Label>
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  placeholder="GE"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label>ანიმირებული ავატარი (URL)</Label>
                <Input
                  value={animatedAvatarUrl}
                  onChange={(e) => setAnimatedAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                გაუქმება
              </Button>
              <Button onClick={handleSave} disabled={saving || !nickname.trim()}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                შენახვა
              </Button>
            </DialogFooter>
          </DialogContent>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
