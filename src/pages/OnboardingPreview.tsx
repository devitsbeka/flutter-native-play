import { FeatureOnboardingCarousel, resetFeatureOnboarding } from "@/components/team/FeatureOnboardingCarousel";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

export default function OnboardingPreview() {
  const navigate = useNavigate();

  const handleReset = () => {
    resetFeatureOnboarding();
    toast.success("Onboarding reset! Refresh to see changes.");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Onboarding Preview</h1>
      </div>

      {/* Controls */}
      <div className="mb-8 flex gap-4">
        <ChunkyButton
          variant="outline"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Onboarding State
        </ChunkyButton>
      </div>

      {/* All Cards View */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">All Cards (Static)</h2>
        <div className="max-w-sm mx-auto">
          <FeatureOnboardingCarousel 
            showAllCards 
            onNavigateToTab={(tab) => toast.info(`Would navigate to: ${tab}`)}
          />
        </div>
      </div>

      {/* Carousel View */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Carousel (Auto-rotating)</h2>
        <div className="max-w-sm mx-auto bg-card rounded-2xl border border-border p-4">
          <FeatureOnboardingCarousel 
            onNavigateToTab={(tab) => toast.info(`Would navigate to: ${tab}`)}
          />
        </div>
      </div>

      {/* Animation Info */}
      <div className="max-w-sm mx-auto p-4 bg-muted rounded-xl">
        <h3 className="font-semibold mb-2">Animation Details</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Auto-rotates every 4 seconds</li>
          <li>• Conic gradient border rotates (3s loop)</li>
          <li>• Shadow pulses with primary color</li>
          <li>• Cards scale on hover/active</li>
          <li>• Click navigates to corresponding tab</li>
        </ul>
      </div>
    </div>
  );
}
