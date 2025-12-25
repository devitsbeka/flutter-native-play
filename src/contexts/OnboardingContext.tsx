import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

export type OnboardingStep = 
  | "idle"
  | "welcome"
  | "username"
  | "password"
  | "creating"
  | "avatar-upload"
  | "avatar-camera"
  | "avatar-generating"
  | "avatar-preview"
  | "walkthrough"
  | "complete";

interface OnboardingContextType {
  step: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
  
  // Temporary signup data
  username: string;
  setUsername: (username: string) => void;
  password: string;
  setPassword: (password: string) => void;
  
  // Avatar data
  uploadedImage: string | null;
  setUploadedImage: (image: string | null) => void;
  generatedAvatar: string | null;
  setGeneratedAvatar: (avatar: string | null) => void;
  
  // Flow control
  startOnboarding: () => void;
  skipToAvatarCreation: () => void;
  skipWalkthrough: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  
  // Status checks
  isOnboarding: boolean;
  hasCompletedOnboarding: boolean;
  needsAvatar: boolean;
  needsWalkthrough: boolean;
  
  // Walkthrough
  walkthroughStep: number;
  setWalkthroughStep: (step: number) => void;
  totalWalkthroughSteps: number;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STORAGE_KEY = "worldquizzes_onboarding_completed";
const WALKTHROUGH_STORAGE_KEY = "worldquizzes_walkthrough_completed";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  
  const [step, setStep] = useState<OnboardingStep>("idle");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  
  const totalWalkthroughSteps = 6;
  
  // Check localStorage for completion status
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    }
    return false;
  });
  
  const [hasCompletedWalkthrough, setHasCompletedWalkthrough] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(WALKTHROUGH_STORAGE_KEY) === "true";
    }
    return false;
  });
  
  // Derived states
  const isOnboarding = step !== "idle" && step !== "complete";
  const needsAvatar = !!user && !profile?.avatar_url;
  const needsWalkthrough = !!user && !!profile?.avatar_url && !hasCompletedWalkthrough;
  
  // Start onboarding for new users
  const startOnboarding = useCallback(() => {
    setStep("welcome");
    setUsername("");
    setPassword("");
    setUploadedImage(null);
    setGeneratedAvatar(null);
  }, []);
  
  // Skip directly to avatar creation (for existing users without avatar)
  const skipToAvatarCreation = useCallback(() => {
    setStep("avatar-upload");
    setUploadedImage(null);
    setGeneratedAvatar(null);
  }, []);
  
  // Skip walkthrough
  const skipWalkthrough = useCallback(() => {
    setStep("complete");
    setHasCompletedWalkthrough(true);
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
  }, []);
  
  // Complete the entire onboarding
  const completeOnboarding = useCallback(() => {
    setStep("complete");
    setHasCompletedOnboarding(true);
    setHasCompletedWalkthrough(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
  }, []);
  
  // Reset onboarding (for testing/debugging)
  const resetOnboarding = useCallback(() => {
    setStep("idle");
    setUsername("");
    setPassword("");
    setUploadedImage(null);
    setGeneratedAvatar(null);
    setWalkthroughStep(0);
    setHasCompletedOnboarding(false);
    setHasCompletedWalkthrough(false);
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    localStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
  }, []);
  
  // Auto-detect what step to show based on user state
  useEffect(() => {
    if (step !== "idle") return; // Don't auto-change if already in a flow
    
    // User logged in but no avatar -> show avatar creation
    if (user && profile && !profile.avatar_url && hasCompletedOnboarding) {
      // Don't auto-trigger, let user click play
    }
    
    // User logged in, has avatar, but hasn't seen walkthrough
    if (user && profile?.avatar_url && !hasCompletedWalkthrough) {
      // Could auto-trigger walkthrough here, but we'll let Index handle it
    }
  }, [user, profile, step, hasCompletedOnboarding, hasCompletedWalkthrough]);
  
  return (
    <OnboardingContext.Provider
      value={{
        step,
        setStep,
        username,
        setUsername,
        password,
        setPassword,
        uploadedImage,
        setUploadedImage,
        generatedAvatar,
        setGeneratedAvatar,
        startOnboarding,
        skipToAvatarCreation,
        skipWalkthrough,
        completeOnboarding,
        resetOnboarding,
        isOnboarding,
        hasCompletedOnboarding,
        needsAvatar,
        needsWalkthrough,
        walkthroughStep,
        setWalkthroughStep,
        totalWalkthroughSteps,
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
