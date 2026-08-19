import { ICON_URLS } from "@/lib/toast-icons";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Sparkles, User, Eye, EyeOff, Lock, ShieldQuestion, Calendar } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { AgeGateStep } from "./AgeGateStep";
import type { AgeGroup } from "@/hooks/useAgeGroup";
import { useAuth } from "@/hooks/useAuth";
import { useAvatarModal } from "@/contexts/AvatarModalContext";
import { t } from "@/lib/i18n";
import { passwordStrength } from "@/utils/passwordStrength";
import { PasswordStrengthMeter } from "@/components/shared/PasswordStrengthMeter";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { GameModal } from "@/components/ui/game-modal";
import { supabase } from "@/integrations/supabase/client";
import { SECURITY_QUESTIONS } from "@/pages/ForgotPassword";
import { trackSignupCompleted } from "@/lib/analytics";

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
const stepOrder = ["age_gate", "username", "creating"] as const;

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
    selectedAgeGroup,
    setSelectedAgeGroup,
    completeOnboarding,
  } = useOnboarding();
  
  const { signUpWithUsername } = useAuth();
  const { openAvatarModal } = useAvatarModal();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; security?: string }>({});
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [prevStep, setPrevStep] = useState(step);
  const [securityQuestionId, setSecurityQuestionId] = useState<number | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState("");
  
  const usernameRef = useRef<HTMLInputElement>(null);
  
  const isOpen = step === "age_gate" || step === "username" || step === "creating";
  
  // Track step changes to determine animation direction
  useEffect(() => {
    if (step !== prevStep) {
      const currentIndex = stepOrder.indexOf(step as any);
      const prevIndex = stepOrder.indexOf(prevStep as any);
      setDirection(currentIndex > prevIndex ? "forward" : "backward");
      setPrevStep(step);
    }
  }, [step, prevStep]);
  
  // Auto-focus username input with delay for animation
  useEffect(() => {
    if (step === "username") {
      setTimeout(() => usernameRef.current?.focus(), 400);
    }
  }, [step]);
  
  const validateUsername = (value: string): string | undefined => {
    if (!value.trim()) return t("auth.usernameRequired");
    if (value.length < 3) return t("auth.usernameTooShort");
    if (!/^[a-zA-Z0-9_\u10A0-\u10FF]+$/.test(value)) {
      return t("extra.onlyLettersAllowed");
    }
    return undefined;
  };
  
  const validatePassword = (value: string): string | undefined => {
    if (!value) return t("auth.passwordRequired");
    if (!passwordStrength(value).meetsPolicy) return t("auth.pwTooWeak");
    return undefined;
  };
  
  // Hash security answer using SHA-256 (same as edge function)
  const hashAnswer = async (answer: string): Promise<string> => {
    const normalized = answer.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Combined create account - validates all fields
  const handleCreateAccount = async () => {
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    let securityError: string | undefined;
    
    if (!securityQuestionId) {
      securityError = t("extra.chooseSecurityQuestion");
    } else if (!securityAnswer.trim()) {
      securityError = t("extra.enterAnswer");
    }
    
    if (usernameError || passwordError || securityError) {
      setErrors({ username: usernameError, password: passwordError, security: securityError });
      return;
    }
    
    setErrors({});
    setIsLoading(true);
    setStep("creating");
    
    try {
      const { error: signUpError, data } = await signUpWithUsername(username, password);
      
      if (signUpError) {
        throw signUpError;
      }
      
      // Save security question data and age group to profile
      if (data?.user?.id) {
        try {
          const updateData: any = {};
          if (securityQuestionId && securityAnswer.trim()) {
            updateData.security_question_id = securityQuestionId;
            updateData.security_answer_hash = await hashAnswer(securityAnswer);
          }
          if (selectedAgeGroup) {
            updateData.age_group = selectedAgeGroup;
          }
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("profiles")
              .update(updateData)
              .eq("user_id", data.user.id);
          }
        } catch (profileErr) {
          console.error("Failed to save profile data:", profileErr);
        }
      }
      
      trackSignupCompleted('username', false);
      await new Promise(resolve => setTimeout(resolve, 1500));
      celebrateConfetti();
      toast.success(t("success.accountCreated"));
      
      // Complete signup onboarding and open avatar modal
      completeOnboarding();
      openAvatarModal();
      
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || t("errors.generic"));
      setStep("username");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle back
  const handleBack = () => {
    if (step === "username") {
      setStep("age_gate");
    } else {
      setStep("idle");
    }
  };

  const handleAgeSelect = (age: AgeGroup) => {
    setSelectedAgeGroup(age);
  };

  const handleAgeContinue = () => {
    if (selectedAgeGroup) {
      setStep("username");
    }
  };
  
  // Get animation variants based on direction
  const getEnterVariant = () => direction === "forward" ? "enterFromRight" : "enterFromLeft";
  const getExitVariant = () => direction === "forward" ? "exitToLeft" : "exitToRight";
  
  // Determine current step config
  const getStepConfig = () => {
    switch (step) {
      case "age_gate":
        return {
          icon: <Calendar className="w-10 h-10 text-white" />,
          title: t("onboarding.ageGateTitle"),
          subtitle: t("onboarding.ageGateSubtitle"),
          primaryLabel: t("common.continue"),
          onPrimaryClick: handleAgeContinue,
          primaryDisabled: !selectedAgeGroup,
          showBack: true,
        };
      case "username":
        return {
          icon: <User className="w-10 h-10 text-white" />,
          title: t("onboarding.chooseUsername"),
          subtitle: undefined,
          primaryLabel: t("auth.createAccount"),
          primaryIcon: <Sparkles className="w-5 h-5" />,
          onPrimaryClick: handleCreateAccount,
          primaryDisabled: !username.trim() || !password || !securityQuestionId || !securityAnswer.trim() || isLoading,
          showBack: true,
        };
      case "creating":
        return {
          icon: ICON_URLS.sparkle,
          iconImgSrc: true,
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
            {config.iconImgSrc ? (
              <motion.img 
                src={config.icon as string}
                alt=""
                className="w-12 h-12 object-contain"
                animate={step === "creating" ? {
                  scale: [1, 1.2, 1],
                } : {}}
                transition={step === "creating" ? { duration: 1, repeat: Infinity } : {}}
              />
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
        {/* Combined Username + Password Input */}
        {step === "username" && (
          <motion.div
            key="signup-content"
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
              className="space-y-4"
            >
              {/* Username Input */}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    ref={usernameRef}
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrors(prev => ({ ...prev, username: undefined }));
                    }}
                    placeholder={t("auth.usernamePlaceholder")}
                    className="w-full pl-12 pr-5 py-3.5 rounded-2xl bg-background border-4 border-border focus:border-primary outline-none text-base font-medium text-left transition-all duration-200"
                    style={{
                      boxShadow: "0 4px 0 hsl(var(--border))",
                    }}
                  />
                </div>
                <AnimatePresence>
                  {errors.username && (
                    <motion.p
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="text-destructive text-sm mt-2 text-center font-medium overflow-hidden"
                    >
                      {errors.username}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {/* Password Input */}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateAccount()}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full pl-12 pr-14 py-3.5 rounded-2xl bg-background border-4 border-border focus:border-primary outline-none text-base font-medium text-left transition-all duration-200"
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
                </div>
                <PasswordStrengthMeter password={password} />
                <AnimatePresence>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="text-destructive text-sm mt-2 text-center font-medium overflow-hidden"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Security Question Dropdown */}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                    <ShieldQuestion className="w-5 h-5" />
                  </div>
                  <select
                    value={securityQuestionId || ""}
                    onChange={(e) => {
                      setSecurityQuestionId(e.target.value ? Number(e.target.value) : null);
                      setErrors(prev => ({ ...prev, security: undefined }));
                    }}
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-background border-4 border-border focus:border-primary outline-none text-sm font-medium text-left transition-all duration-200 appearance-none cursor-pointer"
                    style={{
                      boxShadow: "0 4px 0 hsl(var(--border))",
                      color: securityQuestionId ? "inherit" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <option value="" disabled>{t("extra.securityQuestionLabel")}</option>
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q.id} value={q.id}>{q.ka}</option>
                    ))}
                  </select>
                </div>
              </motion.div>

              {/* Security Answer Input */}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => {
                      setSecurityAnswer(e.target.value);
                      setErrors(prev => ({ ...prev, security: undefined }));
                    }}
                    placeholder={t("extra.answerLabel")}
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-background border-4 border-border focus:border-primary outline-none text-sm font-medium text-left transition-all duration-200"
                    style={{
                      boxShadow: "0 4px 0 hsl(var(--border))",
                    }}
                  />
                </div>
                <AnimatePresence>
                  {errors.security && (
                    <motion.p
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="text-destructive text-sm mt-2 text-center font-medium overflow-hidden"
                    >
                      {errors.security}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
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
