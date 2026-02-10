import { toastIcon, ICON_URLS } from "@/lib/toast-icons";
import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationModal } from "@/hooks/useNotificationModal";
import { ArrowLeft, Mail, Lock, User, Apple, Gift } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const returnTo = searchParams.get('returnTo');
  const { t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [autoRegistering, setAutoRegistering] = useState(false);

  const { signIn, signInWithUsername, signUp, signInWithApple, signInWithGoogle, user } = useAuth();
  const isIOS = Capacitor.getPlatform() === 'ios';
  const { notify } = useNotificationModal();
  const navigate = useNavigate();

  const signUpSchema = z.object({
    email: z.string().email(t("auth.invalidCredentials")),
    password: z.string().min(6, t("auth.passwordTooShort")),
    nickname: z.string().min(2, t("auth.usernameTooShort")).max(20, t("auth.usernameTooShort")),
  });

  const signInSchema = z.object({
    email: z.string().min(1, t("auth.invalidCredentials")),
    password: z.string().min(1, t("auth.passwordRequired")),
  });

  useEffect(() => {
    if (user) {
      // Check for saved returnTo from OAuth flow first
      const savedReturnTo = localStorage.getItem('authReturnTo');
      if (savedReturnTo) {
        localStorage.removeItem('authReturnTo');
        navigate(savedReturnTo);
      } else if (returnTo) {
        navigate(decodeURIComponent(returnTo));
      } else {
        navigate("/");
      }
    }
  }, [user, navigate, returnTo]);

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

        const { error, data } = await signUp(email, password, nickname);
        if (error) {
          if (error.message.includes("already registered")) {
            notify.error(t("auth.alreadyHaveAccount"), { description: t("auth.invalidCredentials") });
          } else {
            notify.error(t("common.error"), { description: error.message });
          }
        } else {
          // Handle referral code if present
          if (referralCode && data?.user) {
            try {
              // Find the invite by referral code
              const { data: invite } = await supabase
                .from('friend_invites')
                .select('*')
                .eq('referral_code', referralCode)
                .eq('status', 'pending')
                .single();

              if (invite) {
                // Update the invite status
                await supabase
                  .from('friend_invites')
                  .update({
                    status: 'accepted',
                    invited_user_id: data.user.id,
                    accepted_at: new Date().toISOString(),
                  })
                  .eq('id', invite.id);

                // Update the new user's profile with referral info
                await supabase
                  .from('profiles')
                  .update({ referred_by_invite_id: invite.id })
                  .eq('user_id', data.user.id);

                notify.success("მოგესალმებით!", { 
                  description: "მიიღე PRO სტატუსი მეგობრის მოწვევით!", 
                  icon: toastIcon(ICON_URLS.partyPopper) 
                });
              }
            } catch (err) {
              console.error('Error processing referral:', err);
            }
          } else {
            notify.success(t("common.welcome"), { description: t("auth.accountCreated"), icon: toastIcon(ICON_URLS.partyPopper) });
          }
          navigate(returnTo ? decodeURIComponent(returnTo) : "/");
        }
      } else {
        const validation = signInSchema.safeParse({ email, password });
        if (!validation.success) {
          const fieldErrors: Record<string, string> = {};
          validation.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const isEmail = email.includes('@');
        const authResult = isEmail 
          ? await signIn(email, password) 
          : await signInWithUsername(email, password);
        
        if (authResult.error) {
          setShowAccountPrompt(true);
        } else {
          notify.success(t("auth.welcomeBack"), { icon: toastIcon(triviaBuzzer) });
          navigate(returnTo ? decodeURIComponent(returnTo) : "/");
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
      // Store returnTo for OAuth redirect
      if (returnTo) {
        localStorage.setItem('authReturnTo', returnTo);
      }
      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        notify.error(t("common.error"), { description: error.message });
      }
      // OAuth will redirect, so no need to navigate manually
    } catch (err) {
      notify.error(t("common.error"), { description: t("errors.generic") });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Store returnTo for OAuth redirect (will be checked after OAuth callback)
      if (returnTo) {
        localStorage.setItem('authReturnTo', returnTo);
      }
      const { error } = await signInWithGoogle();
      if (error) {
        notify.error(t("common.error"), { description: error.message });
      }
      // OAuth will redirect, so no need to navigate manually
    } catch (err) {
      notify.error(t("common.error"), { description: t("errors.generic") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-background via-background to-primary/10 relative z-10">
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
        {/* Referral Banner */}
        {referralCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  მოწვეული ხარ!
                </p>
                <p className="text-xs text-muted-foreground">
                  დარეგისტრირდი და მიიღე PRO სტატუსი უფასოდ
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isSignUp ? t("auth.createAccount") : t("auth.welcomeBack")}
          </h1>
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
            <Label htmlFor="email" className="text-foreground">{isSignUp ? t("help.email") : t("auth.usernameOrEmail")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type={isSignUp ? "email" : "text"}
                placeholder={isSignUp ? "you@example.com" : t("auth.usernameOrEmailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 text-sm"
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
            {!isSignUp && (
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-primary text-sm hover:underline mt-1"
              >
                {t("forgotPassword.link")}
              </button>
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

          {/* Toggle between Sign Up and Sign In - prominent placement */}
          <div className="mt-3 text-center">
            <p className="text-base text-foreground/80">
              {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                }}
                className="text-primary font-bold text-lg hover:underline"
              >
                {isSignUp ? t("auth.signIn") : t("auth.signUp")}
              </button>
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t("common.or") || "or"}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google Sign In - Official white button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mt-4 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center gap-3 text-gray-700 font-medium text-base hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isSignUp ? t("auth.signUpWithGoogle") : t("auth.signInWithGoogle")}
          </button>

          {/* Sign in with Apple - Official white button */}
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={loading}
            className="w-full mt-3 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center gap-3 text-gray-700 font-medium text-base hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="black">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {isSignUp ? t("auth.signUpWithApple") : t("auth.signInWithApple")}
          </button>
        </motion.form>


      </div>

      {/* Account prompt dialog on failed login */}
      <AlertDialog open={showAccountPrompt} onOpenChange={setShowAccountPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>გაქვს ანგარიში?</AlertDialogTitle>
            <AlertDialogDescription>
              თუ ჯერ არ გაქვს ანგარიში, შექმენი ახალი
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowAccountPrompt(false)}>
              შესვლა
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowAccountPrompt(false);
              setIsSignUp(true);
              setErrors({});
            }}>
              შექმნა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}