/**
 * Exhaustion Indicator Component
 * 
 * Shows users when question pools are running low or exhausted.
 * Provides friendly UX messaging instead of dead-ends.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExhaustionIndicatorProps {
  percentUsed: number;
  totalAvailable: number;
  totalSeen: number;
  wasReset?: boolean;
  usedFallback?: boolean;
  className?: string;
  compact?: boolean;
}

export const ExhaustionIndicator: React.FC<ExhaustionIndicatorProps> = ({
  percentUsed,
  totalAvailable,
  totalSeen,
  wasReset = false,
  usedFallback = false,
  className,
  compact = false,
}) => {
  // Don't show if plenty of questions available
  if (percentUsed < 70 && !wasReset && !usedFallback) {
    return null;
  }
  
  // Determine status
  const isNearExhaustion = percentUsed >= 70 && percentUsed < 90;
  const isAlmostExhausted = percentUsed >= 90 && percentUsed < 100;
  const isExhausted = percentUsed >= 100 || wasReset;
  
  // Get status config
  const getStatusConfig = () => {
    if (wasReset) {
      return {
        icon: RefreshCw,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        message: compact ? 'ახლადან დაიწყო' : 'კითხვები ახლადან დაიწყო - ზოგიერთი შეიძლება გაიმეოროს',
      };
    }
    if (usedFallback) {
      return {
        icon: Info,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        message: compact ? 'შერეული კატეგორიები' : 'ზოგიერთი კითხვა სხვა კატეგორიიდანაა',
      };
    }
    if (isExhausted) {
      return {
        icon: AlertCircle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        message: compact ? 'ყველა ნანახია' : 'ყველა კითხვა ნანახია - ახალ კითხვებს მალე დავამატებთ!',
      };
    }
    if (isAlmostExhausted) {
      return {
        icon: AlertCircle,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        message: compact ? `${100 - percentUsed}% დარჩა` : `თითქმის ყველა კითხვა ნანახია (${percentUsed}%)`,
      };
    }
    if (isNearExhaustion) {
      return {
        icon: Info,
        color: 'text-sky-500',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/30',
        message: compact ? `${100 - percentUsed}% დარჩა` : `უკვე ${percentUsed}% კითხვა ნანახია`,
      };
    }
    return {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      message: 'ახალი კითხვები',
    };
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          config.bgColor,
          config.color,
          className
        )}
      >
        <Icon className="w-3 h-3" />
        <span>{config.message}</span>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className={cn('p-2 rounded-lg', config.bgColor)}>
        <Icon className={cn('w-5 h-5', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', config.color)}>
          {config.message}
        </p>
        {!compact && totalAvailable > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalSeen} / {totalAvailable} კითხვა ნანახია
          </p>
        )}
      </div>
      
      {/* Progress bar */}
      {!compact && (
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentUsed, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              percentUsed >= 90 ? 'bg-orange-500' :
              percentUsed >= 70 ? 'bg-amber-500' :
              'bg-green-500'
            )}
          />
        </div>
      )}
    </motion.div>
  );
};

/**
 * Hook to get exhaustion info for a category
 */
export function useExhaustionInfo(exhaustionInfo?: {
  totalAvailable: number;
  totalSeen: number;
  wasReset: boolean;
  usedFallback: boolean;
}) {
  if (!exhaustionInfo) return null;
  
  const { totalAvailable, totalSeen, wasReset, usedFallback } = exhaustionInfo;
  const percentUsed = totalAvailable > 0 ? Math.round((totalSeen / totalAvailable) * 100) : 0;
  
  return {
    percentUsed,
    totalAvailable,
    totalSeen,
    wasReset,
    usedFallback,
    showIndicator: percentUsed >= 70 || wasReset || usedFallback,
  };
}
