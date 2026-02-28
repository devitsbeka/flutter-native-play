import { useState } from "react";
import { trackSignupCompleted } from "@/lib/analytics";
import { motion } from "framer-motion";
import { Lock, User, Loader2, Sparkles, X, Camera, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCamera } from "@/hooks/useCamera";
import { useLanguage } from "@/contexts/LanguageContext";
import { lovable } from "@/integrations/lovable";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
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

const validatePassword = (value: string, t: (key: string) => string): string | undefined => {
  if (!value) return t("authModal.passwordRequired");
  if (value.length < 6) return t("authModal.passwordMin");
  return undefined;
};

export function AuthRequiredModal({
  isOpen,
  onClose,
  returnToPath,
  message,
}: AuthRequiredModalProps) {
  const navigate = useNavigate();
  const { signIn, signUpWithUsername } = useAuth();
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
    const pError = validatePassword(password, t);
    
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
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(t("authModal.googleSignInFailed"));
      }
    } catch (err) {
      toast.error(t("authModal.googleSignInFailed"));
    }
  };

  const handleAppleSignIn = async () => {
    try {
      if (returnToPath) {
        localStorage.setItem('authReturnTo', returnToPath);
      }
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(t("authModal.appleSignInFailed"));
      }
    } catch (err) {
      toast.error(t("authModal.appleSignInFailed"));
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

          {/* OAuth Buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-11 h-11 rounded-full bg-card border border-border shadow-sm 
                         flex items-center justify-center
                         hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>

            {/* Apple Button */}
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-11 h-11 rounded-full bg-card border border-border shadow-sm 
                         flex items-center justify-center
                         hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
