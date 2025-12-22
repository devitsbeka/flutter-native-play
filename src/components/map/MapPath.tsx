import { Season } from "./SeasonalAdventureMap";

interface Level {
  id: number;
  season: Season;
  x: number;
  y: number;
  isBoss: boolean;
}

interface MapPathProps {
  levels: Level[];
  completedLevels: number;
}

export function MapPath({ levels, completedLevels }: MapPathProps) {
  // Generate path data
  const generatePathD = () => {
    if (levels.length < 2) return "";

    let path = "";
    levels.forEach((level, index) => {
      const x = (level.x / 100) * 100; // Keep as percentage
      const y = level.y;
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevLevel = levels[index - 1];
        const prevX = (prevLevel.x / 100) * 100;
        const prevY = prevLevel.y;
        
        // Create smooth curve
        const midY = (prevY + y) / 2;
        path += ` Q ${prevX} ${midY} ${x} ${y}`;
      }
    });
    
    return path;
  };

  const pathD = generatePathD();
  const totalPathLength = levels.length * 40; // Approximate path length
  const completedLength = (completedLevels / levels.length) * totalPathLength;

  return (
    <svg
      className="absolute inset-0 w-full pointer-events-none"
      style={{ height: `${4 * 100}vh` }}
      viewBox="0 0 100 400"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Gradient for completed path - Candy-like colors */}
        <linearGradient id="pathGradientCompleted" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="25%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="75%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Stripe pattern for candy-crush look */}
        <pattern id="stripePattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="url(#pathGradientCompleted)" />
          <rect x="0" y="0" width="10" height="20" fill="rgba(255,255,255,0.2)" />
        </pattern>

        {/* Dotted pattern for locked path */}
        <pattern id="dottedPattern" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2" fill="hsl(var(--muted-foreground))" opacity="0.4" />
        </pattern>

        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Strong glow for completed path */}
        <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background path (locked sections) - Thicker dotted line */}
      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 10"
        opacity="0.5"
      />

      {/* Outer glow for completed path */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#pathGradientCompleted)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#strongGlow)"
        strokeDasharray={`${completedLength} ${totalPathLength}`}
        opacity="0.6"
      />

      {/* Main completed path - Candy stripe effect */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#pathGradientCompleted)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
        strokeDasharray={`${completedLength} ${totalPathLength}`}
      />

      {/* White highlight on completed path */}
      <path
        d={pathD}
        fill="none"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${completedLength} ${totalPathLength}`}
        opacity="0.4"
        style={{ transform: "translateY(-0.3%)" }}
      />

      {/* Animated sparkle dots along completed path */}
      <path
        d={pathD}
        fill="none"
        stroke="white"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeDasharray="1 15"
        opacity="0.8"
        strokeDashoffset="0"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-16"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>

      {/* Shimmer effect on path */}
      <path
        d={pathD}
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 80"
        opacity="0.6"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-83"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}