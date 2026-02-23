import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { User, Lock, HelpCircle, Shield, ChevronRight, ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { translateErrorMessage } from "@/utils/errorTranslations";

export function DetailsSettingsMenu() {
  const navigate = useNavigate();
  const { profile, fetchProfile, signOut } = useAuth();
  const { notify } = useNotificationModal();
  const { t } = useLanguage();
  
  // Name change state
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [isNameLoading, setIsNameLoading] = useState(false);
  
  // Password change state
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const handleSaveName = async () => {
    if (!nickname.trim()) {
      notify.error("შეცდომა", "გთხოვთ შეიყვანოთ სახელი");
      return;
    }
    
    if (!profile?.user_id) {
      notify.error("შეცდომა", "მომხმარებელი ვერ მოიძებნა");
      return;
    }
    
    setIsNameLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: nickname.trim() })
        .eq("user_id", profile.user_id);
      
      if (error) throw error;
      
      await fetchProfile(profile.user_id);
      notify.success("წარმატება", "სახელი წარმატებით შეიცვალა");
      setIsNameOpen(false);
    } catch (error: any) {
      notify.error("შეცდომა", translateErrorMessage(error.message));
    } finally {
      setIsNameLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      notify.error("შეცდომა", "გთხოვთ შეავსოთ ყველა ველი");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      notify.error("შეცდომა", "პაროლები არ ემთხვევა");
      return;
    }
    
    if (newPassword.length < 6) {
      notify.error("შეცდომა", "პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს");
      return;
    }
    
    setIsPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      notify.success("წარმატება", "პაროლი წარმატებით შეიცვალა");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordOpen(false);
    } catch (error: any) {
      notify.error("შეცდომა", translateErrorMessage(error.message));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/30">
      {/* Name Change - Collapsible */}
      <Collapsible open={isNameOpen} onOpenChange={setIsNameOpen}>
        <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50 border-b border-border/20">
          <div className="p-2 rounded-full bg-purple-500/10">
            <User className="w-4 h-4 text-purple-500" />
          </div>
          <span className="flex-1 text-foreground text-left">სახელის შეცვლა</span>
          {isNameOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="border-b border-border/20">
          <div className="px-4 py-4 space-y-3 bg-secondary/20">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ახალი სახელი"
              className="bg-background/50"
            />
            <ChunkyButton
              onClick={handleSaveName}
              disabled={isNameLoading}
              className="w-full"
              size="sm"
            >
              {isNameLoading ? t("common.loading") : t("common.save")}
            </ChunkyButton>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Password Change - Collapsible */}
      <Collapsible open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50 border-b border-border/20">
          <div className="p-2 rounded-full bg-purple-500/10">
            <Lock className="w-4 h-4 text-purple-500" />
          </div>
          <span className="flex-1 text-foreground text-left">{t("settings.changePassword")}</span>
          {isPasswordOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="border-b border-border/20">
          <div className="px-4 py-4 space-y-3 bg-secondary/20">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("settings.newPassword")}
              className="bg-background/50"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("settings.confirmPassword")}
              className="bg-background/50"
            />
            <ChunkyButton
              onClick={handleChangePassword}
              disabled={isPasswordLoading}
              className="w-full"
              size="sm"
            >
              {isPasswordLoading ? t("common.loading") : t("extra.changeBtn")}
            </ChunkyButton>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Help - Navigate */}
      <button
        onClick={() => navigate("/support")}
        className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50 border-b border-border/20"
      >
        <div className="p-2 rounded-full bg-blue-500/10">
          <HelpCircle className="w-4 h-4 text-blue-500" />
        </div>
        <span className="flex-1 text-foreground text-left">დახმარება</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Privacy - Navigate */}
      <button
        onClick={() => navigate("/settings/privacy")}
        className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50 border-b border-border/20"
      >
        <div className="p-2 rounded-full bg-amber-500/10">
          <Shield className="w-4 h-4 text-amber-500" />
        </div>
        <span className="flex-1 text-foreground text-left">კონფიდენციალურობა</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50"
      >
        <div className="p-2 rounded-full bg-red-500/10">
          <LogOut className="w-4 h-4 text-red-500" />
        </div>
        <span className="flex-1 text-red-500 text-left">გასვლა</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
