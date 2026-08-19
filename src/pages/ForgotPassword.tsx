import { toastIcon, ICON_URLS } from "@/lib/toast-icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { ArrowLeft, User, Lock, ShieldQuestion, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/config/site";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Security questions with IDs
const SECURITY_QUESTIONS = [
  { id: 1, ka: "შენი პირველი შინაური ცხოველის სახელი?", en: "Your first pet's name?" },
  { id: 2, ka: "რომელ ქალაქში დაიბადე?", en: "Which city were you born in?" },
  { id: 3, ka: "შენი საყვარელი მასწავლებლის სახელი?", en: "Your favorite teacher's name?" },
  { id: 4, ka: "შენი საყვარელი ფილმი?", en: "Your favorite movie?" },
  { id: 5, ka: "შენი საყვარელი სპორტული გუნდი?", en: "Your favorite sports team?" },
];

type Step = "username" | "question" | "password" | "success" | "emailSent";

export default function ForgotPassword() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { notify } = useNotificationModal();

  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [securityQuestionId, setSecurityQuestionId] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Look up the identifier. Two account kinds, two recovery paths:
  //
  // - A real email (the main Auth screen's signup) gets Supabase's standard
  //   email reset. The security-question flow below cannot serve them — it
  //   rewrites whatever is typed into a @mytrivia.local pseudo-email, so an
  //   email account always came back "user not found" and had NO recovery
  //   at all, which is an app-completeness rejection on its own.
  // - A username account (onboarding signup) keeps the security-question
  //   flow, since a pseudo-email can't receive mail.
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    if (username.includes("@")) {
      setLoading(true);
      try {
        // The link lands on the website's /reset-password page (excluded
        // from universal links, so it opens in the browser where the
        // recovery token in the URL is picked up automatically).
        await supabase.auth.resetPasswordForEmail(username.trim().toLowerCase(), {
          redirectTo: siteUrl("/reset-password"),
        });
      } catch {
        /* deliberate: the response must not reveal whether the email exists */
      } finally {
        setLoading(false);
      }
      setStep("emailSent");
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke("reset-password-with-security", {
        body: { action: "get-question", username: username.trim().toLowerCase() },
      });

      if (response.error) throw new Error(response.error.message);
      
      const data = response.data;
      if (data.error) {
        notify.error(t("common.error"), { description: data.error });
        return;
      }

      if (!data.security_question_id) {
        notify.error(t("forgotPassword.noSecurityQuestion"), { 
          description: t("forgotPassword.contactSupport") 
        });
        return;
      }

      setSecurityQuestionId(data.security_question_id);
      setAttemptsRemaining(data.attempts_remaining || 3);
      setStep("question");
    } catch (err: any) {
      notify.error(t("common.error"), { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify security answer
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setLoading(true);
    try {
      const response = await supabase.functions.invoke("reset-password-with-security", {
        body: { 
          action: "verify-answer", 
          username: username.trim().toLowerCase(),
          answer: answer.trim().toLowerCase(),
        },
      });

      if (response.error) throw new Error(response.error.message);
      
      const data = response.data;
      if (data.error) {
        setAttemptsRemaining(data.attempts_remaining || 0);
        if (data.attempts_remaining === 0) {
          notify.error(t("forgotPassword.tooManyAttempts"), { 
            description: t("forgotPassword.tryAgainLater") 
          });
          setStep("username");
          setAnswer("");
        } else {
          notify.error(t("forgotPassword.wrongAnswer"), { 
            description: t("forgotPassword.attemptsRemaining", { count: data.attempts_remaining }) 
          });
        }
        return;
      }

      if (data.verified) {
        setStep("password");
      }
    } catch (err: any) {
      notify.error(t("common.error"), { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
      const response = await supabase.functions.invoke("reset-password-with-security", {
        body: { 
          action: "reset-password", 
          username: username.trim().toLowerCase(),
          answer: answer.trim().toLowerCase(),
          new_password: newPassword,
        },
      });

      if (response.error) throw new Error(response.error.message);
      
      const data = response.data;
      if (data.error) {
        notify.error(t("common.error"), { description: data.error });
        return;
      }

      if (data.success) {
        setStep("success");
        notify.success(t("forgotPassword.passwordChanged"), { icon: toastIcon(ICON_URLS.partyPopper) });
      }
    } catch (err: any) {
      notify.error(t("common.error"), { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const getQuestionText = (questionId: number) => {
    const question = SECURITY_QUESTIONS.find(q => q.id === questionId);
    return question ? (language === "ka" ? question.ka : question.en) : "";
  };

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto flex flex-col p-6 bg-gradient-to-b from-background via-background to-primary/10 relative z-10">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => (step === "success" || step === "emailSent" ? navigate("/auth") : navigate(-1))}
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
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {step === "success" ? (
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            ) : (
              <ShieldQuestion className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {step === "success"
              ? t("forgotPassword.success")
              : step === "emailSent"
                ? t("forgotPassword.emailSentTitle")
                : t("forgotPassword.title")}
          </h1>
          <p className="text-foreground/70 text-sm">
            {step === "username" && t("forgotPassword.enterIdentifier")}
            {step === "question" && t("forgotPassword.answerQuestion")}
            {step === "password" && t("forgotPassword.setNewPassword")}
            {step === "success" && t("forgotPassword.successMessage")}
            {step === "emailSent" && t("forgotPassword.emailSentDesc")}
          </p>
        </motion.div>

        {/* Step indicator — only for the security-question track */}
        {step !== "success" && step !== "emailSent" && (
          <div className="flex items-center gap-2 mb-6">
            {["username", "question", "password"].map((s, i) => (
              <div
                key={s}
                className={`w-8 h-1 rounded-full transition-colors ${
                  ["username", "question", "password"].indexOf(step) >= i
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Username */}
          {step === "username" && (
            <motion.form
              key="username"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleUsernameSubmit}
              className="w-full space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">
                  {t("forgotPassword.identifierLabel")}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder={t("auth.usernamePlaceholder")}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <ChunkyButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-6"
                disabled={loading || !username.trim()}
              >
                {loading ? t("common.loading") : t("common.continue")}
              </ChunkyButton>
            </motion.form>
          )}

          {/* Step 2: Security Question */}
          {step === "question" && securityQuestionId && (
            <motion.form
              key="question"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleAnswerSubmit}
              className="w-full space-y-4"
            >
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                <p className="text-sm text-muted-foreground mb-1">
                  {t("forgotPassword.securityQuestion")}
                </p>
                <p className="font-medium text-foreground">
                  {getQuestionText(securityQuestionId)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer" className="text-foreground">
                  {t("forgotPassword.yourAnswer")}
                </Label>
                <Input
                  id="answer"
                  type="text"
                  placeholder={t("forgotPassword.answerPlaceholder")}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {t("forgotPassword.attemptsRemaining", { count: attemptsRemaining })}
                </p>
              </div>

              <ChunkyButton
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-6"
                disabled={loading || !answer.trim()}
              >
                {loading ? t("common.loading") : t("forgotPassword.verify")}
              </ChunkyButton>
            </motion.form>
          )}

          {/* Step 3: New Password */}
          {step === "password" && (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePasswordSubmit}
              className="w-full space-y-4"
            >
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
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
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
            </motion.form>
          )}

          {/* Email reset link sent */}
          {step === "emailSent" && (
            <motion.div
              key="emailSent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center"
            >
              <ChunkyButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                {t("forgotPassword.backToLogin")}
              </ChunkyButton>
            </motion.div>
          )}

          {/* Success */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full text-center"
            >
              <ChunkyButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                {t("auth.signIn")}
              </ChunkyButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to login link */}
        {step !== "success" && step !== "emailSent" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-center"
          >
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-primary font-medium hover:underline text-sm"
            >
              {t("forgotPassword.backToLogin")}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Export security questions for use in signup flow
export { SECURITY_QUESTIONS };
