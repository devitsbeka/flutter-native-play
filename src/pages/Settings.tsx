import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { MainLayout } from "@/components/layout/MainLayout";
import { Mail, Globe, User, Lock, HelpCircle, Shield, LogOut, ChevronRight, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { EmailEditModal } from "@/components/profile/EmailEditModal";
import { CountrySelectModal } from "@/components/profile/CountrySelectModal";
import { countryCoordinates } from "@/lib/countryCoordinates";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, signOut, updateProfile, fetchProfile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);

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
    const countryData = countryCoordinates[code.toLowerCase()];
    const flag = code.toUpperCase() === 'UK' ? '🇬🇧' : 
      code.toUpperCase().split('').map(char => 
        String.fromCodePoint(127397 + char.charCodeAt(0))
      ).join('');
    return { 
      name: countryData?.name || code.toUpperCase(), 
      flag 
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
        title: "სახელი შეიცვალა",
        description: "შენი სახელი წარმატებით განახლდა",
      });
      setNewName("");
      setIsNameOpen(false);
    } catch (error) {
      toast({
        title: "შეცდომა",
        description: "სახელის შეცვლა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsNameLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "შეცდომა",
        description: "პაროლები არ ემთხვევა",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "შეცდომა",
        description: "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო",
        variant: "destructive",
      });
      return;
    }

    setIsPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "პაროლი შეიცვალა",
        description: "შენი პაროლი წარმატებით განახლდა",
      });
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordOpen(false);
    } catch (error) {
      toast({
        title: "შეცდომა",
        description: "პაროლის შეცვლა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
                    placeholder={profile?.nickname || "შეიყვანე ახალი სახელი"}
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
                    შენახვა
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
                    placeholder="ახალი პაროლი"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    type="password"
                    placeholder="გაიმეორე პაროლი"
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
                    შენახვა
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>

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

          {/* Sign Out */}
          {user && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-destructive/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-destructive" />
              </div>
              <span className="flex-1 text-left font-medium text-destructive">
                {t("menu.signOut")}
              </span>
              <ChevronRight className="w-5 h-5 text-destructive/50" />
            </motion.button>
          )}
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
