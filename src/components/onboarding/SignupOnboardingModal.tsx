import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Lock, Eye, EyeOff, Loader2, Check, ArrowLeft } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import confetti from "canvas-confetti";

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

// Sparkle particles for modal background
const ModalSparkle = ({ index }: { index: number }) => {
  const duration = 2 + Math.random() * 2;
  const delay = Math.random() * 2;
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-primary/40"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
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
  
  // Sparkles for background
  const sparkles = Array.from({ length: 20 }, (_, i) => i);
  
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
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        onClick={() => step !== "creating" && setStep("idle")}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,240,255,0.98) 100%)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.5)",
          }}
        >
          {/* Background sparkles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {sparkles.map((i) => (
              <ModalSparkle key={i} index={i} />
            ))}
          </div>
          
          {/* Back button */}
          {step !== "welcome" && step !== "creating" && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleBack}
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
          )}
          
          {/* Content */}
          <div className="relative p-8">
            <AnimatePresence mode="wait">
              {/* Welcome Step */}
              {step === "welcome" && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center text-center"
                >
                  <motion.div
                    className="text-7xl mb-4"
                    animate={{ 
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  >
                    👋
                  </motion.div>
                  
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                    {t("onboarding.welcomeTitle")}
                  </h1>
                  
                  <p className="text-muted-foreground mb-8">
                    {t("onboarding.welcomeSubtitle")}
                  </p>
                  
                  <ChunkyButton
                    variant="primary"
                    size="lg"
                    onClick={() => setStep("username")}
                    icon={<Sparkles className="w-5 h-5" />}
                  >
                    {t("onboarding.startAdventure")}
                  </ChunkyButton>
                </motion.div>
              )}
              
              {/* Username Step */}
              {step === "username" && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <User className="w-8 h-8 text-primary" />
                  </motion.div>
                  
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
                    {t("onboarding.chooseUsername")}
                  </h2>
                  
                  <p className="text-sm text-muted-foreground mb-6 text-center">
                    {t("onboarding.usernameHint")}
                  </p>
                  
                  <div className="w-full mb-6">
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
                        className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-border focus:border-primary outline-none text-lg font-medium text-center transition-colors"
                        style={{
                          boxShadow: "0 4px 0 hsl(var(--border))",
                        }}
                      />
                    </div>
                    {errors.username && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-destructive text-sm mt-2 text-center"
                      >
                        {errors.username}
                      </motion.p>
                    )}
                  </div>
                  
                  <ChunkyButton
                    variant="primary"
                    size="lg"
                    onClick={handleNextFromUsername}
                    disabled={!username.trim()}
                    className="w-full"
                  >
                    {t("common.next")}
                  </ChunkyButton>
                </motion.div>
              )}
              
              {/* Password Step */}
              {step === "password" && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Lock className="w-8 h-8 text-primary" />
                  </motion.div>
                  
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
                    {t("onboarding.createPassword")}
                  </h2>
                  
                  <p className="text-sm text-muted-foreground mb-6 text-center">
                    {t("onboarding.passwordHint")}
                  </p>
                  
                  <div className="w-full mb-6">
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
                        className="w-full px-5 py-4 pr-14 rounded-2xl bg-white border-2 border-border focus:border-primary outline-none text-lg font-medium text-center transition-colors"
                        style={{
                          boxShadow: "0 4px 0 hsl(var(--border))",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-destructive text-sm mt-2 text-center"
                      >
                        {errors.password}
                      </motion.p>
                    )}
                  </div>
                  
                  <ChunkyButton
                    variant="primary"
                    size="lg"
                    onClick={handleCreateAccount}
                    disabled={!password || isLoading}
                    className="w-full"
                  >
                    {t("auth.createAccount")}
                  </ChunkyButton>
                </motion.div>
              )}
              
              {/* Creating Account Step */}
              {step === "creating" && (
                <motion.div
                  key="creating"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-8"
                >
                  <motion.div
                    className="relative mb-6"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary" />
                  </motion.div>
                  
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">
                    {t("onboarding.creatingAccount")}
                  </h2>
                  
                  <motion.p
                    className="text-muted-foreground text-sm"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {t("onboarding.almostThere")}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
