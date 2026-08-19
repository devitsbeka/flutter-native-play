import { useState } from "react";
import { trackSignupCompleted } from "@/lib/analytics";
import { motion } from "framer-motion";
import { Lock, User, Loader2, Sparkles, X, Camera, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCamera } from "@/hooks/useCamera";
import { useLanguage } from "@/contexts/LanguageContext";
import { passwordStrength } from "@/utils/passwordStrength";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { oauth } from "@/integrations/oauth";
import { Capacitor } from "@capacitor/core";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { SinglePlayVideo } from "@/components/shared/SinglePlayVideo";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import guestWelcomeVideo from "@/assets/guest-welcome-avatar.mp4";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnToPath?: string;
  message?: string;
}

// Validation helpers
const validateUsername = (value: string, t: (key: string) => string): string | undefined => {
  if (!value.trim()) return t("authModal.usernameRequired");
  if (value.length < 3) return t("authModal.usernameMin");
  if (!/^[a-zA-Z0-9_\u10A0-\u10FF]+$/.test(value)) {
    return t("authModal.usernameChars");
  }
  return undefined;
};

// Signup-strength policy applies only to NEW accounts — sign-in keeps the
// lenient floor so accounts that predate the policy can still log in.
const validatePassword = (value: string, t: (key: string) => string, isSignUp: boolean): string | undefined => {
  if (!value) return t("authModal.passwordRequired");
  if (isSignUp && !passwordStrength(value).meetsPolicy) return t("auth.pwTooWeak");
  if (!isSignUp && value.length < 6) return t("authModal.passwordMin");
  return undefined;
};

