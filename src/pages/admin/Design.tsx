import { useState, Suspense, lazy, memo, useMemo, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { 
  createMemoryRouter, 
  RouterProvider,
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext
} from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

// Drag scroll hook with momentum
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const animationFrame = useRef<number>();

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    isDragging.current = true;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
    lastX.current = e.pageX;
    lastTime.current = Date.now();
    velocity.current = 0;
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    ref.current.scrollLeft = scrollLeft.current - walk;
    
    // Calculate velocity for momentum
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (e.pageX - lastX.current) / dt;
    }
    lastX.current = e.pageX;
    lastTime.current = now;
  }, []);

  const applyMomentum = useCallback(() => {
    if (!ref.current || Math.abs(velocity.current) < 0.01) return;
    
    ref.current.scrollLeft -= velocity.current * 16;
    velocity.current *= 0.95; // Friction
    
    if (Math.abs(velocity.current) > 0.01) {
      animationFrame.current = requestAnimationFrame(applyMomentum);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!ref.current) return;
    isDragging.current = false;
    ref.current.style.cursor = 'grab';
    ref.current.style.userSelect = '';
    
    // Apply momentum
    applyMomentum();
  }, [applyMomentum]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging.current && ref.current) {
      isDragging.current = false;
      ref.current.style.cursor = 'grab';
      ref.current.style.userSelect = '';
      applyMomentum();
    }
  }, [applyMomentum]);

  return {
    ref,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    }
  };
}

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

// Reset router context wrapper - clears parent router context
const RouterContextReset = ({ children }: { children: React.ReactNode }) => (
  <UNSAFE_LocationContext.Provider value={null as any}>
    <UNSAFE_NavigationContext.Provider value={null as any}>
      <UNSAFE_RouteContext.Provider value={{
        outlet: null,
        matches: [],
        isDataRoute: false
      }}>
        {children}
      </UNSAFE_RouteContext.Provider>
    </UNSAFE_NavigationContext.Provider>
  </UNSAFE_LocationContext.Provider>
);

// Drag scroll container component
const DragScrollContainer = ({ children, categoryId }: { children: React.ReactNode; categoryId: string }) => {
  const { ref, handlers } = useDragScroll();
  
  return (
    <div 
      ref={ref}
      {...handlers}
      className="overflow-x-auto pb-4 cursor-grab"
      style={{ 
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        [data-category="${categoryId}"]::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div 
        data-category={categoryId}
        className="flex"
        style={{ 
          gap: '100px',
          paddingRight: '2rem',
          minWidth: 'max-content'
        }}
      >
        {children}
      </div>
    </div>
  );
};

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
      <RouterContextReset>
        <RouterProvider router={router} />
      </RouterContextReset>
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
              
              {/* Horizontal Scroll of iPhones with drag */}
              <DragScrollContainer categoryId={category.title}>
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
              </DragScrollContainer>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
