import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ActiveUser } from '@/hooks/useActiveUsers';
import { countryCoordinates } from '@/lib/countryCoordinates';

interface AdminMapProps {
  users: ActiveUser[];
}

// Custom CSS for markers and popups
const customStyles = `
  .user-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: 700;
    font-family: system-ui, -apple-system, sans-serif;
    color: white;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .user-marker:hover {
    transform: scale(1.15);
    z-index: 1000 !important;
  }
  
  .user-marker.online {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4), 0 0 0 3px rgba(16, 185, 129, 0.2);
  }
  
  .user-marker.offline {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4), 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
  
  .user-marker .pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: inherit;
    animation: pulse 2s ease-out infinite;
    z-index: -1;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2); opacity: 0; }
  }
  
  .leaflet-popup-content-wrapper {
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
    padding: 0;
    overflow: hidden;
  }
  
  .leaflet-popup-content {
    margin: 0;
    min-width: 200px;
  }
  
  .leaflet-popup-tip {
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .leaflet-popup-close-button {
    width: 28px !important;
    height: 28px !important;
    font-size: 18px !important;
    color: #9ca3af !important;
    top: 8px !important;
    right: 8px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center;
    justify-content: center;
  }
  
  .leaflet-popup-close-button:hover {
    color: #374151 !important;
  }
  
  .popup-content {
    padding: 16px 20px;
  }
  
  .popup-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .popup-flag {
    width: 24px;
    height: 18px;
    border-radius: 3px;
    object-fit: cover;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .popup-country {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.02em;
  }
  
  .popup-count {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 12px;
  }
  
  .popup-count strong {
    color: #10b981;
    font-weight: 600;
  }
  
  .popup-users {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .popup-user-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: #f3f4f6;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
  }
  
  .popup-user-avatar {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: white;
  }
  
  .popup-user-status {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  
  .popup-user-status.online {
    background: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  }
  
  .popup-user-status.offline {
    background: #9ca3af;
  }
  
  .leaflet-control-zoom {
    border: none !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
    border-radius: 12px !important;
    overflow: hidden;
  }
  
  .leaflet-control-zoom a {
    background: white !important;
    color: #374151 !important;
    width: 36px !important;
    height: 36px !important;
    line-height: 36px !important;
    font-size: 18px !important;
    border: none !important;
  }
  
  .leaflet-control-zoom a:hover {
    background: #f9fafb !important;
    color: #111827 !important;
  }
`;

export function AdminMap({ users }: AdminMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Inject custom styles
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = customStyles;
      document.head.appendChild(style);
      styleRef.current = style;
    }

    // Create map - MAX zoomed out
    const map = L.map(mapRef.current, {
      center: [25, 40],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: false,
    });

    // Clean light theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Add labels on top
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      pane: 'overlayPane',
    }).addTo(map);

    // Add zoom control
    L.control.zoom({ position: 'topleft' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, []);

  // Update markers when users change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    // Group users by country
    const countryGroups = new Map<string, { 
      count: number; 
      hasOnline: boolean; 
      users: { name: string; isOnline: boolean; avatar?: string }[] 
    }>();
    
    users.forEach(user => {
      const code = user.country_code?.toLowerCase() || user.region?.toLowerCase() || 'ge';
      const existing = countryGroups.get(code) || { count: 0, hasOnline: false, users: [] };
      const isOnline = user.status === 'online' && user.last_seen >= twoMinutesAgo;
      countryGroups.set(code, {
        count: existing.count + 1,
        hasOnline: existing.hasOnline || isOnline,
        users: [...existing.users, { 
          name: user.nickname, 
          isOnline,
          avatar: user.avatar_url || undefined
        }].slice(0, 8),
      });
    });

    // Add markers for each country
    countryGroups.forEach((data, code) => {
      const coords = countryCoordinates[code] || countryCoordinates.ge;
      const isOnline = data.hasOnline;
      
      // Size based on count
      const size = Math.min(48, 32 + data.count * 4);
      const fontSize = size > 36 ? 16 : 14;
      
      const icon = L.divIcon({
        className: '',
        html: `
          <div class="user-marker ${isOnline ? 'online' : 'offline'}" 
               style="width: ${size}px; height: ${size}px; font-size: ${fontSize}px; position: relative;">
            ${isOnline ? '<div class="pulse"></div>' : ''}
            ${data.count}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2 - 5],
      });

      const marker = L.marker([coords.lat, coords.lon], { icon }).addTo(map);

      // Build user chips HTML
      const userChipsHtml = data.users.map(u => `
        <div class="popup-user-chip">
          <div class="popup-user-avatar">${u.name[0]?.toUpperCase() || '?'}</div>
          ${u.name}
          <div class="popup-user-status ${u.isOnline ? 'online' : 'offline'}"></div>
        </div>
      `).join('');

      // Popup content
      const popupContent = `
        <div class="popup-content">
          <div class="popup-header">
            <img class="popup-flag" src="https://flagcdn.com/32x24/${code}.png" 
                 onerror="this.src='https://flagcdn.com/32x24/ge.png'" alt="${code}"/>
            <span class="popup-country">${coords.name}</span>
          </div>
          <div class="popup-count">
            <strong>${data.count}</strong> მომხმარებელი
          </div>
          <div class="popup-users">
            ${userChipsHtml}
            ${data.count > 8 ? `<div class="popup-user-chip">+${data.count - 8} სხვა</div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        closeButton: true,
        className: '',
      });
    });
  }, [users]);

  return (
    <div ref={mapRef} className="absolute inset-0 z-0 rounded-lg overflow-hidden" />
  );
}
