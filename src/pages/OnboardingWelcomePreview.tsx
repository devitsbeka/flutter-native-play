import { useState, useCallback } from "react";
import { WelcomeOnboardingOverlay } from "@/components/onboarding/WelcomeOnboardingOverlay";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { DesktopPlayButtonLarge } from "@/components/home/DesktopPlayButtonLarge";

const WELCOME_ONBOARDING_KEY = "mytrivia_welcome_onboarding_seen";

export default function OnboardingWelcomePreview() {
  const [isOpen, setIsOpen] = useState(true);

  const handleReset = useCallback(() => {
    localStorage.removeItem(WELCOME_ONBOARDING_KEY);
    setIsOpen(true);
  }, []);

  return (
    <MainLayout showPlayButton showBottomNav>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
        <h1 className="text-2xl font-bold text-foreground">Welcome Onboarding Preview</h1>
        <p className="text-muted-foreground text-sm text-center max-w-md">
          This preview shows the inline onboarding tooltips that highlight navigation items for new users.
        </p>

        {/* Desktop/tablet play target for onboarding step 5 */}
        <div className="hidden md:block mt-4">
          <DesktopPlayButtonLarge onboardingId="play" />
        </div>

        {!isOpen && (
          <Button onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset & Reopen
          </Button>
        )}
      </div>

      <WelcomeOnboardingOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </MainLayout>
  );
}
