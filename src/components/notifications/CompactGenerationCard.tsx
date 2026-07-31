import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, User, ImageIcon, Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ka, enUS } from 'date-fns/locale';
import { GenerationNotification } from '@/hooks/useGenerationNotifications';
import { useLanguage } from '@/contexts/LanguageContext';

interface CompactGenerationCardProps {
  notification: GenerationNotification;
  onUseImage?: (imageUrl: string, type: 'avatar' | 'cover') => void;
  dateLocale?: typeof ka;
}

export const CompactGenerationCard = memo(function CompactGenerationCard({
  notification,
  onUseImage,
  dateLocale = ka,
}: CompactGenerationCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    if (notification.status !== 'generating') return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - notification.startedAt.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [notification.status, notification.startedAt]);

  const getIcon = () => {
    if (notification.generationType === 'avatar') return <User className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  const getTimeDisplay = () => {
    if (notification.status === 'generating') {
      const remaining = Math.max(0, notification.estimatedTime - elapsedTime);
      if (remaining > 0) {
        return `~${t('extra.secondsShort', { time: remaining })}`;
      }
      return `${t('extra.generatingStatus')}...`;
    }
    return formatDistanceToNow(notification.startedAt, { addSuffix: false, locale: dateLocale });
  };

  const handleUseImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.imageUrl && onUseImage) {
      onUseImage(notification.imageUrl, notification.generationType);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-3 px-4 py-3 mx-2 my-2 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40"
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden border border-border/50">
          {notification.status === 'completed' && notification.imageUrl ? (
            <img
              src={notification.imageUrl}
              alt={notification.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground">{getIcon()}</span>
          )}
          {notification.status === 'generating' && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background",
          notification.status === 'generating'
            ? "bg-primary/20"
            : notification.status === 'completed'
            ? "bg-emerald-500/20"
            : "bg-destructive/20"
        )}>
          {notification.status === 'generating' ? (
            <Sparkles className="w-2.5 h-2.5 text-primary" />
          ) : notification.status === 'completed' ? (
            <Check className="w-2.5 h-2.5 text-emerald-500" />
          ) : (
            <X className="w-2.5 h-2.5 text-destructive" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-bold text-foreground">
                {notification.title}
              </span>
              <span className={cn(
                "ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium",
                notification.status === 'generating'
                  ? "bg-primary/20 text-primary"
                  : notification.status === 'completed'
                  ? "bg-emerald-500/20 text-emerald-500"
                  : "bg-destructive/20 text-destructive"
              )}>
                {notification.status === 'generating' 
                  ? t('extra.generatingStatus')
                  : notification.status === 'completed' 
                  ? t('extra.readyStatus')
                  : t('extra.errorStatus')}
              </span>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {getTimeDisplay()}
            </p>
          </div>

          {/* Status indicator for generating */}
          {notification.status === 'generating' && (
            <div className="flex-shrink-0 mt-1.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
          )}
        </div>

        {/* Action button for completed */}
        {notification.status === 'completed' && notification.imageUrl && (
          <motion.button
            onClick={handleUseImage}
            className="mt-2 px-4 py-1.5 rounded-full border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 transition-colors text-xs font-semibold"
            whileTap={{ scale: 0.95 }}
          >
            {t('extra.useAction')}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
});
