import timeDrainIcon from "@/assets/powers/time-drain.png";

interface TimeIconProps {
  size?: number;
  disabled?: boolean;
  className?: string;
}

// The time-drain power-up's own 3D badge — the same artwork the other
// power-ups use, instead of a flat gradient circle with a lucide clock.
export function TimeIcon({ size = 32, disabled = false, className }: TimeIconProps) {
  return (
    <img
      src={timeDrainIcon}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 object-contain select-none ${disabled ? "opacity-50 grayscale" : ""} ${className || ""}`}
      style={{ width: size, height: size }}
    />
  );
}
