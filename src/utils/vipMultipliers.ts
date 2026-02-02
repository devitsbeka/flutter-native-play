/**
 * VIP Multipliers and Benefit Calculations
 * Centralized utilities for VIP benefit values
 */

export const VIP_MULTIPLIERS = {
  XP_MULTIPLIER: 2,
  BONUS_SPINS: 3,
  BASE_SPINS: 1,
};

export const VIP_DAILY_POWERUPS = {
  FREEZE: 1,
  FIFTY_FIFTY: 1,
  REPLACE: 1,
  TIME_DRAIN: 1,
};

/**
 * Calculate XP with VIP multiplier
 */
export function calculateXP(baseXP: number, isVip: boolean): number {
  return isVip ? baseXP * VIP_MULTIPLIERS.XP_MULTIPLIER : baseXP;
}

/**
 * Get max daily spins based on VIP status
 */
export function getMaxDailySpins(isVip: boolean): number {
  return VIP_MULTIPLIERS.BASE_SPINS + (isVip ? VIP_MULTIPLIERS.BONUS_SPINS : 0);
}

/**
 * Check if VIP should skip game stake
 */
export function shouldSkipStake(isVip: boolean): boolean {
  return isVip;
}

/**
 * Get VIP daily power-ups grant
 */
export function getVipDailyPowerUps(): typeof VIP_DAILY_POWERUPS {
  return { ...VIP_DAILY_POWERUPS };
}
