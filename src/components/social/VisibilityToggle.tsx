import { Lock, Globe } from "lucide-react";

type VisibilityFilter = "all" | "private" | "published";

interface VisibilityToggleProps {
  value: string;
  onChange: (value: VisibilityFilter) => void;
}

export function VisibilityToggle({ value, onChange }: VisibilityToggleProps) {
  const isPrivate = value === "private";
  const isPublished = value === "published";

  return (
    <div className="flex items-center bg-muted/50 rounded-full p-1 border border-border/30">
      {/* Private Option */}
      <button
        onClick={() => onChange(isPrivate ? "all" : "private")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
          isPrivate
            ? "bg-card shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground/70"
        }`}
      >
        <Lock className={`w-4 h-4 ${isPrivate ? "text-orange-500" : ""}`} />
        <span className="text-sm font-medium">პირადი</span>
      </button>
      
      {/* Published Option */}
      <button
        onClick={() => onChange(isPublished ? "all" : "published")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
          isPublished
            ? "bg-card shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground/70"
        }`}
      >
        <Globe className={`w-4 h-4 ${isPublished ? "text-green-500" : ""}`} />
        <span className="text-sm font-medium">გამოქვეყნებული</span>
      </button>
    </div>
  );
}
