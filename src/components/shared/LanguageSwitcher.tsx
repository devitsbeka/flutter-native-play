import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const LANGUAGES = [
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'pt-br', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'nb', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr-latn', name: 'Serbian', nativeName: 'Srpski', flag: '🇷🇸' },
];

interface LanguageSwitcherProps {
  currentLanguage?: string;
  onChange?: (language: string) => void;
  compact?: boolean;
}

export function LanguageSwitcher({ 
  currentLanguage: controlledLanguage, 
  onChange,
  compact = false 
}: LanguageSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalLanguage, setInternalLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app-language') || 'ka';
    }
    return 'ka';
  });

  const currentLanguage = controlledLanguage ?? internalLanguage;
  const currentLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

  const handleSelect = (code: string) => {
    if (!controlledLanguage) {
      setInternalLanguage(code);
      localStorage.setItem('app-language', code);
    }
    onChange?.(code);
    setIsExpanded(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.language-switcher')) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isExpanded]);

  return (
    <div className="language-switcher relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 rounded-full transition-colors",
          compact 
            ? "p-1.5 hover:bg-accent/50" 
            : "px-3 py-2 bg-card/50 hover:bg-card border border-border/50"
        )}
      >
        <span className="text-xl">{currentLang.flag}</span>
        {!compact && (
          <>
            <span className="text-sm font-medium">{currentLang.nativeName}</span>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )} />
          </>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-50 bg-card border border-border rounded-xl p-3 shadow-xl min-w-[280px]"
          >
            <div className="grid grid-cols-4 gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-accent/50",
                    currentLanguage === lang.code && "bg-primary/10 ring-1 ring-primary/50"
                  )}
                  title={lang.name}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{lang.code}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
