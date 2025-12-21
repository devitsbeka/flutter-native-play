import { Home, Search, Trophy, User, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Discover", path: "/discover" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboards" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface BottomNavigationProps {
  onPlayClick?: () => void;
}

export function BottomNavigation({ onPlayClick }: BottomNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-card border-t border-border shadow-lg">
        <div className="flex items-center justify-around px-2 py-2 relative">
          {navItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Center FAB */}
          <div className="relative -mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlayClick}
              className="fab w-16 h-16 flex items-center justify-center shadow-xl"
            >
              <Plus className="w-8 h-8" />
            </motion.button>
          </div>

          {navItems.slice(2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
