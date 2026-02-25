import { useState, useCallback } from "react";
import { WelcomeOnboardingModal } from "@/components/onboarding/WelcomeOnboardingModal";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const WELCOME_ONBOARDING_KEY = "mytrivia_welcome_onboarding_seen";

export default function OnboardingWelcomePreview() {
  const [isOpen, setIsOpen] = useState(true);

  const handleReset = useCallback(() => {
    localStorage.removeItem(WELCOME_ONBOARDING_KEY);
    setIsOpen(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-4">
      <h1 className="text-2xl font-bold text-foreground">Welcome Onboarding Preview</h1>
      <p className="text-muted-foreground text-sm">Admin-only preview of the welcome onboarding modal.</p>

      {!isOpen && (
        <Button onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset & Reopen
        </Button>
      )}

      <WelcomeOnboardingModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
