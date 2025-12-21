import { cn } from "@/lib/utils";

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  variant?: "default" | "primary" | "accent";
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-2xl",
        variant === "default" && "bg-secondary",
        variant === "primary" && "bg-primary/10",
        variant === "accent" && "bg-accent/10",
        className
      )}
    >
      {icon && <div className="mb-2">{icon}</div>}
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}
