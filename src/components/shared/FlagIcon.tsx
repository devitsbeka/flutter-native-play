import { cn } from "@/lib/utils";

interface FlagIconProps {
  countryCode: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-10 h-10",
};

export function FlagIcon({ countryCode, size = "md", className }: FlagIconProps) {
  const code = countryCode?.toLowerCase() || "us";
  
  return (
    <img
      src={`https://hatscripts.github.io/circle-flags/flags/${code}.svg`}
      alt={`${countryCode} flag`}
      className={cn(sizeClasses[size], "rounded-full object-cover", className)}
    />
  );
}
