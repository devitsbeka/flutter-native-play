import React, { useState, Suspense, lazy, memo, useMemo, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Minus, Plus, RotateCcw, Loader2, AlertTriangle, 
  Search, ChevronDown, ChevronRight, Monitor, Tablet, Smartphone, X 
} from "lucide-react";
import { 
  createMemoryRouter, 
  RouterProvider,
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext
} from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { cn } from "@/lib/utils";

// Lazy load ALL page components
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
const PrivacyPolicyEN = lazy(() => import("@/pages/PrivacyPolicyEN"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const TermsOfServiceEN = lazy(() => import("@/pages/TermsOfServiceEN"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const CategoryQuizPage = lazy(() => import("@/pages/CategoryQuizPage"));
const Game = lazy(() => import("@/pages/Game"));
const AdventureMapAdmin = lazy(() => import("@/pages/AdventureMapAdmin"));
const TVLobby = lazy(() => import("@/pages/TVLobby"));
const TVJoin = lazy(() => import("@/pages/TVJoin"));
const TVDisplay = lazy(() => import("@/pages/TVDisplay"));
const TVHostController = lazy(() => import("@/pages/TVHostController"));
const Styleguide = lazy(() => import("@/pages/Styleguide"));
const AllButtons = lazy(() => import("@/pages/AllButtons"));
const ModalsShowcase = lazy(() => import("@/pages/ModalsShowcase"));
const RoomRedirect = lazy(() => import("@/pages/RoomRedirect"));

// Page definitions with ALL screens
const pageCategories = [
  {
    id: "core",
    title: "Core Pages",
    titleGe: "მთავარი გვერდები",
    icon: "📱",
    pages: [
      { id: "home", label: "Home", labelGe: "მთავარი", Component: Index, route: "/" },
      { id: "auth", label: "Auth", labelGe: "ავტორიზაცია", Component: Auth, route: "/auth" },
      { id: "discover", label: "Discover", labelGe: "აღმოჩენა", Component: Discover, route: "/discover" },
      { id: "team", label: "Team Feed", labelGe: "თიმი", Component: TeamV2, route: "/team" },
      { id: "leaderboards", label: "Leaderboards", labelGe: "ლიდერბორდი", Component: Leaderboards, route: "/leaderboards" },
      { id: "profile", label: "Profile", labelGe: "პროფილი", Component: Profile, route: "/profile" },
      { id: "notifications", label: "Notifications", labelGe: "შეტყობინებები", Component: Notifications, route: "/notifications" },
    ],
  },
  {
    id: "game",
    title: "Game Flow",
    titleGe: "თამაშის ფლოუ",
    icon: "🎮",
    pages: [
      { id: "world", label: "World Map", labelGe: "მსოფლიო რუკა", Component: WorldHome, route: "/world" },
      { id: "category", label: "Category Detail", labelGe: "კატეგორია", Component: CategoryPage, route: "/category/science" },
      { id: "quiz", label: "Quiz Game", labelGe: "ქვიზი", Component: CategoryQuizPage, route: "/play/science/1" },
      { id: "game", label: "Quick Game", labelGe: "სწრაფი თამაში", Component: Game, route: "/game" },
      { id: "adventure", label: "Adventure Map", labelGe: "თავგადასავალი", Component: AdventureMapAdmin, route: "/adventure-map-admin" },
    ],
  },
  {
    id: "tv",
    title: "TV Mode",
    titleGe: "TV / მულტიპლეიერი",
    icon: "📺",
    pages: [
      { id: "tv-lobby", label: "TV Lobby", labelGe: "TV ლობი", Component: TVLobby, route: "/tv" },
      { id: "tv-join", label: "TV Join", labelGe: "შეერთება", Component: TVJoin, route: "/join" },
      { id: "tv-display", label: "TV Display", labelGe: "TV ეკრანი", Component: TVDisplay, route: "/tv/ABC123" },
      { id: "tv-host", label: "Host Controller", labelGe: "ჰოსტის კონტროლი", Component: TVHostController, route: "/tv/host/test-session" },
    ],
  },
  {
    id: "monetization",
    title: "Monetization",
    titleGe: "მაღაზია და VIP",
    icon: "💎",
    pages: [
      { id: "vip", label: "VIP", labelGe: "VIP", Component: VIP, route: "/vip" },
      { id: "powerups", label: "Power-Ups", labelGe: "პაუერაფები", Component: PowerUps, route: "/power-ups" },
    ],
  },
  {
    id: "legal",
    title: "Legal & Support",
    titleGe: "იურიდიული / დახმარება",
    icon: "📄",
    pages: [
      { id: "privacy-ge", label: "Privacy (GE)", labelGe: "კონფიდენციალურობა", Component: PrivacyPolicy, route: "/privacy-policy" },
      { id: "privacy-en", label: "Privacy (EN)", labelGe: "Privacy Policy", Component: PrivacyPolicyEN, route: "/privacy-policy-en" },
      { id: "terms-ge", label: "Terms (GE)", labelGe: "წესები", Component: TermsOfService, route: "/terms" },
      { id: "terms-en", label: "Terms (EN)", labelGe: "Terms of Service", Component: TermsOfServiceEN, route: "/terms-en" },
      { id: "support", label: "Support", labelGe: "დახმარება", Component: Support, route: "/support" },
    ],
  },
  {
    id: "styleguide",
    title: "Style Guides",
    titleGe: "სტილის გზამკვლევი",
    icon: "🎨",
    pages: [
      { id: "styleguide", label: "Styleguide", labelGe: "სტილგაიდი", Component: Styleguide, route: "/styleguide" },
      { id: "buttons", label: "All Buttons", labelGe: "ღილაკები", Component: AllButtons, route: "/all-buttons" },
      { id: "modals", label: "Modals Showcase", labelGe: "მოდალები", Component: ModalsShowcase, route: "/modals" },
    ],
  },
  {
    id: "errors",
    title: "Error States",
    titleGe: "შეცდომები",
    icon: "⚠️",
    pages: [
      { id: "404", label: "404 Not Found", labelGe: "გვერდი ვერ მოიძებნა", Component: NotFound, route: "/404" },
      { id: "redirect", label: "Room Redirect", labelGe: "გადამისამართება", Component: RoomRedirect, route: "/room/test" },
    ],
  },
];

// Breakpoint configurations
const breakpoints = {
  mobile: { width: 375, height: 812, label: "Mobile", icon: Smartphone },
  tablet: { width: 768, height: 1024, label: "Tablet", icon: Tablet },
  desktop: { width: 1440, height: 900, label: "Desktop", icon: Monitor },
};

type BreakpointKey = keyof typeof breakpoints;
type PageType = typeof pageCategories[0]["pages"][0];

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
    <p className="text-sm text-destructive font-medium text-center mb-2">Failed to load</p>
    <p className="text-xs text-muted-foreground text-center max-w-[280px] font-mono">
      {error.message.slice(0, 100)}
    </p>
  </div>
);

// Reset router context wrapper
const RouterContextReset = ({ children }: { children: React.ReactNode }) => (
  <UNSAFE_LocationContext.Provider value={null as any}>
    <UNSAFE_NavigationContext.Provider value={null as any}>
      <UNSAFE_RouteContext.Provider value={{ outlet: null, matches: [], isDataRoute: false }}>
        {children}
      </UNSAFE_RouteContext.Provider>
    </UNSAFE_NavigationContext.Provider>
  </UNSAFE_LocationContext.Provider>
);

// Isolated page renderer with its own router
const IsolatedPageRenderer = memo(function IsolatedPageRenderer({
  Component,
  route,
}: {
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  route: string;
}) {
  const router = useMemo(() => {
    return createMemoryRouter(
      [{ path: "*", element: <Suspense fallback={<LoadingPlaceholder />}><Component /></Suspense> }],
      { initialEntries: [route] }
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

// Device Mockup component for different breakpoints
const DeviceMockup = memo(function DeviceMockup({ 
  page,
  breakpoint,
  scale,
  onClick,
}: { 
  page: PageType;
  breakpoint: BreakpointKey;
  scale: number;
  onClick?: () => void;
}) {
  const config = breakpoints[breakpoint];
  const { Component, route, label, labelGe } = page;
  
  // Calculate scaled dimensions
  const scaledWidth = config.width * scale;
  const scaledHeight = config.height * scale;
  
  return (
    <div 
      className="flex flex-col items-center gap-3 shrink-0 cursor-pointer group"
      onClick={onClick}
    >
      {/* Device Frame */}
      <div 
        className={cn(
          "relative overflow-hidden shadow-2xl transition-transform group-hover:scale-[1.02]",
          breakpoint === "mobile" && "rounded-[40px] bg-[#1a1a1a] p-3",
          breakpoint === "tablet" && "rounded-[24px] bg-[#1a1a1a] p-3",
          breakpoint === "desktop" && "rounded-lg bg-[#2a2a2a]"
        )}
        style={{ 
          width: breakpoint === "desktop" ? scaledWidth + 4 : scaledWidth + 24,
          height: breakpoint === "desktop" ? scaledHeight + 36 : scaledHeight + 24,
        }}
      >
        {/* Desktop browser bar */}
        {breakpoint === "desktop" && (
          <div className="h-8 bg-[#3a3a3a] flex items-center px-3 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-[#1a1a1a] rounded h-5 max-w-md mx-auto flex items-center justify-center">
                <span className="text-[10px] text-white/40 truncate px-2">{route}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile/Tablet inner bezel */}
        {breakpoint !== "desktop" && (
          <div className={cn(
            "absolute bg-[#0a0a0a]",
            breakpoint === "mobile" && "inset-[6px] rounded-[49px]",
            breakpoint === "tablet" && "inset-[6px] rounded-[18px]"
          )} />
        )}
        
        {/* Screen container */}
        <div 
          className={cn(
            "relative overflow-hidden bg-background",
            breakpoint === "mobile" && "rounded-[34px]",
            breakpoint === "tablet" && "rounded-[12px]",
          )}
          style={{ 
            width: scaledWidth,
            height: breakpoint === "desktop" ? scaledHeight : scaledHeight,
          }}
        >
          {/* Mobile Dynamic Island */}
          {breakpoint === "mobile" && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-black rounded-[20px] z-50"
              style={{ 
                top: 8 * scale, 
                width: 126 * scale, 
                height: 37 * scale 
              }} 
            />
          )}
          
          {/* Page content with inner scaling */}
          <div 
            className="overflow-hidden"
            style={{ 
              width: scaledWidth, 
              height: scaledHeight,
              pointerEvents: 'none' 
            }}
          >
            <div style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: 'top left',
              width: config.width,
              height: config.height,
            }}>
              <IsolatedPageRenderer Component={Component} route={route} />
            </div>
          </div>
          
          {/* Mobile home indicator */}
          {breakpoint === "mobile" && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-foreground/30 rounded-full z-50"
              style={{ 
                bottom: 8 * scale, 
                width: 134 * scale, 
                height: 5 * scale 
              }} 
            />
          )}
        </div>
      </div>
      
      {/* Labels */}
      <div className="text-center">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{labelGe}</p>
        <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{route}</p>
      </div>
    </div>
  );
});

// Sidebar Category Component
const SidebarCategory = memo(function SidebarCategory({
  category,
  isExpanded,
  onToggle,
  activePageId,
  onPageClick,
}: {
  category: typeof pageCategories[0];
  isExpanded: boolean;
  onToggle: () => void;
  activePageId: string | null;
  onPageClick: (pageId: string) => void;
}) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-base">{category.icon}</span>
        <span className="flex-1 font-medium text-sm">{category.title}</span>
        <span className="text-xs text-muted-foreground">({category.pages.length})</span>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isExpanded && (
        <div className="ml-7 mt-1 space-y-0.5">
          {category.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => onPageClick(page.id)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
                activePageId === page.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {page.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// Expanded Modal Component
const ExpandedModal = memo(function ExpandedModal({
  page,
  breakpoint,
  onClose,
}: {
  page: PageType | null;
  breakpoint: BreakpointKey;
  onClose: () => void;
}) {
  if (!page) return null;
  
  const config = breakpoints[breakpoint];
  const maxScale = Math.min(
    (window.innerWidth - 120) / config.width,
    (window.innerHeight - 200) / config.height,
    1
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute -top-12 right-0 rounded-full"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        <DeviceMockup
          page={page}
          breakpoint={breakpoint}
          scale={maxScale}
        />
      </div>
    </div>
  );
});

// Main Design Component
export default function Design() {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>("mobile");
  const [scale, setScale] = useState(0.4);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(pageCategories.map(c => c.id));
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState<PageType | null>(null);
  
  // Filter pages based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return pageCategories;
    
    const query = searchQuery.toLowerCase();
    return pageCategories.map(category => ({
      ...category,
      pages: category.pages.filter(page =>
        page.label.toLowerCase().includes(query) ||
        page.labelGe.toLowerCase().includes(query) ||
        page.route.toLowerCase().includes(query)
      )
    })).filter(category => category.pages.length > 0);
  }, [searchQuery]);

  // Calculate total pages
  const totalPages = pageCategories.reduce((acc, cat) => acc + cat.pages.length, 0);

  // Handle category toggle
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  // Handle page click in sidebar
  const handlePageClick = useCallback((pageId: string) => {
    setActivePageId(pageId);
    const element = document.getElementById(`page-${pageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.05, 0.8));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.05, 0.2));
  const handleReset = () => setScale(0.4);

  // Grid columns based on breakpoint and scale
  const gridCols = useMemo(() => {
    if (breakpoint === "desktop") return "grid-cols-1 xl:grid-cols-2";
    if (breakpoint === "tablet") return "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  }, [breakpoint]);

  return (
    <div className="h-screen flex overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg">Design System</h1>
          <p className="text-xs text-muted-foreground mt-1">{totalPages} screens</p>
        </div>
        
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search screens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Categories */}
        <ScrollArea className="flex-1 p-2">
          {filteredCategories.map((category) => (
            <SidebarCategory
              key={category.id}
              category={category}
              isExpanded={expandedCategories.includes(category.id)}
              onToggle={() => toggleCategory(category.id)}
              activePageId={activePageId}
              onPageClick={handlePageClick}
            />
          ))}
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-background border-b flex items-center justify-between px-4 shrink-0">
          {/* Breakpoint Selector */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(Object.entries(breakpoints) as [BreakpointKey, typeof breakpoints.mobile][]).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant={breakpoint === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBreakpoint(key)}
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className="text-xs opacity-60 hidden md:inline">{config.width}px</span>
                </Button>
              );
            })}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={scale <= 0.2}
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
              disabled={scale >= 0.8}
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
        </header>

        {/* Screens Grid */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {filteredCategories.map((category) => (
              <section key={category.id} className="mb-12">
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold">{category.title}</h2>
                    <p className="text-sm text-muted-foreground">{category.titleGe}</p>
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">({category.pages.length})</span>
                </div>
                
                {/* Pages Grid */}
                <div className={cn("grid gap-8", gridCols)}>
                  {category.pages.map((page) => (
                    <div 
                      key={page.id} 
                      id={`page-${page.id}`}
                      className="flex justify-center"
                    >
                      <DeviceMockup
                        page={page}
                        breakpoint={breakpoint}
                        scale={scale}
                        onClick={() => setExpandedPage(page)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Expanded Modal */}
      <ExpandedModal
        page={expandedPage}
        breakpoint={breakpoint}
        onClose={() => setExpandedPage(null)}
      />
    </div>
  );
}
