import * as React from "react";
import { motion } from "framer-motion";
import { getCachedCategoryIcon } from "@/hooks/useCategoryIconResolver";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

interface DynamicIconProps {
  categoryId?: string; // ASCII category_id from database - primary lookup
  slug?: string; // Direct icon slug
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

  const iconUrl = React.useMemo(() => {
    // Priority 1: Cached category icon (resolved from keywords search)
    if (categoryId) {
      const cachedUrl = getCachedCategoryIcon(categoryId);
      if (cachedUrl && !failedIconUrls.has(cachedUrl)) {
        return cachedUrl;
      }
    }

    // Priority 2: Direct slug lookup
    if (slug) {
      const directUrl = `${ICON_STORAGE_URL}/${slug}.png`;
      if (!failedIconUrls.has(directUrl)) {
        return directUrl;
      }
    }

    return null;
  }, [categoryId, slug]);

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

  // Show placeholder if no icon
  if (!iconUrl || imageError) {
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
