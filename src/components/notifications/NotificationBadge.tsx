import { cn } from '@/lib/utils';
import { getNotificationConfig } from '@/config/notificationConfig';

interface NotificationBadgeProps {
  type: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function NotificationBadge({ type, size = 'md', className }: NotificationBadgeProps) {
  const config = getNotificationConfig(type);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-full flex items-center justify-center',
        sizeClasses[size],
        config.bgColor,
        className
      )}
    >
      <Icon className={cn(iconSizes[size], config.color)} />
    </div>
  );
}
