import { Home, Trophy, User, Globe } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
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
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-4 min-w-[64px] transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                <span className="text-xs mt-1 font-display tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
