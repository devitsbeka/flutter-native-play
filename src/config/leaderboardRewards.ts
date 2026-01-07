// Weekly Leaderboard Rewards Configuration
// Defines rewards for top players in each category

export interface LeaderboardReward {
  rank: number;
  coins: number;
  gems: number;
  frameId?: string;
  badgeId?: string;
}

// Weekly rewards for top 10 players in each category
export const WEEKLY_LEADERBOARD_REWARDS: LeaderboardReward[] = [
  { rank: 1, coins: 2000, gems: 25, frameId: "champion_gold", badgeId: "weekly_champion" },
  { rank: 2, coins: 1500, gems: 15, frameId: "champion_silver", badgeId: "weekly_silver" },
  { rank: 3, coins: 1000, gems: 10, frameId: "champion_bronze", badgeId: "weekly_bronze" },
  { rank: 4, coins: 750, gems: 5 },
  { rank: 5, coins: 500, gems: 3 },
  { rank: 6, coins: 400, gems: 2 },
  { rank: 7, coins: 300, gems: 2 },
  { rank: 8, coins: 250, gems: 1 },
  { rank: 9, coins: 200, gems: 1 },
  { rank: 10, coins: 150, gems: 1 },
];

// Exclusive frame definitions (synced with database)
export interface ExclusiveFrame {
  id: string;
  name: string;
  description: string;
  gradient: string;
  borderStyle: string;
  animationClass?: string;
  rankRequirement: number;
  rarity: "rare" | "epic" | "legendary";
}

export const EXCLUSIVE_FRAMES: ExclusiveFrame[] = [
  {
    id: "champion_gold",
    name: "ჩემპიონის ოქრო",
    description: "1 ადგილი - ექსკლუზიური ოქროს ჩარჩო",
    gradient: "from-yellow-300 via-amber-400 to-yellow-500",
    borderStyle: "border-4 border-yellow-400",
    animationClass: "animate-pulse",
    rankRequirement: 1,
    rarity: "legendary",
  },
  {
    id: "champion_silver",
    name: "ჩემპიონის ვერცხლი",
    description: "2 ადგილი - ექსკლუზიური ვერცხლის ჩარჩო",
    gradient: "from-slate-200 via-gray-300 to-slate-400",
    borderStyle: "border-4 border-slate-400",
    animationClass: "animate-pulse",
    rankRequirement: 2,
    rarity: "epic",
  },
  {
    id: "champion_bronze",
    name: "ჩემპიონის ბრინჯაო",
    description: "3 ადგილი - ექსკლუზიური ბრინჯაოს ჩარჩო",
    gradient: "from-orange-300 via-amber-400 to-orange-500",
    borderStyle: "border-4 border-orange-400",
    rankRequirement: 3,
    rarity: "rare",
  },
];

// Badge definitions (synced with database)
export interface LeaderboardBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rankRequirement: number;
}

export const LEADERBOARD_BADGES: LeaderboardBadge[] = [
  {
    id: "weekly_champion",
    name: "კვირის ჩემპიონი",
    description: "კვირის 1 ადგილი კატეგორიაში",
    icon: "👑",
    color: "amber",
    rankRequirement: 1,
  },
  {
    id: "weekly_silver",
    name: "ვერცხლის მედალი",
    description: "კვირის 2 ადგილი კატეგორიაში",
    icon: "🥈",
    color: "slate",
    rankRequirement: 2,
  },
  {
    id: "weekly_bronze",
    name: "ბრინჯაოს მედალი",
    description: "კვირის 3 ადგილი კატეგორიაში",
    icon: "🥉",
    color: "orange",
    rankRequirement: 3,
  },
];

// Helper to get reward for a specific rank
export function getRewardForRank(rank: number): LeaderboardReward | null {
  return WEEKLY_LEADERBOARD_REWARDS.find((r) => r.rank === rank) || null;
}

// Helper to check if rank qualifies for rewards
export function ranksForRewards(): number {
  return WEEKLY_LEADERBOARD_REWARDS.length;
}

// Get week boundaries
export function getCurrentWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { start: monday, end: sunday };
}

// Get days remaining in current week
export function getDaysRemainingInWeek(): number {
  const now = new Date();
  const { end } = getCurrentWeekBounds();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
