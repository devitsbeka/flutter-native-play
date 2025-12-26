import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Lock, Eye, EyeOff } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { GameModal } from "@/components/ui/game-modal";

// Confetti celebration effect
const celebrateConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};

export function SignupOnboardingModal() {
  const { 
    step, 
    setStep, 
    username, 
    setUsername, 
    password, 
    setPassword,
  } = useOnboarding();
  
  const { signUpWithUsername } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  const isOpen = step === "welcome" || step === "username" || step === "password" || step === "creating";
  
  // Auto-focus inputs
  useEffect(() => {
    if (step === "username") {
      setTimeout(() => usernameRef.current?.focus(), 300);
    } else if (step === "password") {
      setTimeout(() => passwordRef.current?.focus(), 300);
    }
  }, [step]);
  
  const validateUsername = (value: string): string | undefined => {
    if (!value.trim()) return t("auth.usernameRequired");
    if (value.length < 3) return t("auth.usernameTooShort");
    if (!/^[a-zA-Z0-9_\u10A0-\u10FF]+$/.test(value)) {
      return "მხოლოდ ასოები, ციფრები და _ დასაშვებია";
    }
    return undefined;
  };
  
  const validatePassword = (value: string): string | undefined => {
    if (!value) return t("auth.passwordRequired");
    if (value.length < 6) return t("auth.passwordTooShort");
    return undefined;
  };
  
  const handleNextFromUsername = () => {
    const error = validateUsername(username);
    if (error) {
      setErrors({ username: error });
      return;
    }
    setErrors({});
    setStep("password");
  };
  
  const handleCreateAccount = async () => {
    const error = validatePassword(password);
    if (error) {
      setErrors({ password: error });
      return;
    }
    
    setErrors({});
    setIsLoading(true);
    setStep("creating");
    
    try {
      const { error: signUpError } = await signUpWithUsername(username, password);
      
      if (signUpError) {
        throw signUpError;
      }
      
      // Wait a bit for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Celebrate with confetti!
      celebrateConfetti();
      
      toast.success(t("success.accountCreated"));
      setStep("avatar-upload");
      
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || t("errors.generic"));
      setStep("password");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBack = () => {
    if (step === "password") {
      setStep("username");
    } else if (step === "username") {
      setStep("welcome");
    } else if (step === "welcome") {
      setStep("idle");
    }
  };
  
  // Determine current step config
  const getStepConfig = () => {
    switch (step) {
      case "welcome":
        return {
          icon: "👋",
          iconEmoji: true,
          title: t("onboarding.welcomeTitle"),
          subtitle: t("onboarding.welcomeSubtitle"),
          primaryLabel: t("onboarding.startAdventure"),
          primaryIcon: <Sparkles className="w-5 h-5" />,
          onPrimaryClick: () => setStep("username"),
          showBack: false,
        };
      case "username":
        return {
          icon: <User className="w-10 h-10 text-primary" />,
          title: t("onboarding.chooseUsername"),
          subtitle: t("onboarding.usernameHint"),
          primaryLabel: t("common.next"),
          onPrimaryClick: handleNextFromUsername,
          primaryDisabled: !username.trim(),
          showBack: true,
        };
      case "password":
        return {
          icon: <Lock className="w-10 h-10 text-primary" />,
          title: t("onboarding.createPassword"),
          subtitle: t("onboarding.passwordHint"),
          primaryLabel: t("auth.createAccount"),
          onPrimaryClick: handleCreateAccount,
          primaryDisabled: !password || isLoading,
          showBack: true,
        };
      case "creating":
        return {
          icon: "⏳",
          iconEmoji: true,
          title: t("onboarding.creatingAccount"),
          subtitle: t("onboarding.almostThere"),
          showBack: false,
          hideFooter: true,
        };
      default:
        return null;
    }
  };
  
  const config = getStepConfig();
  
  if (!isOpen || !config) return null;
  
  return (
    <GameModal
      isOpen={isOpen}
      onClose={step !== "creating" ? () => setStep("idle") : undefined}
      icon={config.iconEmoji ? (
        <motion.span 
          className="text-5xl"
          animate={step === "welcome" ? { 
            rotate: [0, -10, 10, -10, 0],
            scale: [1, 1.1, 1],
          } : step === "creating" ? {
            rotate: [0, 360],
          } : {}}
          transition={step === "creating" ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 1, repeat: Infinity, repeatDelay: 2 }}
        >
          {config.icon}
        </motion.span>
      ) : (
        <motion.div
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {config.icon}
        </motion.div>
      )}
      title={config.title || ""}
      subtitle={config.subtitle}
      showBackButton={config.showBack}
      onBack={handleBack}
      primaryLabel={config.primaryLabel}
      primaryIcon={config.primaryIcon}
      onPrimaryClick={config.onPrimaryClick}
      primaryDisabled={config.primaryDisabled}
      hideFooter={config.hideFooter}
      hideCloseButton={step === "creating"}
    >
      <AnimatePresence mode="wait">
        {/* Username Input */}
        {step === "username" && (
          <motion.div
            key="username-input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <div className="relative">
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors({});
                }}
                onKeyDown={(e) => e.key === "Enter" && handleNextFromUsername()}
                placeholder={t("auth.usernamePlaceholder")}
                className="w-full px-5 py-4 rounded-2xl bg-background border-4 border-border focus:border-primary outline-none text-lg font-medium text-center transition-colors"
                style={{
                  boxShadow: "0 4px 0 hsl(var(--border))",
                }}
              />
            </div>
            {errors.username && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm mt-3 text-center font-medium"
              >
                {errors.username}
              </motion.p>
            )}
          </motion.div>
        )}
        
        {/* Password Input */}
        {step === "password" && (
          <motion.div
            key="password-input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <div className="relative">
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors({});
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
                placeholder={t("auth.passwordPlaceholder")}
                className="w-full px-5 py-4 pr-14 rounded-2xl bg-background border-4 border-border focus:border-primary outline-none text-lg font-medium text-center transition-colors"
                style={{
                  boxShadow: "0 4px 0 hsl(var(--border))",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm mt-3 text-center font-medium"
              >
                {errors.password}
              </motion.p>
            )}
          </motion.div>
        )}
        
        {/* Creating spinner */}
        {step === "creating" && (
          <motion.div
            key="creating"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-4"
          >
            <motion.div
              className="relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameModal>
  );
}
