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

export function DynamicIcon({ 
  slug, 
  keywords, 
  questionText,
  category, 
  fallbackEmoji = "❓",
  size = 64,
  className 
}: DynamicIconProps) {
  const { findIcon, findIconForQuestion, getIconBySlug, getIconForCategory, isLoaded } = useIconLibrary();
  const [imageError, setImageError] = React.useState(false);

  const iconUrl = React.useMemo(() => {
    if (!isLoaded) return null;
    
    // Priority 1: Direct slug lookup
    if (slug) {
      return getIconBySlug(slug);
    }
    
    // Priority 2: Question text analysis
    if (questionText) {
      const match = findIconForQuestion(questionText, category);
      if (match) return match.iconUrl;
    }
    
    // Priority 3: Keywords search
    if (keywords && keywords.length > 0) {
      const match = findIcon(keywords, category);
      if (match) return match.iconUrl;
    }
    
    // Priority 4: Category default
    if (category) {
      return getIconForCategory(category);
    }
    
    return null;
  }, [slug, keywords, questionText, category, isLoaded, getIconBySlug, findIconForQuestion, findIcon, getIconForCategory]);

  // Reset error state when iconUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [iconUrl]);

  // Show fallback emoji if no icon found or image failed to load
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
      src={iconUrl}
      alt="Icon"
      width={size}
      height={size}
      loading="lazy"
      onError={() => setImageError(true)}
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
