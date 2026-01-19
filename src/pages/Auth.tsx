import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { ArrowLeft, Mail, Lock, User, Apple } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Auth() {
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, signInWithApple, user } = useAuth();
  const isIOS = Capacitor.getPlatform() === 'ios';
  const { notify } = useNotificationModal();
  const navigate = useNavigate();

  const signUpSchema = z.object({
    email: z.string().email(t("auth.invalidCredentials")),
    password: z.string().min(6, t("auth.passwordTooShort")),
    nickname: z.string().min(2, t("auth.usernameTooShort")).max(20, t("auth.usernameTooShort")),
  });

  const signInSchema = z.object({
    email: z.string().email(t("auth.invalidCredentials")),
    password: z.string().min(1, t("auth.passwordRequired")),
  });

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (isSignUp) {
        const result = signUpSchema.safeParse({ email, password, nickname });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, nickname);
        if (error) {
          if (error.message.includes("already registered")) {
            notify.error(t("auth.alreadyHaveAccount"), { description: t("auth.invalidCredentials") });
          } else {
            notify.error(t("common.error"), { description: error.message });
          }
        } else {
          notify.success(t("common.welcome"), { description: t("auth.accountCreated"), icon: "🎉" });
          navigate("/");
        }
      } else {
        const result = signInSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          notify.error(t("common.error"), { description: t("auth.invalidCredentials") });
        } else {
          notify.success(t("auth.welcomeBack"), { description: t("auth.signIn"), icon: "👋" });
          navigate("/");
        }
      }
    } catch (err) {
      notify.error(t("common.error"), { description: t("errors.generic") });
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) {
        if (!error.message?.includes('cancelled')) {
          notify.error(t("common.error"), { description: error.message });
        }
      } else {
        notify.success(t("common.welcome"), { description: t("auth.signIn"), icon: "🍎" });
        navigate("/");
      }
    } catch (err) {
      notify.error(t("common.error"), { description: t("errors.generic") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-background via-background to-primary/10">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>{t("common.back")}</span>
      </motion.button>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isSignUp ? t("auth.createAccount") : t("auth.welcomeBack")}
          </h1>
          <p className="text-foreground/80">
            {isSignUp
              ? t("onboarding.welcomeSubtitle")
              : t("onboarding.startAdventure")}
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="w-full space-y-4"
        >
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-foreground">{t("auth.username")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="nickname"
                  type="text"
                  placeholder={t("auth.usernamePlaceholder")}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.nickname && (
                <p className="text-sm text-destructive">{errors.nickname}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">{t("help.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">{t("auth.password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <ChunkyButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-6"
            disabled={loading}
          >
            {loading ? t("common.loading") : isSignUp ? t("auth.createAccount") : t("auth.signIn")}
          </ChunkyButton>

          {/* Sign in with Apple - iOS only */}
          {isIOS && (
            <>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t("common.or") || "or"}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              <ChunkyButton
                type="button"
                variant="secondary"
                size="lg"
                className="w-full mt-4 bg-foreground text-background hover:bg-foreground/90"
                onClick={handleAppleSignIn}
                disabled={loading}
              >
                <Apple className="w-5 h-5 mr-2" />
                Sign in with Apple
              </ChunkyButton>
            </>
          )}
        </motion.form>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center"
        >
          <p className="text-foreground/80">
            {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrors({});
              }}
              className="text-primary font-semibold hover:underline"
            >
              {isSignUp ? t("auth.signIn") : t("auth.signUp")}
            </button>
          </p>
        </motion.div>

        {/* Guest option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4"
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-foreground/60 hover:text-foreground transition-colors"
          >
            {t("modals.continueAsGuest")} →
          </button>
        </motion.div>
      </div>
    </div>
  );
}