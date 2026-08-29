import { useState, Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users,
  BarChart3,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Upload,
  Search,
  Sparkles,
  Wrench,
  ImageIcon,
  AlertTriangle,
  Wand2,
  Bell,
  Workflow,
  FileArchive,
  Flag,
  Palette,
  Share2,
  Coins,
  Settings,
  Smartphone,
  Layers,
  ClipboardCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminPageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
}

const mainNavItems: NavItem[] = [
  { 
    to: '/admin', 
    icon: LayoutDashboard, 
    label: 'დეშბორდი',
    end: true 
  },
  { 
    to: '/admin/question-studio', 
    icon: Layers, 
    label: 'Question Studio' 
  },
  { 
    to: '/admin/flow', 
    icon: Workflow, 
    label: 'Flow' 
  },
  { 
    to: '/admin/import', 
    icon: Upload, 
    label: 'იმპორტი' 
  },
  { 
    to: '/admin/users', 
    icon: Users, 
    label: 'მომხმარებლები' 
  },
  { 
    to: '/admin/user-analytics', 
    icon: BarChart3, 
    label: 'ანალიტიკა' 
  },
  { 
    to: '/admin/reports', 
    icon: Flag, 
    label: 'რეპორტები' 
  },
  {
    to: '/admin/design',
    icon: Palette,
    label: 'დიზაინი'
  },
  {
    to: '/admin/social',
    icon: Share2,
    label: 'Social Frames'
  },
  { 
    to: '/admin/guest', 
    icon: Smartphone, 
    label: 'Guest Preview' 
  },
  { 
    to: '/admin/economy', 
    icon: Coins, 
    label: 'ეკონომიკა' 
  },
  { 
    to: '/admin/settings', 
    icon: Settings, 
    label: 'პარამეტრები' 
  },
];

const toolsNavItems: NavItem[] = [
  { 
    to: '/admin/review', 
    icon: ClipboardCheck, 
    label: 'Review' 
  },
  { 
    to: '/admin/content', 
    icon: FolderOpen, 
    label: 'კონტენტი' 
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
    to: '/admin/fix-icons', 
    icon: FileArchive, 
    label: 'გამოსწორება' 
  },
  { 
    to: '/admin/push', 
    icon: Bell, 
    label: 'Push შეტყობინებები' 
  },
];

export default function Admin() {
  // Collapsed by default: the admin pages (Social Frames especially) want
  // the width; the rail expands on demand from the menu button.
  const [collapsed, setCollapsed] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  const location = useLocation();

  // Check if any tools subnav item is active
  const isToolsActive = toolsNavItems.some(item => location.pathname === item.to);

  const renderNavItem = (item: NavItem) => (
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
  );

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
            {/* Main nav items */}
            {mainNavItems.map(renderNavItem)}

            {/* Tools collapsible section */}
            {collapsed ? (
              // When collapsed, show tools as single icon that expands on hover/click
              <div className="relative group">
                <button
                  onClick={() => setToolsOpen(!toolsOpen)}
                  className={cn(
                    "flex items-center justify-center w-full px-2 py-2 rounded-lg transition-all text-sm",
                    "hover:bg-accent/50",
                    isToolsActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Wrench className="h-5 w-5 shrink-0" />
                </button>
              </div>
            ) : (
              <Collapsible open={toolsOpen || isToolsActive} onOpenChange={setToolsOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg transition-all text-sm",
                      "hover:bg-accent/50",
                      isToolsActive 
                        ? "text-primary" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Wrench className="h-4 w-4 shrink-0" />
                    <span className="font-medium flex-1 text-left">Tools</span>
                    {toolsOpen || isToolsActive ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-0.5 space-y-0.5">
                  {toolsNavItems.map(renderNavItem)}
                </CollapsibleContent>
              </Collapsible>
            )}
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
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="p-6">
          <Suspense fallback={<AdminPageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}