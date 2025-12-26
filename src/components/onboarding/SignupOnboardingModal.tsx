import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
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

// Step order for determining animation direction
const stepOrder = ["welcome", "username", "password", "creating"] as const;

// Slide and fade animation variants
const slideVariants: Variants = {
  enterFromRight: {
    x: 60,
    opacity: 0,
    scale: 0.95,
  },
  enterFromLeft: {
    x: -60,
    opacity: 0,
    scale: 0.95,
  },
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exitToLeft: {
    x: -60,
    opacity: 0,
    scale: 0.95,
  },
  exitToRight: {
    x: 60,
    opacity: 0,
    scale: 0.95,
  },
};

// Icon animation variants
const iconVariants: Variants = {
  initial: {
    scale: 0,
    rotate: -180,
    opacity: 0,
  },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: 0.1,
    },
  },
  exit: {
    scale: 0,
    rotate: 180,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// Content stagger animation
const contentVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: 0.15,
    },
  },
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
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [prevStep, setPrevStep] = useState(step);
  
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  const isOpen = step === "welcome" || step === "username" || step === "password" || step === "creating";
  
  // Track step changes to determine animation direction
  useEffect(() => {
    if (step !== prevStep) {
      const currentIndex = stepOrder.indexOf(step as any);
      const prevIndex = stepOrder.indexOf(prevStep as any);
      setDirection(currentIndex > prevIndex ? "forward" : "backward");
      setPrevStep(step);
    }
  }, [step, prevStep]);
  
  // Auto-focus inputs with delay for animation
  useEffect(() => {
    if (step === "username") {
      setTimeout(() => usernameRef.current?.focus(), 400);
    } else if (step === "password") {
      setTimeout(() => passwordRef.current?.focus(), 400);
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
      
      await new Promise(resolve => setTimeout(resolve, 1500));
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
  
  // Get animation variants based on direction
  const getEnterVariant = () => direction === "forward" ? "enterFromRight" : "enterFromLeft";
  const getExitVariant = () => direction === "forward" ? "exitToLeft" : "exitToRight";
  
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
          icon: <User className="w-10 h-10 text-white" />,
          title: t("onboarding.chooseUsername"),
          subtitle: t("onboarding.usernameHint"),
          primaryLabel: t("common.next"),
          onPrimaryClick: handleNextFromUsername,
          primaryDisabled: !username.trim(),
          showBack: true,
        };
      case "password":
        return {
          icon: <Lock className="w-10 h-10 text-white" />,
          title: t("onboarding.createPassword"),
          subtitle: t("onboarding.passwordHint"),
          primaryLabel: t("auth.createAccount"),
          onPrimaryClick: handleCreateAccount,
          primaryDisabled: !password || isLoading,
          showBack: true,
        };
      case "creating":
        return {
          icon: "✨",
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
      icon={
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex items-center justify-center"
          >
            {config.iconEmoji ? (
              <motion.span 
                className="text-5xl"
                animate={step === "welcome" ? { 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1],
                } : step === "creating" ? {
                  scale: [1, 1.2, 1],
                } : {}}
                transition={step === "creating" ? { duration: 1, repeat: Infinity } : { duration: 1, repeat: Infinity, repeatDelay: 2 }}
              >
                {config.icon}
              </motion.span>
            ) : (
              <motion.div
                className="w-full h-full flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {config.icon}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      }
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
      <AnimatePresence mode="wait" custom={direction}>
        {/* Welcome Step - empty content */}
        {step === "welcome" && (
          <motion.div
            key="welcome-content"
            variants={slideVariants}
            initial={getEnterVariant()}
            animate="center"
            exit={getExitVariant()}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full min-h-[60px]"
          />
        )}
        
        {/* Username Input */}
        {step === "username" && (
          <motion.div
            key="username-content"
            variants={slideVariants}
            initial={getEnterVariant()}
            animate="center"
            exit={getExitVariant()}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full"
          >
            <motion.div 
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <motion.div variants={itemVariants} className="relative">
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
                  className="w-full px-5 py-4 rounded-2xl bg-background border-4 border-border focus:border-primary outline-none text-lg font-medium text-center transition-all duration-200"
                  style={{
                    boxShadow: "0 4px 0 hsl(var(--border))",
                  }}
                />
              </motion.div>
              
              <AnimatePresence>
                {errors.username && (
                  <motion.p
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="text-destructive text-sm mt-3 text-center font-medium overflow-hidden"
                  >
                    {errors.username}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
        
        {/* Password Input */}
        {step === "password" && (
          <motion.div
            key="password-content"
            variants={slideVariants}
            initial={getEnterVariant()}
            animate="center"
            exit={getExitVariant()}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full"
          >
            <motion.div 
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <motion.div variants={itemVariants} className="relative">
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
                  className="w-full px-5 py-4 pr-14 rounded-2xl bg-background border-4 border-border focus:border-primary outline-none text-lg font-medium text-center transition-all duration-200"
                  style={{
                    boxShadow: "0 4px 0 hsl(var(--border))",
                  }}
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </motion.div>
              
              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="text-destructive text-sm mt-3 text-center font-medium overflow-hidden"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
        
        {/* Creating spinner */}
        {step === "creating" && (
          <motion.div
            key="creating-content"
            variants={slideVariants}
            initial={getEnterVariant()}
            animate="center"
            exit={getExitVariant()}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col items-center py-4"
          >
            <motion.div 
              variants={contentVariants}
              initial="initial"
              animate="animate"
              className="flex flex-col items-center"
            >
              <motion.div
                variants={itemVariants}
                className="relative"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary" />
                </motion.div>
                
                {/* Pulsing glow behind spinner */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
              
              {/* Progress dots */}
              <motion.div 
                variants={itemVariants}
                className="flex gap-2 mt-6"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{ 
                      duration: 0.8, 
                      repeat: Infinity, 
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameModal>
  );
}
