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
      const x = (level.x / 100) * window.innerWidth;
      const y = level.y * (window.innerHeight / 100);
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevLevel = levels[index - 1];
        const prevX = (prevLevel.x / 100) * window.innerWidth;
        const prevY = prevLevel.y * (window.innerHeight / 100);
        
        // Create smooth curve
        const midY = (prevY + y) / 2;
        path += ` Q ${prevX} ${midY} ${x} ${y}`;
      }
    });
    
    return path;
  };

  return (
    <svg
      className="absolute inset-0 w-full pointer-events-none"
      style={{ height: `${4 * 100}vh` }}
      preserveAspectRatio="none"
    >
      <defs>
        {/* Gradient for completed path */}
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="25%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="75%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background path (not completed) */}
      <path
        d={generatePathD()}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="0 24"
        className="opacity-40"
      />

      {/* Completed path */}
      <path
        d={generatePathD()}
        fill="none"
        stroke="url(#pathGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
        strokeDasharray={`${(completedLevels / levels.length) * 100}% 100%`}
        className="transition-all duration-1000"
      />

      {/* Animated dots along path */}
      <path
        d={generatePathD()}
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 30"
        className="opacity-60"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-32"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
