import { useState, Suspense, lazy, memo, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

// Lazy load page components
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
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const TVLobby = lazy(() => import("@/pages/TVLobby"));
const TVJoin = lazy(() => import("@/pages/TVJoin"));

// Page definitions with their components
const pageCategories = [
  {
    title: "მთავარი გვერდები",
    pages: [
      { id: "home", label: "მთავარი", sublabel: "Home", Component: Index, route: "/" },
      { id: "auth", label: "ავტორიზაცია", sublabel: "Authentication", Component: Auth, route: "/auth" },
      { id: "discover", label: "აღმოჩენა", sublabel: "Discover", Component: Discover, route: "/discover" },
      { id: "team", label: "თიმი", sublabel: "Social Feed", Component: TeamV2, route: "/team" },
      { id: "leaderboards", label: "ლიდერბორდი", sublabel: "Leaderboards", Component: Leaderboards, route: "/leaderboards" },
      { id: "profile", label: "პროფილი", sublabel: "Profile", Component: Profile, route: "/profile" },
      { id: "notifications", label: "შეტყობინებები", sublabel: "Notifications", Component: Notifications, route: "/notifications" },
    ],
  },
  {
    title: "მაღაზია და VIP",
    pages: [
      { id: "vip", label: "VIP", sublabel: "Subscription", Component: VIP, route: "/vip" },
      { id: "powerups", label: "პაუერაფები", sublabel: "Power-Ups Shop", Component: PowerUps, route: "/power-ups" },
    ],
  },
  {
    title: "თამაშის ფლოუ",
    pages: [
      { id: "world", label: "მსოფლიო", sublabel: "World Map", Component: WorldHome, route: "/world" },
      { id: "category", label: "კატეგორია", sublabel: "Category Detail", Component: CategoryPage, route: "/category/science" },
    ],
  },
  {
    title: "TV / მულტიპლეიერი",
    pages: [
      { id: "tv", label: "TV ლობი", sublabel: "TV Lobby", Component: TVLobby, route: "/tv" },
      { id: "join", label: "შეერთება", sublabel: "Join Game", Component: TVJoin, route: "/join" },
    ],
  },
  {
    title: "იურიდიული / დახმარება",
    pages: [
      { id: "privacy", label: "კონფიდენციალურობა", sublabel: "Privacy Policy", Component: PrivacyPolicy, route: "/privacy-policy" },
      { id: "terms", label: "წესები", sublabel: "Terms of Service", Component: TermsOfService, route: "/terms" },
      { id: "support", label: "დახმარება", sublabel: "Support", Component: Support, route: "/support" },
    ],
  },
  {
    title: "შეცდომები",
    pages: [
      { id: "notfound", label: "404", sublabel: "Not Found", Component: NotFound, route: "/404" },
    ],
  },
];

// Loading placeholder
const LoadingPlaceholder = () => (
  <div className="w-full h-full flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Error fallback for components that fail to render
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-destructive/5 p-6">
    <AlertTriangle className="w-10 h-10 text-destructive mb-3" />
    <p className="text-sm text-destructive font-medium text-center mb-2">
      კომპონენტი ვერ ჩაიტვირთა
    </p>
    <p className="text-xs text-muted-foreground text-center max-w-[280px] font-mono">
      {error.message.slice(0, 100)}
    </p>
  </div>
);

// Isolated page renderer with its own router
const IsolatedPageRenderer = memo(function IsolatedPageRenderer({
  Component,
  route,
}: {
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  route: string;
}) {
  // Create isolated memory router for this page
  const router = useMemo(() => {
    return createMemoryRouter(
      [
        {
          path: "*",
          element: (
            <Suspense fallback={<LoadingPlaceholder />}>
              <Component />
            </Suspense>
          ),
        },
      ],
      {
        initialEntries: [route],
      }
    );
  }, [Component, route]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
});

// iPhone mockup component
const IPhoneMockup = memo(function IPhoneMockup({ 
  id,
  label, 
  sublabel, 
  scale,
  Component,
  route,
}: { 
  id: string;
  label: string; 
  sublabel?: string; 
  scale: number;
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  route: string;
}) {
  const width = 375;
  const height = 812;
  
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
          
          {/* Page content */}
          <div 
            className="w-full h-full overflow-hidden"
            style={{ pointerEvents: 'none' }}
          >
            <IsolatedPageRenderer Component={Component} route={route} />
          </div>
        </div>
      </div>
      
      {/* Labels */}
      <div className="text-center mt-2">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        {sublabel && (
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{route}</p>
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
                      route={page.route}
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
