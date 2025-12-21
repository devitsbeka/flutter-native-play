import { motion } from "framer-motion";
import { LayoutGrid, Map } from "lucide-react";

interface ViewTabsProps {
  activeView: "list" | "map";
  onViewChange: (view: "list" | "map") => void;
}

export function ViewTabs({ activeView, onViewChange }: ViewTabsProps) {
  return (
    <div 
      className="inline-flex rounded-2xl bg-muted p-1.5"
      style={{
        boxShadow: "inset 0 2px 4px hsl(0 0% 0% / 0.05)",
      }}
    >
      <TabButton
        isActive={activeView === "list"}
        onClick={() => onViewChange("list")}
        icon={<LayoutGrid className="h-4 w-4" />}
        label="Categories"
      />
      <TabButton
        isActive={activeView === "map"}
        onClick={() => onViewChange("map")}
        icon={<Map className="h-4 w-4" />}
        label="Map"
      />
    </div>
  );
}

function TabButton({
  isActive,
  onClick,
  icon,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
        isActive
          ? "text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 rounded-xl bg-primary"
          style={{
            boxShadow: "0 4px 0 0 hsl(var(--primary) / 0.5)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10">{label}</span>
    </button>
  );
}
