import * as React from "react";
import { motion } from "framer-motion";
import { useIconLibrary } from "@/hooks/useIconLibrary";
import { cn } from "@/lib/utils";
import { getCategoryIconSlug } from "@/data/categoryIconMap";

interface DynamicIconProps {
  slug?: string;
  keywords?: string[];
  questionText?: string;
  category?: string;
  fallbackEmoji?: string; // Legacy prop - will be ignored
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
  fallbackEmoji, // Ignored - we use icons only
  size = 64,
  className 
}: DynamicIconProps) {
  const { findIcon, findIconForQuestion, getIconBySlug, getIconForCategory, isLoaded, getRandomIconForCategory, iconCount } = useIconLibrary();
  const [imageError, setImageError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const iconUrl = React.useMemo(() => {
    if (!isLoaded) return null;
    
    // Priority 1: Direct slug lookup
    if (slug) {
      const url = getIconBySlug(slug);
      if (url && !failedIconUrls.has(url)) return url;
    }
    
    // Priority 2: Category icon slug from mapping
    if (category) {
      const categorySlug = getCategoryIconSlug(category);
      if (categorySlug) {
        const url = getIconBySlug(categorySlug);
        if (url && !failedIconUrls.has(url)) return url;
      }
    }
    
    // Priority 3: Question text analysis
    if (questionText) {
      const match = findIconForQuestion(questionText, category);
      if (match && !failedIconUrls.has(match.iconUrl)) return match.iconUrl;
    }
    
    // Priority 4: Keywords search
    if (keywords && keywords.length > 0) {
      const match = findIcon(keywords, category);
      if (match && !failedIconUrls.has(match.iconUrl)) return match.iconUrl;
    }
    
    // Priority 5: Category default from useIconLibrary
    if (category) {
      const url = getIconForCategory(category);
      if (url && !failedIconUrls.has(url)) return url;
    }

    // Priority 6: Random icon from category (when others failed)
    if (category) {
      const url = getRandomIconForCategory(category, retryCount);
      if (url && !failedIconUrls.has(url)) return url;
    }
    
    // Priority 7: Just get ANY icon as absolute last resort
    if (iconCount > 0) {
      const url = getRandomIconForCategory('general', retryCount + 100);
      if (url && !failedIconUrls.has(url)) return url;
    }
    
    return null;
  }, [slug, keywords, questionText, category, isLoaded, getIconBySlug, findIconForQuestion, findIcon, getIconForCategory, getRandomIconForCategory, retryCount, iconCount]);

  // Reset error state when iconUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [iconUrl]);

  const handleImageError = React.useCallback(() => {
    if (iconUrl) {
      failedIconUrls.add(iconUrl);
    }
    // Try up to 5 different icons before giving up
    if (retryCount < 5) {
      setRetryCount(prev => prev + 1);
    } else {
      setImageError(true);
    }
  }, [iconUrl, retryCount]);

  // Show loading placeholder while icons load
  if (!isLoaded) {
    return (
      <div 
        className={cn("flex items-center justify-center rounded-xl bg-white/10 animate-pulse", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // Show simple placeholder if absolutely no icon found (should be rare with 9000+ icons)
  if (!iconUrl || imageError) {
    return (
      <div 
        className={cn("flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10", className)}
        style={{ width: size, height: size }}
      >
        <div 
          className="rounded-full bg-primary/30"
          style={{ width: size * 0.4, height: size * 0.4 }}
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
