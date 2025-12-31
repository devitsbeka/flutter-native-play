import * as React from "react";
import { motion } from "framer-motion";
import { useIconLibrary } from "@/hooks/useIconLibrary";
import { useAIIcon } from "@/hooks/useAIIcon";
import { cn } from "@/lib/utils";
import { getCategoryIconSlug, CATEGORY_ID_TO_ICON } from "@/data/categoryIconMap";
import { HelpCircle } from "lucide-react";

interface DynamicIconProps {
  slug?: string;
  keywords?: string[];
  questionText?: string;
  category?: string;
  categoryId?: string; // ASCII category_id from database - most reliable for category cards
  categoryType?: string; // classic, fun, educational - for type-based fallbacks
  fallbackEmoji?: string; // Legacy prop - will be ignored
  size?: number;
  className?: string;
}

// Type-based fallback icon slugs
const TYPE_FALLBACK_ICONS: Record<string, string> = {
  classic: 'scroll',
  fun: 'star',
  educational: 'lightbulb',
};

// Track failed icons to avoid retrying them
const failedIconUrls = new Set<string>();

export function DynamicIcon({ 
  slug, 
  keywords, 
  questionText,
  category,
  categoryId,
  categoryType,
  fallbackEmoji, // Ignored - we use icons only
  size = 64,
  className 
}: DynamicIconProps) {
  const { findIcon, findIconForQuestion, getIconBySlug, getIconForCategory, isLoaded, iconCount } = useIconLibrary();
  const [imageError, setImageError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  // Use AI for icon matching when we have a question
  const { aiData, isLoading: aiLoading } = useAIIcon({
    questionText,
    category,
    enabled: !!questionText && isLoaded,
  });

  const iconUrl = React.useMemo(() => {
    if (!isLoaded) return null;
    
    // Priority 1: Direct slug lookup
    if (slug) {
      const url = getIconBySlug(slug);
      if (url && !failedIconUrls.has(url)) return url;
    }

    // Priority 2: Direct category ID lookup (MOST RELIABLE - uses ASCII category_id)
    if (categoryId) {
      const iconSlug = CATEGORY_ID_TO_ICON[categoryId];
      if (iconSlug) {
        const url = getIconBySlug(iconSlug);
        if (url && !failedIconUrls.has(url)) return url;
      }
    }

    // Priority 3: Category icon slug from Georgian name mapping
    if (category) {
      const categorySlug = getCategoryIconSlug(category);
      if (categorySlug) {
        const url = getIconBySlug(categorySlug);
        if (url && !failedIconUrls.has(url)) return url;
      }
    }

    // Priority 3: AI-generated slugs (most accurate for translated questions)
    if (aiData?.slugs && aiData.slugs.length > 0) {
      for (const aiSlug of aiData.slugs) {
        const url = getIconBySlug(aiSlug);
        if (url && !failedIconUrls.has(url)) {
          return url;
        }
      }
    }

    // Priority 4: AI-generated keywords search
    if (aiData?.keywords && aiData.keywords.length > 0) {
      const match = findIcon(aiData.keywords, category);
      if (match && match.matchScore > 25 && !failedIconUrls.has(match.iconUrl)) {
        return match.iconUrl;
      }
    }

    // Priority 5: Question text analysis (local, fast)
    if (questionText) {
      const match = findIconForQuestion(questionText, category);
      if (match && match.matchScore > 20 && !failedIconUrls.has(match.iconUrl)) {
        return match.iconUrl;
      }
    }
    
    // Priority 6: Provided keywords search
    if (keywords && keywords.length > 0) {
      const match = findIcon(keywords, category);
      if (match && match.matchScore > 20 && !failedIconUrls.has(match.iconUrl)) {
        return match.iconUrl;
      }
    }
    
    // Priority 7: Category default from useIconLibrary (uses CATEGORY_ICON_MAP)
    if (category) {
      const url = getIconForCategory(category);
      if (url && !failedIconUrls.has(url)) return url;
    }

    // Priority 8: Type-based fallback icon (classic=scroll, fun=star, educational=lightbulb)
    if (categoryType) {
      const fallbackSlug = TYPE_FALLBACK_ICONS[categoryType.toLowerCase()];
      if (fallbackSlug) {
        const url = getIconBySlug(fallbackSlug);
        if (url && !failedIconUrls.has(url)) return url;
      }
    }

    // NO RANDOM FALLBACK - return null and show neutral icon
    return null;
  }, [slug, keywords, questionText, category, categoryId, categoryType, isLoaded, getIconBySlug, findIconForQuestion, findIcon, getIconForCategory, aiData, retryCount]);

  // Reset error state when iconUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [iconUrl]);

  const handleImageError = React.useCallback(() => {
    if (iconUrl) {
      failedIconUrls.add(iconUrl);
    }
    // Try triggering a re-render to get next priority icon
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
    } else {
      setImageError(true);
    }
  }, [iconUrl, retryCount]);

  // Show loading placeholder while icons load or AI is analyzing
  if (!isLoaded || (aiLoading && !iconUrl)) {
    return (
      <div 
        className={cn("flex items-center justify-center rounded-xl bg-white/10 animate-pulse", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // Show neutral question mark icon if no match found - NEVER show random wrong icon
  if (!iconUrl || imageError) {
    return (
      <div 
        className={cn("flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10", className)}
        style={{ width: size, height: size }}
      >
        <HelpCircle 
          className="text-primary/60"
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
      </div>
    );
  }

  return (
    <motion.img
      key={iconUrl} // Force re-render when URL changes
      src={iconUrl}
      alt="Icon"
      width={size}
      height={size}
      loading="lazy"
      onError={handleImageError}
      className={cn("object-contain", className)}
      style={{ 
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    />
  );
}
