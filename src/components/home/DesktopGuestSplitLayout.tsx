import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { User, Lock, Sparkles, Loader2, Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SinglePlayVideo } from "@/components/shared/SinglePlayVideo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCamera } from "@/hooks/useCamera";
import { DesktopPlayButtonLarge } from "@/components/home/DesktopPlayButtonLarge";
import guestWelcomeVideo from "@/assets/guest-welcome-avatar.mp4";

interface DesktopGuestSplitLayoutProps {
  onCreateAccount: (username: string, password: string) => Promise<void>;
  onSignIn: (username: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onPlayAsGuest: () => void;
  isLoading: boolean;
  guestPlaysRemaining?: number;
  maxGuestPlays?: number;
}

export function DesktopGuestSplitLayout({
  onCreateAccount,
  onSignIn,
  onGoogleSignIn,
  onAppleSignIn,
  onPlayAsGuest,
  isLoading,
  guestPlaysRemaining = 3,
  maxGuestPlays = 3,
}: DesktopGuestSplitLayoutProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(() => {
    const lastEmail = localStorage.getItem('lastLoginEmail');
    return !lastEmail;
  });
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  
  const { takePhoto, selectFromGallery, isLoading: isCameraLoading } = useCamera();

  // Validation helpers
  const validateUsername = (value: string): string | undefined => {
    if (!value.trim()) return t("extra.authUsernameRequired");
    if (value.length < 3) return t("extra.authMinChars3");
    if (!/^[a-zA-Z0-9_\u10A0-\u10FF]+$/.test(value)) {
      return t("extra.authOnlyLettersDigits");
    }
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return t("extra.authPasswordRequired");
    if (value.length < 6) return t("extra.authMinChars6");
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const uError = isSignUp ? validateUsername(username) : (!username.trim() ? t("extra.authUsernameRequired") : undefined);
    const pError = validatePassword(password);
    
    setUsernameError(uError);
    setPasswordError(pError);
    
    if (uError || pError) return;
    
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await onCreateAccount(username, password);
      } else {
        await onSignIn(username, password);
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Failed to lookup user") || msg.includes("Invalid login credentials")) {
        toast.error(t("extra.authUserNotFound"));
      } else {
        toast.error(t("extra.authGenericError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await onGoogleSignIn();
    } catch (err: any) {
      toast.error(t("extra.authGoogleFailed"));
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await onAppleSignIn();
    } catch (err: any) {
      toast.error(t("extra.authAppleFailed"));
    }
  };

  const handleTakePhoto = async () => {
    setShowUploadOptions(false);
    const photo = await takePhoto();
    if (photo) {
      if (photo.dataUrl) {
        setSelectedPhoto(photo.dataUrl);
      } else if (photo.webPath) {
        setSelectedPhoto(photo.webPath);
      } else if (photo.base64String) {
        const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
        setSelectedPhoto(`data:${mimeType};base64,${photo.base64String}`);
      }
    }
  };

  const handleSelectFromGallery = async () => {
    setShowUploadOptions(false);
    const photo = await selectFromGallery();
    if (photo) {
      if (photo.dataUrl) {
        setSelectedPhoto(photo.dataUrl);
      } else if (photo.webPath) {
        setSelectedPhoto(photo.webPath);
      } else if (photo.base64String) {
        const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
        setSelectedPhoto(`data:${mimeType};base64,${photo.base64String}`);
      }
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <div className="w-full max-w-md mx-auto px-6 py-8">
      <div className="flex flex-col items-center">
        {/* Title */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="flex flex-col items-center mb-4"
        >
          <span className="font-slackey text-foreground font-bold text-2xl">
            {t("common.hello")}
          </span>
          {isSignUp && (
            <p className="mt-1 text-sm text-muted-foreground font-medium text-center leading-relaxed">
              {t("extra.createProfilePlayFree")}
            </p>
          )}
        </motion.div>

        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="relative mb-5"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Popover open={showUploadOptions} onOpenChange={setShowUploadOptions}>
              <PopoverTrigger asChild>
                <div className="relative group cursor-pointer">
                  <button 
                    type="button"
                    className="relative rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    style={{
                      width: 130,
                      height: 130,
                      boxShadow: "0 6px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
                      border: "3px solid hsl(var(--background))",
                    }}
                    disabled={isCameraLoading}
                  >
                    {selectedPhoto ? (
                      <img 
                        src={selectedPhoto} 
                        alt="Selected avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <SinglePlayVideo 
                        src={guestWelcomeVideo}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center 20%', transform: 'scale(1.3)' }}
                        onEnded={() => setVideoEnded(true)}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 -z-10" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                  <motion.div 
                    className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 shadow-md z-20"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={videoEnded ? { scale: [0, 1.3, 1], opacity: 1 } : { scale: 0, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <motion.div
                      animate={videoEnded ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 1.5, repeat: 2, ease: "easeInOut" }}
                    >
                      <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                    </motion.div>
                  </motion.div>
                </div>
              </PopoverTrigger>
              
              <PopoverContent className="w-48 p-2" side="bottom" align="center" sideOffset={8}>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Camera className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{t("extra.authTakeSelfie")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectFromGallery}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <ImagePlus className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{t("extra.authChoosePhoto")}</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </motion.div>
        </motion.div>

        {/* Auth Form */}
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          onSubmit={handleSubmit}
          className="w-full max-w-xs space-y-2"
        >
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
              placeholder={isSignUp ? t("extra.authUsernamePlaceholder") : t("extra.authEmailOrUsername")}
              disabled={loading}
              className="w-full pl-10 pr-3 py-[15px] rounded-xl bg-background border-2 border-border 
                         focus:border-primary outline-none text-base font-medium
                         disabled:opacity-50 transition-colors"
              style={{ boxShadow: "0 2px 0 hsl(var(--border))" }}
            />
            {usernameError && (
              <p className="text-xs text-destructive mt-0.5 ml-2">{usernameError}</p>
            )}
          </div>

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
              placeholder={t("extra.authPasswordPlaceholder")}
              disabled={loading}
              className="w-full pl-10 pr-3 py-[15px] rounded-xl bg-background border-2 border-border 
                         focus:border-primary outline-none text-base font-medium
                         disabled:opacity-50 transition-colors"
              style={{ boxShadow: "0 2px 0 hsl(var(--border))" }}
            />
            {passwordError && (
              <p className="text-xs text-destructive mt-0.5 ml-2">{passwordError}</p>
            )}
          </div>

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
                {t("extra.authCreateAccountBtn")}
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                {t("extra.authSignInBtn")}
              </>
            )}
          </ChunkyButton>

          <p className="text-sm text-muted-foreground text-center mt-2">
            {isSignUp ? (
              <>
                {t("extra.authAlreadyHaveAccount")}{" "}
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(false)}
                  className="text-primary font-semibold hover:underline"
                >
                  {t("extra.authSignInLink")}
                </button>
              </>
            ) : (
              <>
                {t("extra.authNoAccount")}{" "}
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(true)}
                  className="text-primary font-semibold hover:underline"
                >
                  {t("extra.authCreateLink")}
                </button>
              </>
            )}
          </p>
        </motion.form>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 w-full max-w-xs my-3"
        >
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">{t("extra.authOrDivider")}</span>
          <div className="flex-1 h-px bg-border" />
        </motion.div>

        {/* OAuth Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="flex items-center justify-center gap-3"
        >
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
        </motion.div>

        {/* Divider before play button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-xs my-6 border-t border-border/50"
        />

        {/* Play button with badge */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
        >
          <DesktopPlayButtonLarge
            onClick={onPlayAsGuest}
            playsRemaining={guestPlaysRemaining}
            maxPlays={maxGuestPlays}
            canPlay={guestPlaysRemaining > 0}
            isVip={false}
            isGuest={true}
            onboardingId="play"
          />
        </motion.div>
      </div>
    </div>
  );
}