import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSetting {
  key: string;
  value: string | null;
  is_secret: boolean;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value, is_secret");

      if (error) throw error;

      const settingsMap: Record<string, string | null> = {};
      data?.forEach((setting: AppSetting) => {
        settingsMap[setting.key] = setting.value;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error("Error fetching app settings:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const isConfigured = (key: string) => {
    return settings[key] && settings[key]!.length > 0;
  };

  const isStripeConfigured = () => {
    return isConfigured("stripe_secret_key");
  };

  return {
    settings,
    isLoading,
    error,
    isConfigured,
    isStripeConfigured,
    refetch: fetchSettings,
  };
}
