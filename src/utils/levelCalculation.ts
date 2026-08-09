// Level calculation utility using formula-based XP thresholds
// Max level is 999, XP scales using a power curve

const MAX_LEVEL = 999;

// Calculate XP threshold for a given level using a power curve
function getThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  // Power curve: 100 * (level-1)^1.8 provides smooth progression
  return Math.floor(100 * Math.pow(level - 1, 1.8));
}

// Pre-calculate first 50 levels for quick access, calculate rest on demand
const CACHED_THRESHOLDS: number[] = [];
for (let i = 1; i <= 50; i++) {
  CACHED_THRESHOLDS.push(getThresholdForLevel(i));
}

function getXPThreshold(level: number): number {
  if (level <= 50) return CACHED_THRESHOLDS[level - 1];
  return getThresholdForLevel(level);
}

export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progress: number; // 0-100
  isMaxLevel: boolean;
}

export function calculateLevel(totalPoints: number): LevelInfo {
  const xp = totalPoints || 0;
  
  // Find current level using binary search for efficiency
  let level = 1;
  for (let i = MAX_LEVEL; i >= 1; i--) {
    if (xp >= getXPThreshold(i)) {
      level = i;
      break;
    }
  }
  
  const isMaxLevel = level >= MAX_LEVEL;
  const xpForCurrentLevel = getXPThreshold(level);
  const xpForNextLevel = isMaxLevel 
    ? getXPThreshold(MAX_LEVEL) 
    : getXPThreshold(level + 1);
  
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForNextLevel = isMaxLevel ? xp : (xpForNextLevel - xpForCurrentLevel);
  const progress = isMaxLevel ? 100 : Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);
  
  return {
    level,
    currentXP: xp,
    xpForCurrentLevel,
    xpForNextLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progress,
    isMaxLevel,
  };
}

export function getStreakBonus(streak: number): number {
  if (streak >= 7) return 50; // 50% bonus
  if (streak >= 5) return 30; // 30% bonus
  if (streak >= 3) return 15; // 15% bonus
  return 0;
}

export function getStreakMilestones(): { days: number; bonus: number; reward: string }[] {
  return [
    { days: 3, bonus: 15, reward: "15% XP ბონუსი" },
    { days: 5, bonus: 30, reward: "30% XP ბონუსი" },
    { days: 7, bonus: 50, reward: "50% XP ბონუსი + 🎁" },
    { days: 14, bonus: 75, reward: "75% XP ბონუსი + 💎" },
    { days: 30, bonus: 100, reward: "2x XP + ექსკლუზიური ბეჯი" },
  ];
}

// NOTE: level-up rewards are what MatchResultScreen / CategoryQuizPage
// actually credit: REWARDS.LEVEL_UP_COINS + one random power-up. The old
// getLevelRewards helper here advertised bonuses (spin tickets, avatars,
// VIP days, statuses) that nothing ever granted — removed so the UI can't
// promise them again.
