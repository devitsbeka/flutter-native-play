import { useState, Suspense, lazy, memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw, Loader2 } from "lucide-react";
import { MemoryRouter } from "react-router-dom";

// Lazy load page components to avoid loading everything at once
const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const Discover = lazy(() => import("@/pages/Discover"));
const TeamV2 = lazy(() => import("@/pages/TeamV2"));
const Leaderboards = lazy(() => import("@/pages/Leaderboards"));
const Profile = lazy(() => import("@/pages/Profile"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const VIP = lazy(() => import("@/pages/VIP"));
const PowerUps = lazy(() => import("@/pages/PowerUps"));
const WorldHome = lazy(() => import("@/pages/WorldHome"));
const Support = lazy(() => import("@/pages/Support"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Page definitions with their components
const pageCategories = [
  {
    title: "მთავარი გვერდები",
    pages: [
      { id: "home", label: "მთავარი", sublabel: "Home", Component: Index },
      { id: "auth", label: "ავტორიზაცია", sublabel: "Authentication", Component: Auth },
      { id: "discover", label: "აღმოჩენა", sublabel: "Discover", Component: Discover },
      { id: "team", label: "თიმი", sublabel: "Social Feed", Component: TeamV2 },
      { id: "leaderboards", label: "ლიდერბორდი", sublabel: "Leaderboards", Component: Leaderboards },
      { id: "profile", label: "პროფილი", sublabel: "Profile", Component: Profile },
      { id: "notifications", label: "შეტყობინებები", sublabel: "Notifications", Component: Notifications },
    ],
  },
  {
    title: "მაღაზია და VIP",
    pages: [
      { id: "vip", label: "VIP", sublabel: "Subscription", Component: VIP },
      { id: "powerups", label: "პაუერაფები", sublabel: "Power-Ups Shop", Component: PowerUps },
    ],
  },
  {
    title: "თამაშის ფლოუ",
    pages: [
      { id: "world", label: "მსოფლიო", sublabel: "World Map", Component: WorldHome },
    ],
  },
  {
    title: "იურიდიული / დახმარება",
    pages: [
      { id: "privacy", label: "კონფიდენციალურობა", sublabel: "Privacy Policy", Component: PrivacyPolicy },
      { id: "terms", label: "წესები", sublabel: "Terms of Service", Component: TermsOfService },
      { id: "support", label: "დახმარება", sublabel: "Support", Component: Support },
    ],
  },
  {
    title: "შეცდომები",
    pages: [
      { id: "notfound", label: "404", sublabel: "Not Found", Component: NotFound },
    ],
  },
];

// Loading placeholder
const LoadingPlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Error boundary fallback
const ErrorFallback = ({ name }: { name: string }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/10 p-4">
    <p className="text-sm text-destructive font-medium text-center">
      შეცდომა: {name}
    </p>
  </div>
);

// iPhone mockup component - memoized to prevent unnecessary re-renders
const IPhoneMockup = memo(function IPhoneMockup({ 
  id,
  label, 
  sublabel, 
  scale,
  Component
}: { 
  id: string;
  label: string; 
  sublabel?: string; 
  scale: number;
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
}) {
  const width = 375;
  const height = 812;
  const [hasError, setHasError] = useState(false);
  
  return (
    <div 
      className="flex flex-col items-center gap-3 shrink-0"
      style={{ 
        transform: `scale(${scale})`, 
        transformOrigin: 'top center',
        marginBottom: scale < 1 ? `${-(height * (1 - scale))}px` : 0
      }}
    >
      {/* iPhone Frame */}
      <div 
        className="relative bg-[#1a1a1a] rounded-[55px] p-3 shadow-2xl"
        style={{ width: width + 24, height: height + 24 }}
      >
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-28 w-[3px] h-8 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-[3px] top-44 w-[3px] h-14 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-[3px] top-64 w-[3px] h-14 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -right-[3px] top-36 w-[3px] h-20 bg-[#2a2a2a] rounded-r-sm" />
        
        {/* Inner bezel */}
        <div className="absolute inset-[6px] rounded-[49px] bg-[#0a0a0a]" />
        
        {/* Screen container */}
        <div 
          className="relative rounded-[45px] overflow-hidden bg-background"
          style={{ width, height }}
        >
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-[20px] z-50" />
          
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-1.5 bg-foreground/30 rounded-full z-50" />
          
          {/* Page content - wrapped in isolated MemoryRouter */}
          <div className="w-full h-full overflow-hidden">
            {hasError ? (
              <ErrorFallback name={label} />
            ) : (
              <MemoryRouter>
                <Suspense fallback={<LoadingPlaceholder />}>
                  <div 
                    className="w-full h-full overflow-y-auto overflow-x-hidden"
                    style={{ 
                      // Disable all interactions in preview mode
                      pointerEvents: 'none',
                      // Force mobile viewport feel
                      touchAction: 'none'
                    }}
                  >
                    <Component />
                  </div>
                </Suspense>
              </MemoryRouter>
            )}
          </div>
        </div>
      </div>
      
      {/* Labels */}
      <div className="text-center mt-2">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        {sublabel && (
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </div>
  );
});

export default function Design() {
  const [scale, setScale] = useState(0.5);
  
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 1));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));
  const handleReset = () => setScale(0.5);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">დიზაინ სისტემა</h1>
          <p className="text-sm text-muted-foreground">ყველა მომხმარებლის გვერდის პრევიუ iPhone-ზე</p>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleZoomOut}
            disabled={scale <= 0.3}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-14 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleZoomIn}
            disabled={scale >= 1}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-10">
          {pageCategories.map((category) => (
            <div key={category.title}>
              {/* Category Title */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
                <div className="h-0.5 w-16 bg-primary/50 mt-2 rounded-full" />
              </div>
              
              {/* Horizontal Scroll of iPhones */}
              <div className="overflow-x-auto pb-4">
                <div 
                  className="flex gap-6"
                  style={{ 
                    paddingRight: '2rem',
                    minWidth: 'max-content'
                  }}
                >
                  {category.pages.map((page) => (
                    <IPhoneMockup
                      key={page.id}
                      id={page.id}
                      label={page.label}
                      sublabel={page.sublabel}
                      scale={scale}
                      Component={page.Component}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
