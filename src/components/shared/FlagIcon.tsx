import { cn } from "@/lib/utils";

interface FlagIconProps {
  countryCode: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-4",
  md: "w-8 h-5",
  lg: "w-12 h-8",
};

export function FlagIcon({ countryCode, size = "md", className }: FlagIconProps) {
  const code = countryCode?.toLowerCase() || "us";
  
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={`${countryCode} flag`}
      className={cn(sizeClasses[size], "rounded-sm object-cover", className)}
    />
  );
}
