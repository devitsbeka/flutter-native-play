import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage, languages, currentLanguage } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelect = (code: string) => {
    setLanguage(code);
    setIsExpanded(false);
    // Force a page reload to apply all translations
    window.location.reload();
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
        <span className="text-xl">{currentLanguage.flag}</span>
        {!compact && (
          <>
            <span className="text-sm font-medium">{currentLanguage.nativeName}</span>
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
            className="absolute left-0 top-full mt-2 z-50 bg-card border border-border rounded-xl p-2 shadow-xl min-w-[300px] max-h-[400px] overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-1">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-accent/50 text-left",
                    language === lang.code && "bg-primary/10 ring-1 ring-primary/50"
                  )}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.nativeName}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
