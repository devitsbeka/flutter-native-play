import * as React from "react";
import { motion } from "framer-motion";
import { useIconLibrary } from "@/hooks/useIconLibrary";
import { cn } from "@/lib/utils";

interface DynamicIconProps {
  slug?: string;
  keywords?: string[];
  questionText?: string;
  category?: string;
  fallbackEmoji?: string;
  size?: number;
  className?: string;
}

// Track failed icons to avoid retrying them
const failedIconUrls = new Set<string>();

export function DynamicIcon({ 
  slug, 
  keywords, 
  questionText,
  category, 
  fallbackEmoji = "❓",
  size = 64,
  className 
}: DynamicIconProps) {
  const { findIcon, findIconForQuestion, getIconBySlug, getIconForCategory, isLoaded, getRandomIconForCategory } = useIconLibrary();
  const [imageError, setImageError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const iconUrl = React.useMemo(() => {
    if (!isLoaded) return null;
    
    // Priority 1: Direct slug lookup
    if (slug) {
      const url = getIconBySlug(slug);
      if (url && !failedIconUrls.has(url)) return url;
    }
    
    // Priority 2: Question text analysis
    if (questionText) {
      const match = findIconForQuestion(questionText, category);
      if (match && !failedIconUrls.has(match.iconUrl)) return match.iconUrl;
    }
    
    // Priority 3: Keywords search
    if (keywords && keywords.length > 0) {
      const match = findIcon(keywords, category);
      if (match && !failedIconUrls.has(match.iconUrl)) return match.iconUrl;
    }
    
    // Priority 4: Category default
    if (category) {
      const url = getIconForCategory(category);
      if (url && !failedIconUrls.has(url)) return url;
    }

    // Priority 5: Random icon from category (when others failed)
    if (category && retryCount > 0) {
      const url = getRandomIconForCategory(category, retryCount);
      if (url && !failedIconUrls.has(url)) return url;
    }
    
    return null;
  }, [slug, keywords, questionText, category, isLoaded, getIconBySlug, findIconForQuestion, findIcon, getIconForCategory, getRandomIconForCategory, retryCount]);

  // Reset error state when iconUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [iconUrl]);

  const handleImageError = React.useCallback(() => {
    if (iconUrl) {
      failedIconUrls.add(iconUrl);
    }
    // Try up to 3 different icons before giving up
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
    } else {
      setImageError(true);
    }
  }, [iconUrl, retryCount]);

  // Show fallback emoji if no icon found or all retries exhausted
  if (!iconUrl || imageError) {
    return (
      <span 
        className={cn("flex items-center justify-center", className)}
        style={{ width: size, height: size, fontSize: size * 0.6 }}
      >
        {fallbackEmoji}
      </span>
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