export function AuthRequiredModal({
  isOpen,
  onClose,
  returnToPath,
  message,
}: AuthRequiredModalProps) {
  const navigate = useNavigate();
  const { signIn, signUpWithUsername, signInWithApple } = useAuth();
  const { t } = useLanguage();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  
  const { takePhoto, selectFromGallery, isLoading: isCameraLoading } = useCamera();

  const handleTakePhoto = async () => {
    setShowUploadOptions(false);
    const photo = await takePhoto();
    if (photo?.dataUrl) {
      setSelectedPhoto(photo.dataUrl);
    } else if (photo?.webPath) {
      setSelectedPhoto(photo.webPath);
    } else if (photo?.base64String) {
      const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
      setSelectedPhoto(`data:${mimeType};base64,${photo.base64String}`);
    }
  };

  const handleSelectFromGallery = async () => {
    setShowUploadOptions(false);
    const photo = await selectFromGallery();
    if (photo?.dataUrl) {
      setSelectedPhoto(photo.dataUrl);
    } else if (photo?.webPath) {
      setSelectedPhoto(photo.webPath);
    } else if (photo?.base64String) {
      const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
      setSelectedPhoto(`data:${mimeType};base64,${photo.base64String}`);
    }
  };

  // Reset photo when switching modes
  const handleToggleMode = (toSignUp: boolean) => {
    setIsSignUp(toSignUp);
    if (!toSignUp) {
      setSelectedPhoto(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const uError = isSignUp ? validateUsername(username, t) : (!username.trim() ? t("authModal.usernameRequired") : undefined);
    const pError = validatePassword(password, t, isSignUp);
    
    setUsernameError(uError);
    setPasswordError(pError);
    
    if (uError || pError) return;
    
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUpWithUsername(username, password);
        if (error) {
          if (error.message?.includes("already registered")) {
            toast.error(t("authModal.usernameTaken"));
          } else if (error.message === t("extra.textNotAllowed")) {
            // The blocked-name refusal — tell the user WHAT to change
            // instead of "something went wrong".
            toast.error(error.message);
          } else {
            const m = error.message || "";
            if (m.includes("Failed to lookup user") || m.includes("Invalid login credentials")) {
              toast.error(t("authModal.userNotFound"));
            } else {
              toast.error(t("authModal.genericError"));
            }
          }
          return;
        }
        trackSignupCompleted('username', false);
        toast.success(t("authModal.accountCreated"));
        localStorage.setItem('lastLoginEmail', username);
        onClose();
      } else {
        // Try username-based login first
        const pseudoEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@mytrivia.local`;
        let { error } = await signIn(pseudoEmail, password);
        
        // If that fails, try as raw email
        if (error) {
          const result = await signIn(username, password);
          error = result.error;
        }
        
        if (error) {
          toast.error(t("authModal.invalidCredentials"));
          return;
        }
        localStorage.setItem('lastLoginEmail', username);
        onClose();
        if (returnToPath) {
          navigate(returnToPath);
        }
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Failed to lookup user") || msg.includes("Invalid login credentials")) {
        toast.error(t("authModal.userNotFound"));
      } else {
        toast.error(t("authModal.genericError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      if (returnToPath) {
        localStorage.setItem('authReturnTo', returnToPath);
      }
      const result = await oauth.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(t("authModal.googleSignInFailed"));
      }
    } catch (err) {
      toast.error(t("authModal.googleSignInFailed"));
    }
  };

  // Guideline 4.8: wherever Google is offered on iOS, Apple must be too —
  // and this modal is the sign-in wall on six in-app surfaces. Uses the
  // native ASAuthorization flow via signInWithApple (web falls back to
  // OAuth inside it, but the button only renders on iOS).
  const handleAppleSignIn = async () => {
    try {
      // The native flow completes IN PLACE — no redirect, no /auth visit —
      // so the modal has to dismiss itself and go where the wall was
      // guarding. (No authReturnTo in localStorage: only /auth consumes
      // that key, and this path never reaches /auth, so a stored value
      // would hijack the next /auth visit instead.)
      const { error } = await signInWithApple();
      if (error) {
        if (!/cancel/i.test(error.message ?? "")) {
          toast.error(t("authModal.genericError"));
        }
        return;
      }
      onClose();
      if (returnToPath) navigate(returnToPath);
    } catch {
      toast.error(t("authModal.genericError"));
    }
  };

  const loading = isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 bg-background border-none rounded-3xl overflow-hidden">
        <DialogTitle className="sr-only">{t("authModal.dialogTitle")}</DialogTitle>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="px-6 pt-8 pb-6">
          {/* Header - Logo for login, Mascot for signup */}
          {isSignUp ? (
            <div className="flex flex-col items-center mb-4">
              <Popover open={showUploadOptions} onOpenChange={setShowUploadOptions}>
                <PopoverTrigger asChild>
                  <button type="button" className="relative">
                    {/* Circle container with overflow-hidden */}
                    <div className="relative w-[90px] h-[90px] rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                      {selectedPhoto ? (
                        <img 
                          src={selectedPhoto} 
                          alt="Selected avatar" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <SinglePlayVideo 
                          src={guestWelcomeVideo} 
                          className="w-full h-full"
                          style={{ objectPosition: 'center 30%' }}
                        />
                      )}
                    </div>
                    {/* Camera badge - OUTSIDE the overflow-hidden div */}
                    <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-2 shadow-md border-2 border-background">
                      <Camera className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" side="bottom" align="center">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={handleTakePhoto}
                      disabled={isCameraLoading}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                       <span className="text-sm font-medium">{t("authModal.takePhoto")}</span>
                     </button>
                    <button
                      type="button"
                      onClick={handleSelectFromGallery}
                      disabled={isCameraLoading}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <ImagePlus className="w-4 h-4 text-primary" />
                       <span className="text-sm font-medium">{t("authModal.chooseFromGallery")}</span>
                     </button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <h2 className="font-slackey text-2xl text-foreground mt-3">{t("authModal.hello")}</h2>
              <p className="text-sm text-muted-foreground text-center mt-1">
                {t("authModal.createAccountSubtitle")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-4"
              >
                <MyTriviaLiveLogo size="md" textColor="dark" />
              </motion.div>

              <p className="text-base text-foreground font-semibold text-center">
                {message || t("authModal.defaultMessage")}
              </p>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Username/Email Input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError(undefined);
                }}
                placeholder={isSignUp ? t("authModal.usernamePlaceholder") : t("authModal.emailOrUsername")}
                disabled={loading}
                className="w-full pl-10 pr-3 py-[14px] rounded-xl bg-background border-2 border-border 
                           focus:border-primary outline-none text-base font-medium
                           disabled:opacity-50 transition-colors"
                style={{ boxShadow: "0 2px 0 hsl(var(--border))" }}
              />
              {usernameError && (
                <p className="text-xs text-destructive mt-0.5 ml-2">{usernameError}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(undefined);
                }}
                placeholder={t("authModal.password")}
                disabled={loading}
                className="w-full pl-10 pr-3 py-[14px] rounded-xl bg-background border-2 border-border 
                           focus:border-primary outline-none text-base font-medium
                           disabled:opacity-50 transition-colors"
                style={{ boxShadow: "0 2px 0 hsl(var(--border))" }}
              />
              {isSignUp && <PasswordStrengthMeter password={password} />}
              {passwordError && (
                <p className="text-xs text-destructive mt-0.5 ml-2">{passwordError}</p>
              )}
            </div>

            {/* Submit Button */}
            <ChunkyButton 
              type="submit" 
              variant="primary" 
              size="md" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t("authModal.createAccount")}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {t("authModal.signIn")}
                </>
              )}
            </ChunkyButton>

            {/* Toggle between Sign Up and Sign In */}
            <p className="text-sm text-muted-foreground text-center mt-2">
              {isSignUp ? (
                <>
                  {t("authModal.alreadyHaveAccount")}{" "}
                  <button 
                    type="button" 
                    onClick={() => handleToggleMode(false)}
                    className="text-primary font-semibold hover:underline"
                  >
                    {t("authModal.signIn")}
                  </button>
                </>
              ) : (
                <>
                  {t("authModal.noAccount")}{" "}
                  <button 
                    type="button" 
                    onClick={() => handleToggleMode(true)}
                    className="text-primary font-semibold hover:underline"
                  >
                    {t("authModal.create")}
                  </button>
                </>
              )}
            </p>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full my-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">{t("authModal.or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google sign-in — same chunky button as the logged-out homepage */}
          <GoogleSignInButton onClick={handleGoogleSignIn} disabled={loading} className="w-full" />

          {/* Sign in with Apple — required beside Google on iOS (4.8).
              Same treatment as the Auth page's button. */}
          {Capacitor.getPlatform() === "ios" && (
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full mt-3 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center gap-3 text-gray-700 font-medium text-base hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="black">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {t("auth.signInWithApple")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
