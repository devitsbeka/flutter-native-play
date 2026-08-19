import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle, ShieldQuestion, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { supabase } from "@/integrations/supabase/client";

type Phase = "checking" | "form" | "invalid" | "done";

/**
 * Where the password-reset email's link lands.
 *
 * resetPasswordForEmail (ForgotPassword's email branch) redirects here with a
 * recovery token in the URL; the supabase client on web has
 * detectSessionInUrl on, so by the time this mounts the recovery session is
 * either established or the link was bad. The page is excluded from
 * universal links on purpose — it must open in the browser, where the token
 * in the URL is picked up, not in the app.
 */
export default function ResetPassword() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { notify } = useNotificationModal();

  const [phase, setPhase] = useState<Phase>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The URL token exchange is asynchronous: poll briefly for the session
    // instead of failing the instant the page mounts.
    (async () => {
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setPhase("form");
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!cancelled) setPhase("invalid");
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPhase((p) => (p === "checking" || p === "invalid" ? "form" : p));
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      notify.error(t("auth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      notify.error(t("settings.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        notify.error(t("common.error"), { description: error.message });
        return;
      }
      setPhase("done");
      notify.success(t("forgotPassword.passwordChanged"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto flex flex-col p-6 bg-gradient-to-b from-background via-background to-primary/10 relative z-10">
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {phase === "done" ? (
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            ) : (
              <ShieldQuestion className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {phase === "done" ? t("forgotPassword.success") : t("forgotPassword.setNewPassword")}
          </h1>
          <p className="text-foreground/70 text-sm">
            {phase === "invalid" && t("forgotPassword.resetLinkInvalid")}
            {phase === "done" && t("forgotPassword.successMessage")}
          </p>
        </motion.div>

        {phase === "checking" && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {phase === "invalid" && (
          <ChunkyButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => navigate("/forgot-password")}
          >
            {t("forgotPassword.title")}
          </ChunkyButton>
        )}

        {phase === "form" && (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">
                {t("settings.newPassword")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                {t("settings.confirmPassword")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ChunkyButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-6"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? t("common.loading") : t("forgotPassword.changePassword")}
            </ChunkyButton>
          </form>
        )}

        {phase === "done" && (
          <ChunkyButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => navigate("/")}
          >
            {t("common.continue")}
          </ChunkyButton>
        )}
      </div>
    </div>
  );
}
