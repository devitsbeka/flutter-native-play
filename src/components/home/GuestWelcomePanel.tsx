import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { HandDrawnArrow } from "@/components/shared/HandDrawnArrow";
import guestWelcomeVideo from "@/assets/guest-welcome-avatar.mp4";

interface GuestWelcomePanelProps {
  onCreateAccount: (username: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onPlayAsGuest: () => void;
  isLoading: boolean;
}

// Validation helpers
const validateUsername = (value: string): string | undefined => {
  if (!value.trim()) return "სახელი საჭიროა";
  if (value.length < 3) return "მინ. 3 სიმბოლო";
  if (!/^[a-zA-Z0-9_\u10A0-\u10FF]+$/.test(value)) {
    return "მხოლოდ ასოები, ციფრები და _";
  }
  return undefined;
};

const validatePassword = (value: string): string | undefined => {
  if (!value) return "პაროლი საჭიროა";
  if (value.length < 6) return "მინ. 6 სიმბოლო";
  return undefined;
};

export function GuestWelcomePanel({
  onCreateAccount,
  onGoogleSignIn,
  onAppleSignIn,
  onPlayAsGuest,
  isLoading,
}: GuestWelcomePanelProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const uError = validateUsername(username);
    const pError = validatePassword(password);
    
    setUsernameError(uError);
    setPasswordError(pError);
    
    if (uError || pError) return;
    
    setIsSubmitting(true);
    try {
      await onCreateAccount(username, password);
    } catch (err: any) {
      toast.error(err?.message || "შეცდომა, სცადე თავიდან");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await onGoogleSignIn();
    } catch (err: any) {
      toast.error("Google-ით შესვლა ვერ მოხერხდა");
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await onAppleSignIn();
    } catch (err: any) {
      toast.error("Apple-ით შესვლა ვერ მოხერხდა");
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
      {/* Title */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring" }}
        className="flex flex-col items-center mb-4 sm:mb-6"
      >
        <span className="font-slackey text-foreground font-black text-2xl sm:text-3xl">
          გამარჯობა!
        </span>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground font-medium text-center leading-relaxed">
          შექმენი შენი პროფილი და ითამაშე უფასოდ!
        </p>
      </motion.div>

      {/* Video Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="relative mb-5 sm:mb-6"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Circular video container */}
          <div 
            className="relative rounded-full overflow-hidden"
            style={{
              width: "clamp(150px, 40vw, 220px)",
              height: "clamp(150px, 40vw, 220px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
              border: "4px solid hsl(var(--background))",
            }}
          >
            <PingPongVideo 
              src={guestWelcomeVideo}
              className="rounded-full"
            />
            {/* Fallback gradient if video not ready */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 -z-10" />
          </div>
        </motion.div>
      </motion.div>

      {/* Auth Form */}
      <motion.form
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        onSubmit={handleSubmit}
        className="w-full space-y-3"
      >
        {/* Username Input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
            <User className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (usernameError) setUsernameError(undefined);
            }}
            placeholder="სახელი"
            disabled={loading}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-background border-2 border-border 
                       focus:border-primary outline-none text-base font-medium
                       disabled:opacity-50 transition-colors"
            style={{ boxShadow: "0 2px 0 hsl(var(--border))" }}
          />
          {usernameError && (
            <p className="text-xs text-destructive mt-1 ml-2">{usernameError}</p>
          )}
        </div>

        {/* Password Input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
            <Lock className="w-5 h-5" />
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(undefined);
            }}
            placeholder="პაროლი"
            disabled={loading}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-background border-2 border-border 
                       focus:border-primary outline-none text-base font-medium
                       disabled:opacity-50 transition-colors"
            style={{ boxShadow: "0 2px 0 hsl(var(--border))" }}
          />
          {passwordError && (
            <p className="text-xs text-destructive mt-1 ml-2">{passwordError}</p>
          )}
        </div>

        {/* Create Account Button */}
        <ChunkyButton 
          type="submit" 
          variant="primary" 
          size="lg" 
          className="w-full" 
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              შექმენი ანგარიში
            </>
          )}
        </ChunkyButton>
      </motion.form>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-3 w-full my-4"
      >
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground font-medium">ან</span>
        <div className="flex-1 h-px bg-border" />
      </motion.div>

      {/* OAuth Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="w-full space-y-2.5"
      >
        {/* Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-card border border-border shadow-sm 
                     flex items-center justify-center gap-3 text-foreground font-medium
                     hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          გააგრძელე Google-ით
        </button>

        {/* Apple Button */}
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-card border border-border shadow-sm 
                     flex items-center justify-center gap-3 text-foreground font-medium
                     hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          გააგრძელე Apple-ით
        </button>
      </motion.div>

      {/* Guest Play Option */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center mt-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-px bg-border" />
          <span className="text-sm text-muted-foreground">ან</span>
          <div className="w-8 h-px bg-border" />
        </div>
        <p className="text-base text-muted-foreground font-medium text-center">
          ითამაშე როგორც სტუმარმა
        </p>
        <HandDrawnArrow size={36} color="hsl(var(--muted-foreground))" />
      </motion.div>
    </div>
  );
}
