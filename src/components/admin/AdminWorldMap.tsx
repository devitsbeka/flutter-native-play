import { ActiveUser } from '@/hooks/useActiveUsers';
import { countryCoordinates } from '@/lib/countryCoordinates';
import { cn } from '@/lib/utils';

interface AdminWorldMapProps {
  users: ActiveUser[];
}

// Convert lat/lon to x/y percentage on a simple mercator projection
function latLonToXY(lat: number, lon: number): { x: number; y: number } {
  // Normalize longitude to 0-100%
  const x = ((lon + 180) / 360) * 100;
  
  // Mercator projection for latitude (clamped to avoid infinity at poles)
  const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 50 - (mercN / Math.PI) * 50;
  
  return { x, y };
}

export function AdminWorldMap({ users }: AdminWorldMapProps) {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  
  // Group users by country and get positions
  const countryGroups = new Map<string, { users: ActiveUser[]; coords: { lat: number; lon: number } }>();
  
  users.forEach(user => {
    const code = user.country_code?.toLowerCase() || user.region?.toLowerCase() || 'ge';
    const coords = countryCoordinates[code] || countryCoordinates.ge;
    
    if (!countryGroups.has(code)) {
      countryGroups.set(code, { users: [], coords: { lat: coords.lat, lon: coords.lon } });
    }
    countryGroups.get(code)!.users.push(user);
  });

  const markers = Array.from(countryGroups.entries()).map(([code, data]) => {
    const { x, y } = latLonToXY(data.coords.lat, data.coords.lon);
    const hasOnline = data.users.some(u => u.status === 'online' && u.last_seen >= twoMinutesAgo);
    return {
      code,
      x,
      y,
      count: data.users.length,
      hasOnline,
      name: countryCoordinates[code]?.name || code.toUpperCase(),
    };
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dark world map background */}
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Background */}
        <rect fill="url(#mapGradient)" width="1000" height="500" />
        
        {/* Gradient definition */}
        <defs>
          <radialGradient id="mapGradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f0d1a" />
          </radialGradient>
          <radialGradient id="pinGlow">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pinGlowOffline">
            <stop offset="0%" stopColor="#6b7280" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Simple grid lines for world map feel */}
        <g stroke="#ffffff" strokeOpacity="0.03" strokeWidth="0.5">
          {/* Latitude lines */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const { y } = latLonToXY(lat, 0);
            return <line key={`lat-${lat}`} x1="0" y1={y * 5} x2="1000" y2={y * 5} />;
          })}
          {/* Longitude lines */}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lon => {
            const { x } = latLonToXY(0, lon);
            return <line key={`lon-${lon}`} x1={x * 10} y1="0" x2={x * 10} y2="500" />;
          })}
        </g>
        
        {/* Simplified world map outline - major landmasses */}
        <g fill="#ffffff" fillOpacity="0.05" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.5">
          {/* Europe rough outline */}
          <ellipse cx="520" cy="140" rx="60" ry="40" />
          {/* Asia rough outline */}
          <ellipse cx="680" cy="160" rx="120" ry="60" />
          {/* Africa rough outline */}
          <ellipse cx="520" cy="260" rx="50" ry="70" />
          {/* North America rough outline */}
          <ellipse cx="220" cy="150" rx="80" ry="50" />
          {/* South America rough outline */}
          <ellipse cx="280" cy="320" rx="40" ry="70" />
          {/* Australia rough outline */}
          <ellipse cx="820" cy="330" rx="40" ry="30" />
        </g>

        {/* User location pins */}
        {markers.map((marker) => (
          <g key={marker.code} transform={`translate(${marker.x * 10}, ${marker.y * 5})`}>
            {/* Glow effect */}
            <circle
              r={marker.hasOnline ? 20 : 12}
              fill={marker.hasOnline ? 'url(#pinGlow)' : 'url(#pinGlowOffline)'}
              className={marker.hasOnline ? 'animate-pulse' : ''}
            />
            {/* Main pin */}
            <circle
              r={Math.min(8, 4 + marker.count)}
              fill={marker.hasOnline ? '#10b981' : '#6b7280'}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
            {/* Count badge for multiple users */}
            {marker.count > 1 && (
              <>
                <circle
                  cx="8"
                  cy="-8"
                  r="8"
                  fill="#7c3aed"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
                <text
                  x="8"
                  y="-5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {marker.count}
                </text>
              </>
            )}
          </g>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px] text-white/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>ონლაინ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span>ბოლოს აქტიური</span>
        </div>
      </div>
    </div>
  );
}
