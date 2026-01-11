import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw, Home, LogIn, Compass, Users, Trophy, User, Bell, Crown, Zap, Globe, FileText, Shield, HelpCircle, AlertCircle, Gamepad2, Tv, UserPlus } from "lucide-react";

// Page definitions with icons and descriptions
const pageCategories = [
  {
    title: "მთავარი გვერდები",
    pages: [
      { id: "home", route: "/", label: "მთავარი", sublabel: "Home", icon: Home, description: "მთავარი გვერდი კატეგორიების სიით და თამაშის დაწყებით" },
      { id: "auth", route: "/auth", label: "ავტორიზაცია", sublabel: "Authentication", icon: LogIn, description: "რეგისტრაცია და შესვლის გვერდი" },
      { id: "discover", route: "/discover", label: "აღმოჩენა", sublabel: "Discover", icon: Compass, description: "ახალი კატეგორიებისა და ტრივიების აღმოჩენა" },
      { id: "team", route: "/team", label: "თიმი", sublabel: "Social Feed", icon: Users, description: "სოციალური ფიდი მომხმარებლის ტრივიებით" },
      { id: "leaderboards", route: "/leaderboards", label: "ლიდერბორდი", sublabel: "Leaderboards", icon: Trophy, description: "რეიტინგები კატეგორიების მიხედვით" },
      { id: "profile", route: "/profile", label: "პროფილი", sublabel: "Profile", icon: User, description: "მომხმარებლის პროფილი და სტატისტიკა" },
      { id: "notifications", route: "/notifications", label: "შეტყობინებები", sublabel: "Notifications", icon: Bell, description: "შეტყობინებების ცენტრი" },
    ],
  },
  {
    title: "მაღაზია და VIP",
    pages: [
      { id: "vip", route: "/vip", label: "VIP", sublabel: "Subscription", icon: Crown, description: "VIP სტატუსი და უპირატესობები" },
      { id: "powerups", route: "/power-ups", label: "პაუერაფები", sublabel: "Power-Ups Shop", icon: Zap, description: "პაუერაფების მაღაზია" },
    ],
  },
  {
    title: "თამაშის ფლოუ",
    pages: [
      { id: "world", route: "/world", label: "მსოფლიო", sublabel: "World Map", icon: Globe, description: "მსოფლიო რუკა კონტინენტებით" },
      { id: "category", route: "/category/:id", label: "კატეგორია", sublabel: "Category Detail", icon: Gamepad2, description: "კატეგორიის დეტალური გვერდი დონეებით" },
      { id: "play", route: "/play/:categoryId/:levelId", label: "თამაში", sublabel: "Quiz Game", icon: Gamepad2, description: "ტრივიის თამაშის გვერდი" },
    ],
  },
  {
    title: "TV / მულტიპლეიერი",
    pages: [
      { id: "tv", route: "/tv", label: "TV ლობი", sublabel: "TV Lobby", icon: Tv, description: "TV მოდი მსხვილ ეკრანზე" },
      { id: "join", route: "/join", label: "შეერთება", sublabel: "Join Game", icon: UserPlus, description: "თამაშზე შეერთების გვერდი" },
    ],
  },
  {
    title: "იურიდიული / დახმარება",
    pages: [
      { id: "privacy", route: "/privacy-policy", label: "კონფიდენციალურობა", sublabel: "Privacy Policy", icon: Shield, description: "კონფიდენციალურობის პოლიტიკა" },
      { id: "terms", route: "/terms", label: "წესები", sublabel: "Terms of Service", icon: FileText, description: "მომსახურების პირობები" },
      { id: "support", route: "/support", label: "დახმარება", sublabel: "Support", icon: HelpCircle, description: "დახმარების ცენტრი და FAQ" },
    ],
  },
  {
    title: "შეცდომები",
    pages: [
      { id: "notfound", route: "/404", label: "404", sublabel: "Not Found", icon: AlertCircle, description: "გვერდი ვერ მოიძებნა" },
    ],
  },
];

// iPhone mockup component with placeholder content
function IPhoneMockup({ 
  route,
  label, 
  sublabel,
  icon: Icon,
  description,
  scale 
}: { 
  route: string;
  label: string; 
  sublabel?: string; 
  icon: React.ComponentType<{ className?: string }>;
  description: string;
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
          className="relative rounded-[45px] overflow-hidden bg-gradient-to-br from-primary/20 via-background to-primary/10"
          style={{ width, height }}
        >
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-[20px] z-50" />
          
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-1.5 bg-foreground/30 rounded-full z-50" />
          
          {/* Page placeholder content */}
          <div className="w-full h-full flex flex-col items-center justify-center p-8 pt-16">
            {/* Large Icon */}
            <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center mb-6">
              <Icon className="w-12 h-12 text-primary" />
            </div>
            
            {/* Page Title */}
            <h3 className="text-2xl font-bold text-foreground mb-2 text-center">{label}</h3>
            <p className="text-sm text-muted-foreground mb-4">{sublabel}</p>
            
            {/* Route Badge */}
            <div className="px-3 py-1.5 rounded-full bg-muted text-xs font-mono text-muted-foreground mb-6">
              {route}
            </div>
            
            {/* Description */}
            <p className="text-sm text-center text-muted-foreground leading-relaxed max-w-[280px]">
              {description}
            </p>
            
            {/* Mock UI Elements */}
            <div className="mt-8 w-full space-y-3 px-4">
              <div className="h-10 rounded-xl bg-muted/50 animate-pulse" />
              <div className="h-10 rounded-xl bg-muted/30 animate-pulse" />
              <div className="flex gap-3">
                <div className="h-20 flex-1 rounded-xl bg-muted/40 animate-pulse" />
                <div className="h-20 flex-1 rounded-xl bg-muted/40 animate-pulse" />
              </div>
            </div>
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
                      key={page.id}
                      route={page.route}
                      label={page.label}
                      sublabel={page.sublabel}
                      icon={page.icon}
                      description={page.description}
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
