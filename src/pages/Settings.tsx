import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { MainLayout } from "@/components/layout/MainLayout";
import { Mail, Globe, User, Lock, HelpCircle, Shield, Trash2, ChevronRight, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { EmailEditModal } from "@/components/profile/EmailEditModal";
import { CountrySelectModal } from "@/components/profile/CountrySelectModal";
import { countryName, countryFlag } from "@/utils/countryName";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { currentBuildLabel, checkForUpdateNow } from "@/hooks/useFreshBuildGuard";
import { NotificationSettingsRow } from "@/components/settings/NotificationSettingsRow";
import { RestorePurchasesRow } from "@/components/settings/RestorePurchasesRow";

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, fetchProfile } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);

  // Which build this device is running, and a way to pull a newer one
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "current">("idle");


  // Name change states
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isNameLoading, setIsNameLoading] = useState(false);

  // Password change states
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Get country info
  const getCountryInfo = (code: string | null) => {
    if (!code) return { name: t("profile.notSet"), flag: "🌍" };
    return {
      name: countryName(code, language, code.toUpperCase()),
      flag: countryFlag(code),
    };
  };

  const countryInfo = getCountryInfo(profile?.country_code || null);

  const handleSaveName = async () => {
    if (!newName.trim() || !user) return;
    
    setIsNameLoading(true);
    try {
      await updateProfile({ nickname: newName.trim() });
      await fetchProfile(user.id);
      toast({
        title: t("extra.nameChangedSuccess"),
        description: t("extra.nameChangedDesc"),
      });
      setNewName("");
      setIsNameOpen(false);
    } catch (error) {
      toast({
        title: t("extra.errorTitle"),
        description: t("extra.nameChangeFailed"),
        variant: "destructive",
      });
    } finally {
      setIsNameLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: t("extra.errorTitle"), description: t("extra.passwordMismatchError"), variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t("extra.errorTitle"), description: t("extra.passwordMinError"), variant: "destructive" });
      return;
    }
    setIsPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: t("extra.passwordChangedSuccess"), description: t("extra.passwordChangedDesc") });
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordOpen(false);
    } catch (error) {
      toast({ title: t("extra.errorTitle"), description: t("extra.passwordChangeFailed"), variant: "destructive" });
    } finally {
      setIsPasswordLoading(false);
    }
  };


  return (
    <MainLayout showPlayButton={false}>
      <div className="min-h-screen bg-background">
        <PageHeader title={t("settings.title")} />

        <div className="p-4 pb-12 space-y-2 max-w-[700px] md:max-w-[600px] mx-auto">
          {/* Email Row */}
          {user && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              onClick={() => setShowEmailModal(true)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground block">{t("profile.email")}</span>
                <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
                  {user.email}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {/* Country Row */}
          {profile && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => setShowCountryModal(true)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground block">{t("profile.country")}</span>
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="text-lg">{countryInfo.flag}</span>
                  {countryInfo.name}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}


          {/* Divider */}
          <div className="h-px bg-border/50 my-4" />

          {/* Name Change - Collapsible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Collapsible open={isNameOpen} onOpenChange={setIsNameOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <span className="flex-1 text-left font-medium text-foreground">
                    {t("settings.editName")}
                  </span>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isNameOpen ? 'rotate-90' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <div className="mt-3 space-y-3 bg-secondary/30 rounded-xl p-4">
                  <Input
                    placeholder={profile?.nickname || t("extra.enterNewName")}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-background"
                  />
                  <Button 
                    onClick={handleSaveName} 
                    disabled={isNameLoading || !newName.trim()}
                    className="w-full"
                  >
                    {isNameLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {t("extra.save")}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>

          {/* Password Change - Collapsible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Collapsible open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <span className="flex-1 text-left font-medium text-foreground">
                    {t("settings.changePassword")}
                  </span>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isPasswordOpen ? 'rotate-90' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <div className="mt-3 space-y-3 bg-secondary/30 rounded-xl p-4">
                  <Input
                    type="password"
                    placeholder={t("extra.newPasswordPlaceholder")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    type="password"
                    placeholder={t("extra.repeatPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background"
                  />
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={isPasswordLoading || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {isPasswordLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {t("extra.save")}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>

          {/* Notifications — the only place the permission prompt is asked
              for. Above Help because it is a setting rather than a link out. */}
          <NotificationSettingsRow />

          {/* Restore purchases. Apple requires this to exist and a reviewer
              looks for it here; it is also the only repair a player has after
              a reinstall or a new device. */}
          <RestorePurchasesRow />

          {/* Help */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/support")}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-blue-500" />
            </div>
            <span className="flex-1 text-left font-medium text-foreground">
              {t("menu.help")}
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Privacy */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => navigate("/settings/privacy")}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <span className="flex-1 text-left font-medium text-foreground">
              {t("menu.privacy")}
            </span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {/* Delete Account */}
          {user && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => navigate("/settings/privacy")}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-destructive/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex flex-col items-start flex-1">
                <span className="text-left font-medium text-destructive">
                  {t("settings.deleteAccount")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("settings.deleteAccountDescription")}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-destructive/50" />
            </motion.button>
          )}

          {/* Which build this device is running. Compare it with
              mytrivia.io/version.json to settle "I'm not seeing the update"
              in one glance; tapping pulls a newer build if there is one. */}
          <button
            type="button"
            onClick={async () => {
              setUpdateState("checking");
              const result = await checkForUpdateNow();
              // "updating" reloads the page, so only the other case lands here
              setUpdateState(result === "current" ? "current" : "checking");
            }}
            className="mx-auto mt-2 block px-3 py-2 text-center text-xs text-muted-foreground"
          >
            {updateState === "checking"
              ? t("settings.checkingForUpdate")
              : updateState === "current"
                ? `${t("settings.upToDate")} · ${currentBuildLabel()}`
                : `${t("settings.buildLabel")} ${currentBuildLabel()}`}
          </button>
        </div>

        {/* Modals */}
        {user && (
          <EmailEditModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            currentEmail={user.email || ""}
          />
        )}

        {profile && (
          <CountrySelectModal
            isOpen={showCountryModal}
            onClose={() => setShowCountryModal(false)}
            currentCountryCode={profile.country_code}
          />
        )}
      </div>
    </MainLayout>
  );
}
