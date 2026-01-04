import { Clock } from "lucide-react";

interface TimeIconProps {
  size?: number;
  disabled?: boolean;
  className?: string;
}

export function TimeIcon({ size = 32, disabled = false, className }: TimeIconProps) {
  return (
    <div 
      className={`rounded-full flex items-center justify-center ${className || ""}`}
      style={{
        width: size,
        height: size,
        background: disabled 
          ? "hsl(var(--muted-foreground))" 
          : "linear-gradient(180deg, #E8B4F8 0%, #C084FC 100%)",
        boxShadow: disabled ? "none" : "0 4px 12px rgba(192, 132, 252, 0.4)"
      }}
    >
      <Clock 
        className="text-white" 
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={2.5} 
      />
    </div>
  );
}
