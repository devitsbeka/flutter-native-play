import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { countryCoordinates } from "@/lib/countryCoordinates";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Search, Check, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { translateErrorMessage } from "@/utils/errorTranslations";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageForCountry } from "@/utils/countryLanguage";

interface CountrySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCountryCode: string | null;
}

// Priority countries to show at top
const priorityCountries = ['ge', 'us', 'de', 'uk', 'tr', 'fr', 'it', 'es'];

export function CountrySelectModal({ isOpen, onClose, currentCountryCode }: CountrySelectModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();

  // Get flag emoji from country code
  const getFlagEmoji = (countryCode: string) => {
    const code = countryCode.toUpperCase();
    if (code === 'UK') return '🇬🇧';
    return code
      .split('')
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  };

  // Filter and sort countries
  const countries = useMemo(() => {
    const allCountries = Object.entries(countryCoordinates)
      .filter(([code]) => code !== 'unknown')
      .map(([code, data]) => ({
        code: code.toUpperCase(),
        name: data.name,
        flag: getFlagEmoji(code),
      }));

    // Filter by search
    const filtered = searchQuery
      ? allCountries.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allCountries;

    // Sort with priority countries first
    return filtered.sort((a, b) => {
      const aIsPriority = priorityCountries.includes(a.code.toLowerCase());
      const bIsPriority = priorityCountries.includes(b.code.toLowerCase());
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      
      if (aIsPriority && bIsPriority) {
        return priorityCountries.indexOf(a.code.toLowerCase()) - 
               priorityCountries.indexOf(b.code.toLowerCase());
      }
      
      return a.name.localeCompare(b.name, 'ka');
    });
  }, [searchQuery]);

  const handleSelect = async (countryCode: string) => {
    setSelectedCode(countryCode);
    setIsLoading(true);
    
    try {
      await updateProfile({ country_code: countryCode });

      // The app language (and with it the question language) follows the
      // country: USA → English, Georgia → Georgian, Brazil → Portuguese…
      const countryLanguage = languageForCountry(countryCode);
      if (countryLanguage !== language) {
        setLanguage(countryLanguage);
      }

      toast({
        title: t("extra.countrySuccess"),
        description: t("extra.countryChanged"),
      });
      onClose();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: translateErrorMessage(error.message),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedCode(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t("extra.countrySelectTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("extra.countrySearchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-1">
              {countries.map((country) => {
                const isSelected = currentCountryCode?.toUpperCase() === country.code;
                const isSelecting = selectedCode === country.code;

                return (
                  <button
                    key={country.code}
                    onClick={() => handleSelect(country.code)}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                      isSelected 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-secondary/50",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <span className="flex-1 text-foreground">{country.name}</span>
                    {isSelecting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : isSelected ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : null}
                  </button>
                );
              })}

              {countries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t("extra.countryNotFound")}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
