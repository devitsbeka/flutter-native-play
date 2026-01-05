import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  Menu,
  ChevronLeft,
  Upload,
  Search,
  Sparkles,
  Wrench,
  ImageIcon,
  AlertTriangle,
  Wand2,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { 
    to: '/admin', 
    icon: LayoutDashboard, 
    label: 'დეშბორდი',
    end: true 
  },
  { 
    to: '/admin/content', 
    icon: FolderOpen, 
    label: 'კონტენტი' 
  },
  { 
    to: '/admin/import', 
    icon: Upload, 
    label: 'იმპორტი' 
  },
  { 
    to: '/admin/ai-generations', 
    icon: Wand2, 
    label: 'AI გენერაცია' 
  },
  { 
    to: '/admin/tools', 
    icon: Wrench, 
    label: 'ინსტრუმენტები' 
  },
  { 
    to: '/admin/duplicates', 
    icon: Search, 
    label: 'დუბლიკატები' 
  },
  { 
    to: '/admin/icon-assign', 
    icon: ImageIcon, 
    label: 'აიკონები' 
  },
  { 
    to: '/admin/missing-icons', 
    icon: AlertTriangle, 
    label: 'გამოტოვებული' 
  },
  { 
    to: '/admin/users', 
    icon: Users, 
    label: 'მომხმარებლები' 
  },
  { 
    to: '/admin/push', 
    icon: Bell, 
    label: 'Push შეტყობინებები' 
  },
];

export default function Admin() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* Modern Sidebar */}
      <aside 
        className={cn(
          "bg-card/50 backdrop-blur-sm border-r border-border/50 transition-all duration-300 flex flex-col",
          collapsed ? "w-[60px]" : "w-56"
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-border/50">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Admin</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-sm",
                    "hover:bg-accent/50",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )
                }
              >
                <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-border/50">
          <NavLink 
            to="/"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all",
              collapsed && "justify-center px-2"
            )}
          >
            <ChevronLeft className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
            {!collapsed && <span className="font-medium">მთავარი</span>}
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-muted/30">
        <Outlet />
      </main>
    </div>
  );
}
