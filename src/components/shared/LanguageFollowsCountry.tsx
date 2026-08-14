import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageOverride } from "@/utils/languageOverride";
import { languageToApply } from "@/utils/countryLanguage";

/**
 * Keeps the app's language on the country the account says it is in.
 *
 * Picking a country in settings is the only language control the app has, and
 * CountrySelectModal has always set both at once. What it could not do is
 * bring an account back together once the two had drifted: the country is on
 * the profile, the language is in this device's localStorage, so a phone that
 * had been opened once with ?lang=en went on showing English behind a profile
 * that said Georgia — and nothing short of picking a different country and
 * picking Georgia again would fix it.
 *
 * So the country decides, every time the profile loads or its country
 * changes. Renders nothing; it lives inside AuthProvider because
 * LanguageProvider is outside it and cannot see the profile.
 */
export function LanguageFollowsCountry() {
  const { profile } = useAuth();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    const next = languageToApply({
      override: languageOverride(),
      countryCode: profile?.country_code,
      current: language,
    });
    if (next) setLanguage(next);
  }, [profile?.country_code, language, setLanguage]);

  return null;
}
