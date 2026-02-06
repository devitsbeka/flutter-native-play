// Re-export from VipContext — all 25 consumers keep their existing imports
export { useVipStatus } from "@/contexts/VipContext";
export type { VipSubscription, VipDuration } from "@/contexts/VipContext";
export { VIP_PRICES, VIP_BENEFITS, VIP_BENEFITS_BY_TIER } from "@/contexts/VipContext";
