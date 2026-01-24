import { Home, Trophy, User, Globe, Map } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Map, label: "Map", path: "/adventure-map" },
  { icon: Globe, label: "Explore", path: "/discover" },
  { icon: Trophy, label: "Rankings", path: "/leaderboards" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="liquid-glass rounded-2xl">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  // Larger tap targets for mobile (aiming for ~44px+)
                  "flex flex-col items-center justify-center min-w-[72px] min-h-[52px] px-5 py-3 transition-all touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] mt-1 font-display tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
