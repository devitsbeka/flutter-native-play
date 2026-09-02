import {
  MessageCircle,
  Swords,
  UserPlus,
  UserCheck,
  Gift,
  Calendar,
  Flame,
  TrendingUp,
  Award,
  Heart,
  Bookmark,
  Play,
  PlayCircle,
  Users,
  Trophy,
  CreditCard,
  Crown,
  Info,
  PartyPopper,
  Bell,
  BellRing,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export interface NotificationTypeConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
  labelEn: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
  // AI Generation
  ai_generation: {
    icon: Sparkles,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'AI გენერაცია',
    labelEn: 'AI Generation',
  },
  // Messages
  new_message: {
    icon: MessageCircle,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'ახალი შეტყობინება',
    labelEn: 'New Message',
  },

  // Social - Friends
  friend_request: {
    icon: UserPlus,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    label: 'მეგობრობის მოთხოვნა',
    labelEn: 'Friend Request',
  },
  // Somebody asking into a room you host — a request to answer, like a
  // friend request, so it wears the same face rather than the info badge.
  room_join_request: {
    icon: UserPlus,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    label: 'შემოსვლის მოთხოვნა',
    labelEn: 'Join Request',
  },
  // The host's answer to your ask. Without these two the answer rendered
  // as the generic info badge over a bare room code.
  room_join_approved: {
    icon: UserCheck,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'მოთხოვნა მიღებულია',
    labelEn: 'Request Accepted',
  },
  room_join_declined: {
    icon: UserPlus,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    label: 'მოთხოვნა უარყოფილია',
    labelEn: 'Request Declined',
  },
  // Your own copy of a request you sent. Quieter than the one you receive:
  // it is a record, not something to act on.
  friend_request_sent: {
    icon: UserPlus,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    label: 'მოთხოვნა გაგზავნილია',
    labelEn: 'Request Sent',
  },
  friend_accepted: {
    icon: UserCheck,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'მეგობარი დაემატა',
    labelEn: 'Friend Accepted',
  },

  // Games
  challenge: {
    icon: Swords,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'გამოწვევა',
    labelEn: 'Challenge',
  },
  game_started: {
    icon: PlayCircle,
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/20',
    label: 'თამაში დაიწყო',
    labelEn: 'Game Started',
  },
  room_invite: {
    icon: Users,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    label: 'ოთახის მოწვევა',
    labelEn: 'Room Invite',
  },
  game_result: {
    icon: Trophy,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'თამაშის შედეგი',
    labelEn: 'Game Result',
  },

  // Rewards & Achievements
  reward: {
    icon: Gift,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    label: 'ჯილდო',
    labelEn: 'Reward',
  },
  daily_reward: {
    icon: Calendar,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    label: 'ყოველდღიური ჯილდო',
    labelEn: 'Daily Reward',
  },
  streak: {
    icon: Flame,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'სერია',
    labelEn: 'Streak',
  },
  level_up: {
    icon: TrendingUp,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'დონის ამაღლება',
    labelEn: 'Level Up',
  },
  achievement: {
    icon: Award,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    label: 'მიღწევა',
    labelEn: 'Achievement',
  },

  // Trivia / Social Engagement
  trivia_liked: {
    icon: Heart,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    label: 'მოწონება',
    labelEn: 'Trivia Liked',
  },
  trivia_saved: {
    icon: Bookmark,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    label: 'შენახვა',
    labelEn: 'Trivia Saved',
  },
  trivia_played: {
    icon: Play,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    label: 'ითამაშა',
    labelEn: 'Trivia Played',
  },

  // Billing
  billing: {
    icon: CreditCard,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    label: 'ბილინგი',
    labelEn: 'Billing',
  },
  subscription: {
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    label: 'გამოწერა',
    labelEn: 'Subscription',
  },

  // System
  system: {
    icon: Info,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'სისტემა',
    labelEn: 'System',
  },
  welcome: {
    icon: PartyPopper,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    label: 'მოგესალმებით',
    labelEn: 'Welcome',
  },
  // The 21st type. It is in the NotificationType union and the app sends it
  // from the room lobby, but it had no entry here, so it was the one kind of
  // notification that fell through to the generic bell.
  room_ping: {
    icon: BellRing,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    label: 'შეხსენება ოთახში',
    labelEn: 'Room Ping',
  },
};

export const getNotificationConfig = (type: string): NotificationTypeConfig => {
  return (
    NOTIFICATION_TYPE_CONFIG[type] || {
      icon: Bell,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      label: 'შეტყობინება',
      labelEn: 'Notification',
    }
  );
};

// Filter category mappings
export const NOTIFICATION_FILTER_CATEGORIES = {
  social: ['friend_request', 'friend_accepted', 'trivia_liked', 'trivia_saved', 'trivia_played'],
  games: ['challenge', 'game_started', 'room_invite', 'game_result'],
  rewards: ['reward', 'daily_reward', 'streak', 'level_up', 'achievement'],
  messages: ['new_message'],
  billing: ['billing', 'subscription'],
} as const;
