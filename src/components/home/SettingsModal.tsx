import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Lock, Globe, ChevronRight, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsView = "main" | "editName" | "changePassword" | "language";

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, profile, fetchProfile } = useAuth();
  const { notify } = useNotificationModal();
  const { language, setLanguage, t, languages } = useLanguage();
  const [view, setView] = useState<SettingsView>("main");
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Update nickname when profile changes
  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname);
    }
  }, [profile?.nickname]);

  const handleBack = () => {
    setView("main");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleClose = () => {
    handleBack();
    onClose();
  };

  const handleSaveNickname = async () => {
    if (!user || !nickname.trim()) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: nickname.trim() })
        .eq("user_id", user.id);

      if (error) throw error;
      
      if (user) await fetchProfile(user.id);
      notify.success(t("settings.nameChanged"), { icon: "✅" });
      handleBack();
    } catch (error: any) {
      notify.error(t("errors.generic"), { description: error.message });
    } finally {
      setIsLoading(false);
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
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      notify.success(t("settings.passwordChanged"), { icon: "🔐" });
      handleBack();
    } catch (error: any) {
      notify.error(t("errors.generic"), { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    // Force a page reload to apply all translations
    window.location.reload();
  };

  const currentLang = languages.find(l => l.code === language);

  const settingsItems = [
    {
      icon: User,
      label: t("settings.editName"),
      sublabel: profile?.nickname || t("game.you"),
      action: () => {
        setNickname(profile?.nickname || "");
        setView("editName");
      },
    },
    {
      icon: Lock,
      label: t("settings.changePassword"),
      sublabel: t("auth.password"),
      action: () => setView("changePassword"),
    },
    {
      icon: Globe,
      label: t("settings.language"),
      sublabel: currentLang?.nativeName || "ქართული",
      action: () => setView("language"),
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 m-auto w-[calc(100%-32px)] max-w-[360px] h-fit max-h-[85vh] bg-background rounded-3xl z-[60] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-border">
              <button
                onClick={view === "main" ? handleClose : handleBack}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
              >
                {view === "main" ? (
                  <X className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
                )}
              </button>

              <h2 className="text-center font-display text-lg font-bold text-foreground">
                {view === "main" && t("settings.title")}
                {view === "editName" && t("settings.editName")}
                {view === "changePassword" && t("settings.changePassword")}
                {view === "language" && t("settings.language")}
              </h2>
            </div>

            {/* Content */}
            <div className="p-4">
              <AnimatePresence mode="wait">
                {view === "main" && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-2"
                  >
                    {settingsItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-foreground">{item.label}</p>
                          <p className="text-sm text-muted-foreground">{item.sublabel}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    ))}
                  </motion.div>
                )}

                {view === "editName" && (
                  <motion.div
                    key="editName"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        {t("settings.editName")}
                      </label>
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder={t("auth.usernamePlaceholder")}
                        className="h-12 rounded-xl"
                        maxLength={20}
                      />
                    </div>
                    <ChunkyButton
                      variant="mint"
                      size="lg"
                      className="w-full"
                      onClick={handleSaveNickname}
                      disabled={isLoading || !nickname.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        t("common.save")
                      )}
                    </ChunkyButton>
                  </motion.div>
                )}

                {view === "changePassword" && (
                  <motion.div
                    key="changePassword"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        {t("settings.newPassword")}
                      </label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("auth.passwordPlaceholder")}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        {t("settings.confirmPassword")}
                      </label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("auth.passwordPlaceholder")}
                        className="h-12 rounded-xl"
                      />
                    </div>
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
                )}

                {view === "language" && (
                  <motion.div
                    key="language"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-2"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                          language === lang.code
                            ? "bg-primary/10 ring-2 ring-primary"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <div className="flex-1 text-left">
                          <span className="font-medium text-foreground block">
                            {lang.nativeName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {lang.name}
                          </span>
                        </div>
                        {language === lang.code && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
