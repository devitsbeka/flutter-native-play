// Re-export from VipContext — all 25 consumers keep their existing imports
export { useVipStatus } from "@/contexts/VipContext";
export type { VipSubscription, VipDuration } from "@/contexts/VipContext";
// VIP_PRICES is deliberately not re-exported: the ladder that used to live
// in VipContext (day 3 / week 12 / month 35) was a fourth price table nobody
// read and it disagreed with the shop by a factor of twenty. Prices are
// REWARDS.VIP_PRICES in @/config/rewardConfig.
export { VIP_BENEFITS, VIP_BENEFITS_BY_TIER } from "@/contexts/VipContext";
