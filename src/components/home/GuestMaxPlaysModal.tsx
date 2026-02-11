import triviaBuzzer from "@/assets/icons/trivia-buzzer.png";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, User, KeyRound, Loader2 } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { lovable } from "@/integrations/lovable";

interface GuestMaxPlaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  inline?: boolean;
}

export const GuestMaxPlaysModal = React.forwardRef<HTMLDivElement, GuestMaxPlaysModalProps>(
  function GuestMaxPlaysModal({ isOpen, onClose, onRegister, inline }, ref) {
    const { t } = useLanguage();
    const { signUpWithUsername } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignUp = async () => {
      if (username.trim().length < 2) {
        setError("მინიმუმ 2 სიმბოლო");
        return;
      }
      if (password.length < 6) {
        setError("პაროლი მინიმუმ 6 სიმბოლო");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const { error: authError } = await signUpWithUsername(username.trim(), password);
        if (authError) {
          if (authError.message?.includes("already registered")) {
            setError("ეს მომხმარებელი უკვე არსებობს");
          } else {
            setError(authError.message || "შეცდომა");
          }
        } else {
          onClose();
        }
      } catch {
        setError("შეცდომა, სცადე თავიდან");
      } finally {
        setLoading(false);
      }
    };

    const handleGoogleSignIn = async () => {
      try {
        await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
      } catch {}
    };

    const handleAppleSignIn = async () => {
      try {
        await lovable.auth.signInWithOAuth("apple", {
          redirect_uri: window.location.origin,
        });
      } catch {}
    };

    return (
      <div ref={ref}>
        <GameModal
          isOpen={isOpen}
          onClose={onClose}
          variant="primary"
          iconSrc={triviaBuzzer}
          title={t("modals.likedIt")}
          showSparkles
          showStars
          inline={inline}
          fullScreen={false}
        >
          {/* Social login buttons - fastest path */}
          <div className="flex flex-col gap-2 mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center gap-3 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google-ით გაგრძელება
            </button>
            <button
              type="button"
              onClick={handleAppleSignIn}
              className="w-full h-12 rounded-xl bg-black text-white flex items-center justify-center gap-3 font-medium text-sm hover:bg-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple-ით გაგრძელება
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ან</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Inline registration form */}
          <div className="space-y-3 mb-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="მომხმარებელი"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                className="pl-10 h-11"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="პაროლი (მინ. 6)"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="pl-10 h-11"
                onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <ChunkyButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  ანგარიშის შექმნა
                </>
              )}
            </ChunkyButton>
          </div>
        </GameModal>
      </div>
    );
  }
);

GuestMaxPlaysModal.displayName = "GuestMaxPlaysModal";
