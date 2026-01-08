import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ActiveUser } from '@/hooks/useActiveUsers';
import { countryCoordinates } from '@/lib/countryCoordinates';

interface AdminMapProps {
  users: ActiveUser[];
}

export function AdminMap({ users }: AdminMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map centered on world view
    const map = L.map(mapRef.current, {
      center: [30, 30],
      zoom: 2,
      minZoom: 1,
      maxZoom: 6,
      zoomControl: false,
    });

    // Light theme tiles from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control to top-left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when users change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    // Group users by country
    const countryGroups = new Map<string, { count: number; hasOnline: boolean; names: string[] }>();
    users.forEach(user => {
      const code = user.country_code?.toLowerCase() || user.region?.toLowerCase() || 'ge';
      const existing = countryGroups.get(code) || { count: 0, hasOnline: false, names: [] };
      const isOnline = user.status === 'online' && user.last_seen >= twoMinutesAgo;
      countryGroups.set(code, {
        count: existing.count + 1,
        hasOnline: existing.hasOnline || isOnline,
        names: [...existing.names, user.nickname].slice(0, 5),
      });
    });

    // Add markers for each country
    countryGroups.forEach((data, code) => {
      const coords = countryCoordinates[code] || countryCoordinates.ge;
      
      const marker = L.circleMarker([coords.lat, coords.lon], {
        radius: Math.min(15, 6 + data.count * 2),
        fillColor: data.hasOnline ? '#10b981' : '#6b7280',
        color: '#ffffff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.8,
      }).addTo(map);

      // Popup with user info
      const popupContent = `
        <div style="font-family: system-ui; font-size: 12px;">
          <strong>${coords.name}</strong><br/>
          <span style="color: ${data.hasOnline ? '#10b981' : '#6b7280'}">
            ${data.count} მომხმარებელი
          </span><br/>
          <small>${data.names.join(', ')}${data.count > 5 ? '...' : ''}</small>
        </div>
      `;
      marker.bindPopup(popupContent);
    });
  }, [users]);

  return (
    <div ref={mapRef} className="absolute inset-0 z-0" />
  );
}
