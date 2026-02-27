import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { AgeGroup } from "@/hooks/useAgeGroup";

export type OnboardingStep = 
  | "idle"
  | "age_gate"
  | "username"
  | "password"
  | "creating"
  | "complete";

interface OnboardingContextType {
  step: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
  
  // Temporary signup data
  username: string;
  setUsername: (username: string) => void;
  password: string;
  setPassword: (password: string) => void;
  selectedAgeGroup: AgeGroup | null;
  setSelectedAgeGroup: (age: AgeGroup | null) => void;
  
  // Flow control
  startOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  
  // Status checks
  isOnboarding: boolean;
  hasCompletedOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STORAGE_KEY = "mytrivia_onboarding_completed";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<OnboardingStep>("idle");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null);
  
  // Check localStorage for completion status
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    }
    return false;
  });
  
  // Derived states
  const isOnboarding = step !== "idle" && step !== "complete";
  
  // Start onboarding for new users - go to age gate first
  const startOnboarding = useCallback(() => {
    setStep("age_gate");
    setUsername("");
    setPassword("");
    setSelectedAgeGroup(null);
  }, []);
  
  // Complete the entire onboarding
  const completeOnboarding = useCallback(() => {
    setStep("complete");
    setHasCompletedOnboarding(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    localStorage.setItem("mytrivia_is_new_signup", "true");
  }, []);
  
  // Reset onboarding (for testing/debugging)
  const resetOnboarding = useCallback(() => {
    setStep("idle");
    setUsername("");
    setPassword("");
    setSelectedAgeGroup(null);
    setHasCompletedOnboarding(false);
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  }, []);
  
  return (
    <OnboardingContext.Provider
      value={{
        step,
        setStep,
        username,
        setUsername,
        password,
        setPassword,
        selectedAgeGroup,
        setSelectedAgeGroup,
        startOnboarding,
        completeOnboarding,
        resetOnboarding,
        isOnboarding,
        hasCompletedOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
