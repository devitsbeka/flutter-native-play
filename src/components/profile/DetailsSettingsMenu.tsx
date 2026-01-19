import { useNavigate } from "react-router-dom";
import { User, Lock, HelpCircle, Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsMenuItem {
  icon: React.ElementType;
  label: string;
  route: string;
  iconBg: string;
  iconColor: string;
}

const menuItems: SettingsMenuItem[] = [
  {
    icon: User,
    label: "სახელის შეცვლა",
    route: "/settings",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    icon: Lock,
    label: "პაროლის შეცვლა",
    route: "/settings",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    icon: HelpCircle,
    label: "დახმარება",
    route: "/support",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    icon: Shield,
    label: "კონფიდენციალურობა",
    route: "/privacy",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
];

export function DetailsSettingsMenu() {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/30">
      {menuItems.map((item, index) => (
        <button
          key={item.label}
          onClick={() => navigate(item.route)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50",
            index !== menuItems.length - 1 && "border-b border-border/20"
          )}
        >
          <div className={cn("p-2 rounded-full", item.iconBg)}>
            <item.icon className={cn("w-4 h-4", item.iconColor)} />
          </div>
          <span className="flex-1 text-foreground text-left">{item.label}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
