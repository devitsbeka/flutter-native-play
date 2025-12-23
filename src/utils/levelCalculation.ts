// Level calculation utility using Fibonacci-like XP thresholds
// Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, Level 4: 500 XP, etc.

const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2600,   // Level 8
  3500,   // Level 9
  4600,   // Level 10
  5900,   // Level 11
  7500,   // Level 12
  9400,   // Level 13
  11600,  // Level 14
  14200,  // Level 15
  17200,  // Level 16
  20700,  // Level 17
  24800,  // Level 18
  29500,  // Level 19
  35000,  // Level 20
];

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
  
  // Find current level
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  
  const isMaxLevel = level >= LEVEL_THRESHOLDS.length;
  const xpForCurrentLevel = LEVEL_THRESHOLDS[level - 1] || 0;
  const xpForNextLevel = isMaxLevel 
    ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] 
    : LEVEL_THRESHOLDS[level];
  
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
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

export interface LevelRewards {
  xpBonus: number;
  powerUps: number;
  spinTickets: number;
  specialRewards: string[];
}

export function getLevelRewards(level: number): LevelRewards {
  const specialRewards: string[] = [];
  
  if (level >= 5) specialRewards.push("ახალი ავატარები");
  if (level >= 10) specialRewards.push("ექსკლუზიური ბეჯები");
  if (level >= 15) specialRewards.push("VIP უფასო დღე");
  if (level >= 20) specialRewards.push("ლეგენდარული სტატუსი");
  
  return {
    xpBonus: level * 25,
    powerUps: level >= 3 ? Math.floor(level / 3) : 0,
    spinTickets: level >= 5 ? Math.floor(level / 5) : 0,
    specialRewards,
  };
}
