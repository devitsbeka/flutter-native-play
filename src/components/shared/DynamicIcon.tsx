import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import { useIconLibrary } from "@/hooks/useIconLibrary";

interface DynamicIconProps {
  categoryId?: string; // ASCII category_id from database - fallback lookup
  slug?: string; // Direct icon slug (highest priority) - from icon_slug column
  size?: number;
  className?: string;
}

const ICON_STORAGE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library';

// Track failed icons to avoid retrying
const failedIconUrls = new Set<string>();

export function DynamicIcon({ 
  categoryId,
  slug,
  size = 64,
  className 
}: DynamicIconProps) {
  const [imageError, setImageError] = React.useState(false);
  const { findIcon, getIconBySlug, getIconForCategory, getRandomIconForCategory, isLoaded } = useIconLibrary();

  // Resolve icon URL using the icon library
  const iconUrl = React.useMemo(() => {
    if (!isLoaded) return null;

    // Priority 1: Search by slug keyword in icon library
    if (slug) {
      // Try exact slug match first
      const exactUrl = getIconBySlug(slug);
      if (exactUrl && !failedIconUrls.has(exactUrl)) {
        return exactUrl;
      }
      
      // Try searching by the slug as a keyword
      const match = findIcon([slug]);
      if (match && !failedIconUrls.has(match.iconUrl)) {
        return match.iconUrl;
      }
    }

    // Priority 2: Try category-based lookup
    if (categoryId) {
      const categoryUrl = getIconForCategory(categoryId);
      if (categoryUrl && !failedIconUrls.has(categoryUrl)) {
        return categoryUrl;
      }
    }
    
    // Priority 3: Random icon from category as final fallback
    // Use categoryId or a generic seed
    const fallbackUrl = getRandomIconForCategory(categoryId || 'general', Date.now() % 1000);
    if (fallbackUrl && !failedIconUrls.has(fallbackUrl)) {
      return fallbackUrl;
    }

    return null;
  }, [slug, categoryId, isLoaded, findIcon, getIconBySlug, getIconForCategory, getRandomIconForCategory]);

  // Reset error when URL changes
  React.useEffect(() => {
    setImageError(false);
  }, [iconUrl]);

  const handleImageError = React.useCallback(() => {
    if (iconUrl) {
      failedIconUrls.add(iconUrl);
    }
    setImageError(true);
  }, [iconUrl]);

  // Show placeholder if loading, no icon, or error
  if (!isLoaded || !iconUrl || imageError) {
    return (
      <div 
        className={cn("flex items-center justify-center rounded-xl bg-white/20", className)}
        style={{ width: size, height: size }}
      >
        <HelpCircle 
          className="text-white/60"
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
      </div>
    );
  }

  return (
    <motion.img
      key={iconUrl}
      src={iconUrl}
      alt="Category icon"
      width={size}
      height={size}
      loading="eager"
      onError={handleImageError}
      className={cn("object-contain", className)}
      style={{ 
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    />
  );
}
