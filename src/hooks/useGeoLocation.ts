import { useState, useEffect } from "react";

interface GeoLocationResult {
  countryCode: string | null;
  loading: boolean;
  error: string | null;
}

export function useGeoLocation(): GeoLocationResult {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const detectLocation = async () => {
      try {
        // Use ip-api.com for free IP geolocation
        const response = await fetch("https://ip-api.com/json/?fields=countryCode", {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch location");
        }
        
        const data = await response.json();
        
        if (data.countryCode) {
          setCountryCode(data.countryCode);
        } else {
          setError("Could not determine country");
        }
      } catch (err) {
        // Ignore AbortError - this is expected on cleanup
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error("Geolocation error:", err);
        setError(err instanceof Error ? err.message : "Location detection failed");
      } finally {
        setLoading(false);
      }
    };

    detectLocation();

    // Cleanup - abort fetch on unmount
    return () => {
      controller.abort();
    };
  }, []);

  return { countryCode, loading, error };
}

// Standalone function to get country code (for use outside React components)
export async function getCountryCodeFromIP(): Promise<string | null> {
  try {
    const response = await fetch("https://ip-api.com/json/?fields=countryCode");
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.countryCode || null;
  } catch (err) {
    console.error("IP geolocation error:", err);
    return null;
  }
}
