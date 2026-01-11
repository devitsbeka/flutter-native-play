import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";

// All user-facing pages organized by category
const pageCategories = [
  {
    title: "მთავარი გვერდები",
    pages: [
      { route: "/", label: "მთავარი", sublabel: "Home" },
      { route: "/auth", label: "ავტორიზაცია", sublabel: "Authentication" },
      { route: "/discover", label: "აღმოჩენა", sublabel: "Discover" },
      { route: "/team", label: "თიმი", sublabel: "Social Feed" },
      { route: "/leaderboards", label: "ლიდერბორდი", sublabel: "Leaderboards" },
      { route: "/profile", label: "პროფილი", sublabel: "Profile" },
      { route: "/notifications", label: "შეტყობინებები", sublabel: "Notifications" },
    ],
  },
  {
    title: "მაღაზია და VIP",
    pages: [
      { route: "/vip", label: "VIP", sublabel: "Subscription" },
      { route: "/power-ups", label: "პაუერაფები", sublabel: "Power-Ups Shop" },
    ],
  },
  {
    title: "თამაშის ფლოუ",
    pages: [
      { route: "/world", label: "მსოფლიო", sublabel: "World Map" },
      { route: "/category/science", label: "კატეგორია", sublabel: "Category Detail" },
      { route: "/play/science/1", label: "თამაში", sublabel: "Quiz Game" },
      { route: "/game", label: "სესია", sublabel: "Game Session" },
    ],
  },
  {
    title: "TV / მულტიპლეიერი",
    pages: [
      { route: "/tv", label: "TV ლობი", sublabel: "TV Lobby" },
      { route: "/join", label: "შეერთება", sublabel: "Join Game" },
      { route: "/tv/demo", label: "TV ეკრანი", sublabel: "TV Display" },
    ],
  },
  {
    title: "იურიდიული / დახმარება",
    pages: [
      { route: "/privacy-policy", label: "კონფიდენციალურობა", sublabel: "Privacy Policy" },
      { route: "/terms", label: "წესები", sublabel: "Terms of Service" },
      { route: "/support", label: "დახმარება", sublabel: "Support" },
    ],
  },
  {
    title: "შეცდომები / სპეციალური",
    pages: [
      { route: "/not-found-page-404", label: "404", sublabel: "Not Found" },
      { route: "/styleguide", label: "სტაილგაიდი", sublabel: "Styleguide" },
    ],
  },
];

// iPhone mockup component
function IPhoneMockup({ 
  route, 
  label, 
  sublabel, 
  scale 
}: { 
  route: string; 
  label: string; 
  sublabel?: string; 
  scale: number;
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
          
          {/* Iframe with the actual page */}
          <iframe
            src={route}
            title={label}
            className="w-full h-full border-0"
            style={{ 
              pointerEvents: 'none',
              backgroundColor: 'hsl(var(--background))'
            }}
          />
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
}

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
                      key={page.route}
                      route={page.route}
                      label={page.label}
                      sublabel={page.sublabel}
                      scale={scale}
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
