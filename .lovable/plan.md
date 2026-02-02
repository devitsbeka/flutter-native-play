
# Plan: Complete VIP Benefits Implementation

## Overview

The VIP system currently has **6 promised benefits** but only **2 are fully implemented**. This plan will implement all missing benefits to create a complete PRO/VIP experience.

---

## Current Status Analysis

| Benefit | Promised | Status |
|---------|----------|--------|
| 2x XP | ✅ | ❌ Not applied in game |
| +3 Daily Spins | ✅ | ❌ Not applied |
| Exclusive Frames | ✅ | ❌ No VIP-only frames |
| Daily Free Powers | ✅ | ❌ No grant system |
| VIP Badge | ✅ | ✅ Working |
| No Ads | ✅ | ⚠️ Partial |
| Unlimited Plays | Hidden | ✅ Working |
| No Game Stake | Hidden | ❌ Not implemented |

---

## Implementation Plan

### Step 1: Implement 2x XP Multiplier

**Files to modify:**
- `src/hooks/useRewards.ts` - Apply multiplier when recording rewards
- `src/components/social/QuizPlayModal.tsx` - Apply to feed trivia XP
- Create new `src/utils/vipMultipliers.ts` - Centralized VIP multiplier utility

**Logic:**
```text
Calculate XP earned → Check if VIP → If VIP, multiply by 2 → Save to profile
```

---

### Step 2: Implement +3 Daily Spins for VIP

**File to modify:** `src/hooks/useRewards.ts`

**Current behavior:** `maxSpins` is always set to 1
**New behavior:** Check VIP status and set `maxSpins = 1 + 3 = 4` for VIP users

---

### Step 3: Add VIP-Exclusive Avatar Frames

**File to modify:** `src/hooks/useAvatarFrames.ts`

**Add new VIP-only frames:**
- Crown frame (legendary, gold theme)
- Diamond frame (legendary, purple/pink theme)  
- Royal frame (epic, red/gold theme)

**Add `vipOnly: true` flag to frame definition**

**File to modify:** `src/components/home/AvatarFrameShop.tsx`
- Show "VIP" badge on VIP-only frames
- Auto-unlock VIP frames for VIP users
- Lock message for non-VIP users

---

### Step 4: Implement Daily Free Power-ups

**New file:** `src/hooks/useDailyVipPowerUps.ts`

**System design:**
1. Check if user is VIP
2. Check if daily power-ups already claimed today
3. Grant 1 of each power-up type daily (4 total)
4. Store claim date in database

**New table needed:** `user_daily_vip_rewards`
- `user_id` (FK)
- `reward_date` (date)
- `powers_claimed` (boolean)

---

### Step 5: VIP No-Stake Gameplay

**File to modify:** `src/hooks/useGameStake.ts`

**Current:** All users pay 500 coins to play
**New:** VIP users skip stake payment entirely

---

### Step 6: Add VIP Welcome/Activation Flow

**New component:** `src/components/vip/VipActivationSuccessModal.tsx`

When VIP is activated:
1. Show celebration animation
2. Display all unlocked benefits
3. Grant daily VIP power-ups immediately
4. Show VIP badge preview

---

### Step 7: VIP Status Indicator Enhancement

**Files to modify:**
- `src/components/layout/UniversalBottomNav.tsx`
- `src/components/home/FloatingUserStats.tsx`

**Add:**
- Golden glow effect around profile when VIP
- VIP countdown timer (days remaining)
- Quick access to VIP benefits popup

---

## Database Changes Required

```sql
-- New table for daily VIP rewards tracking
CREATE TABLE user_daily_vip_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
  powers_claimed BOOLEAN DEFAULT FALSE,
  spins_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, reward_date)
);

-- Enable RLS
ALTER TABLE user_daily_vip_rewards ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rewards
CREATE POLICY "Users can view own rewards"
  ON user_daily_vip_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own rewards"
  ON user_daily_vip_rewards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rewards"
  ON user_daily_vip_rewards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/utils/vipMultipliers.ts` | Centralized VIP benefit calculations |
| `src/hooks/useDailyVipRewards.ts` | Daily VIP rewards grant system |
| `src/components/vip/VipActivationSuccessModal.tsx` | Celebration on VIP purchase |
| `src/components/vip/VipBenefitsPopup.tsx` | Quick benefits overview |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useRewards.ts` | Apply 2x XP, grant +3 spins |
| `src/hooks/useAvatarFrames.ts` | Add VIP-only frames |
| `src/components/home/AvatarFrameShop.tsx` | VIP frame badges and auto-unlock |
| `src/hooks/useGameStake.ts` | Skip stake for VIP |
| `src/hooks/useVipStatus.ts` | Add benefit helper methods |
| `src/components/social/QuizPlayModal.tsx` | Apply 2x XP to feed trivia |

---

## VIP Benefits Summary After Implementation

| Benefit | Details |
|---------|---------|
| **2x XP** | All XP earnings doubled |
| **4 Daily Spins** | 1 free + 3 VIP bonus |
| **3 Exclusive Frames** | Crown, Diamond, Royal |
| **4 Daily Power-ups** | 1x each type (50/50, freeze, replace, time-drain) |
| **VIP Crown Badge** | Gold crown on avatar |
| **Ad-Free Experience** | No ad prompts shown |
| **Unlimited Plays** | No daily play limit |
| **Free Gameplay** | No 500-coin stake required |

---

## Priority Order

1. **High Priority** (core monetization value):
   - 2x XP multiplier
   - +3 Daily spins
   - Free gameplay (no stake)

2. **Medium Priority** (user experience):
   - Daily free power-ups
   - VIP exclusive frames

3. **Lower Priority** (polish):
   - VIP activation celebration
   - Enhanced VIP indicators
