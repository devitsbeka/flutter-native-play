
# თამაშის ეკონომიკის სრული ალგორითმი

## მიმოხილვა

მიმდინარე სისტემის ანალიზის შემდეგ შევიმუშავე ბალანსირებული ეკონომიკის ალგორითმი, რომელიც უზრუნველყოფს:
- მომხმარებლის ჩართულობას ლოგიკური ჯილდოებით
- თამაშის გაგრძელების მოტივაციას
- გადახდების სტიმულს (არა იძულებას)

---

## მიმდინარე პრობლემები

| პრობლემა | აღწერა |
|----------|--------|
| ზედმეტი ჯილდოები | Daily rewards-ით 7 დღეში 3,150 მონეტა = 6+ უფასო თამაში |
| ძვირი/იაფი ფასები | Power-ups 100-120 coins vs თამაში 500 coins - არათანაბარი |
| თამაშის ლიმიტი | 5 უფასო თამაში/დღე, მაგრამ VIP-ს unlimited |
| Ad reward | 1000 coins/ad = 2 უფასო თამაში - ძალიან ბევრი |

---

## ახალი ბალანსირებული ალგორითმი

### 1. სავალუტო საფუძველი

```text
┌─────────────────────────────────────────────────────────────┐
│ 💎 1 Gem = 50 Coins (უცვლელი)                              │
│ 🎮 1 თამაში = 500 Coins stake                               │
│ 🏆 მოგება = 1000 Coins (stake × 2)                          │
│ 🤝 ფრე = 250 Coins (stake × 0.5)                            │
└─────────────────────────────────────────────────────────────┘
```

### 2. ახალი მომხმარებლის საწყისი ბალანსი

| პარამეტრი | მიმდინარე | ახალი | მიზეზი |
|-----------|-----------|-------|--------|
| Coins | 2000 | 1500 | 3 თამაში საცდელად (არა 4) |
| Gems | 10 | 5 | საკმარისი 1 პატარა შეძენისთვის |

### 3. თამაშის ლიმიტის სისტემა (Lives)

```text
┌─────────────────────────────────────────────────────────────┐
│ 🆓 FREE USERS                                               │
├─────────────────────────────────────────────────────────────┤
│ • 5 უფასო თამაში/დღე (12:00AM-ზე განახლება)                │
│ • ლიმიტის ამოწურვის შემდეგ:                                 │
│   ├─ ⏰ 4 საათი = +1 თამაში (მაქსიმუმ 3 დაგროვებული)       │
│   ├─ 📺 რეკლამა = +1 თამაში (დღეში მაქს 5 რეკლამა)          │
│   ├─ 💰 500 coins = 1 თამაში (stake სისტემით)              │
│   └─ 💎 3 gems = +2 თამაში (გადაუდებელი)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 👑 VIP USERS                                                │
├─────────────────────────────────────────────────────────────┤
│ • Unlimited თამაშები                                        │
│ • No stake required (რისკი მხოლოდ free-სთვის)              │
│ • 2x XP ყველა თამაშზე                                       │
└─────────────────────────────────────────────────────────────┘
```

### 4. ყოველდღიური ჯილდოების ახალი ბალანსი

| დღე | მიმდინარე Coins | ახალი Coins | მიმდინარე Gems | ახალი Gems |
|-----|-----------------|-------------|----------------|------------|
| 1 | 150 | 100 | 1 | 0 |
| 2 | 200 | 150 | 1 | 0 |
| 3 | 300 | 200 | 2 | 1 |
| 4 | 400 | 250 | 1 | 0 |
| 5 | 500 | 350 | 2 | 1 |
| 6 | 600 | 450 | 2 | 1 |
| 7 | 1000 | 500 | 5 | 2 |
| **სულ** | **3150** | **2000** | **14** | **5** |

**შედეგი**: 7 დღეში = 4 უფასო თამაში (არა 6+)

### 5. სხვა ჯილდოების ბალანსი

| ჯილდო | მიმდინარე | ახალი | განმარტება |
|-------|-----------|-------|------------|
| Chest (6სთ) | 200 coins + 3 gems | 100 coins + 1 gem | 6 საათში = დღეში 4× = 400 coins |
| Ad Watch | 1000 coins | +1 თამაში | მონეტების ნაცვლად თამაში |
| Spin (max) | 500 coins | 300 coins | დაბალანსება |
| Level Up | 100 coins/level | 75 coins/level | ოდნავ შემცირება |

### 6. მაღაზიის ფასების ოპტიმიზაცია

**Power-ups (gems-ით):**
| Item | მიმდინარე | ახალი | თანაფარდობა |
|------|-----------|-------|-------------|
| 50/50 ×3 | 8 gems | 6 gems | 2 gems/power = 100 coins |
| Freeze ×3 | 8 gems | 6 gems | |
| Replace ×3 | 8 gems | 6 gems | |
| All Powers ×3 | 28 gems | 20 gems | -30% bundle |

**Coins ყიდვა (gems-ით):**
| Package | მიმდინარე | ახალი | Value |
|---------|-----------|-------|-------|
| 100 coins | 2 gems | 2 gems | 1:50 |
| 500 coins | 8 gems | 10 gems | 1:50 |
| 1500 coins | 20 gems | 28 gems | +7% bonus |
| 5000 coins | 60 gems | 90 gems | +11% bonus |

### 7. VIP ფასების ოპტიმიზაცია

| Plan | მიმდინარე | ახალი | რეალური ღირებულება |
|------|-----------|-------|-------------------|
| Day | 3 gems | 5 gems | ₾0.50 |
| Week | 12 gems | 20 gems | ₾2.00 |
| Month | 35 gems | 50 gems | ₾5.00 |

---

## ეკონომიკის ბალანსის მოდელი

### აქტიური მოთამაშის დღიური ციკლი:

```text
┌───────────────────────────────────────────────────────────────┐
│ 📅 FREE USER - დღიური ბალანსი                                │
├───────────────────────────────────────────────────────────────┤
│ შემოსავალი:                                                  │
│   • Daily login: ~200 coins (საშუალო)                        │
│   • Chest ×4: 400 coins                                      │
│   • Missions: ~150 coins                                     │
│   • Wins (50% win rate, 5 games): +500 coins net profit      │
│   ─────────────────────────────────────────                  │
│   სულ: ~1250 coins/day                                       │
│                                                               │
│ ხარჯი:                                                        │
│   • 5 თამაში stake: 2500 coins (გადახდილი წინასწარ)          │
│   • Win back (50%): -1250 coins                              │
│   ─────────────────────────────────────────                  │
│   Net stake cost: ~1250 coins/day                            │
│                                                               │
│ ბალანსი: ~0 (ნეიტრალური)                                     │
│                                                               │
│ 💡 თუ უნდა მეტი თამაში:                                      │
│   • უყურე რეკლამას: +1 თამაში                                │
│   • დაელოდე 4სთ: +1 თამაში                                   │
│   • იყიდე gems: გადაუდებელი                                  │
└───────────────────────────────────────────────────────────────┘
```

### VIP მოთამაშის უპირატესობა:

```text
┌───────────────────────────────────────────────────────────────┐
│ 👑 VIP USER - დღიური ბალანსი                                 │
├───────────────────────────────────────────────────────────────┤
│ შემოსავალი:                                                  │
│   • Daily login: ~200 coins                                  │
│   • Chest ×4: 400 coins                                      │
│   • Missions: ~150 coins                                     │
│   • Unlimited plays - No stake needed!                       │
│   ─────────────────────────────────────────                  │
│   სულ: ~750 coins + XP bonus                                 │
│                                                               │
│ ხარჯი: 0 (no stake for VIP)                                  │
│                                                               │
│ ბალანსი: +750 coins/day pure profit                          │
│                                                               │
│ 💎 VIP ღირებულება: 50 gems/month = ₾5                       │
│    ROI: 30 days × 750 = 22,500 coins = 450 gems value       │
│    Net gain: 400 gems value/month!                           │
└───────────────────────────────────────────────────────────────┘
```

---

## შესასრულებელი ცვლილებები

### ფაილი 1: `src/config/rewardConfig.ts`

```typescript
export const REWARDS = {
  // Stakes - unchanged
  GAME_STAKE: 500,
  GAME_WIN_REWARD: 1000,
  GAME_DRAW_REFUND: 250,
  GAME_LOSE_REWARD: 0,

  // NEW: Play regeneration
  PLAY_REGEN_HOURS: 4,           // 1 play every 4 hours
  PLAY_REGEN_MAX: 3,             // Max stored regenerated plays
  PLAYS_PER_AD: 1,               // 1 play per ad (not 2)
  MAX_ADS_PER_DAY: 5,            // Limit ad watching
  GEMS_FOR_PLAYS: 3,             // 3 gems = 2 instant plays
  GEMS_PLAYS_AMOUNT: 2,

  // Daily Rewards - REDUCED
  DAILY_REWARDS: [
    { day: 1, coins: 100, gems: 0 },
    { day: 2, coins: 150, gems: 0 },
    { day: 3, coins: 200, gems: 1 },
    { day: 4, coins: 250, gems: 0 },
    { day: 5, coins: 350, gems: 1 },
    { day: 6, coins: 450, gems: 1 },
    { day: 7, coins: 500, gems: 2 },
  ],

  // Chest - REDUCED
  CHEST_COINS: 100,              // was 200
  CHEST_GEMS: 1,                 // was 3
  CHEST_COOLDOWN_HOURS: 6,       // was 4

  // Spin - REDUCED
  SPIN_REWARDS: [
    { type: "coins", value: 50, label: "50 მონეტა" },
    { type: "coins", value: 100, label: "100 მონეტა" },
    { type: "coins", value: 200, label: "200 მონეტა" },
    { type: "coins", value: 300, label: "300 მონეტა" },
    { type: "gems", value: 1, label: "1 ალმასი" },
    { type: "gems", value: 2, label: "2 ალმასი" },
    { type: "coins", value: 75, label: "75 მონეტა" },
    { type: "powerup", value: 1, label: "ძალა" },
  ],

  // Ad Watch - CHANGED
  AD_WATCH_PLAYS: 1,             // Give plays, not coins

  // New Player - REDUCED
  NEW_PLAYER_COINS: 1500,        // was 2000
  NEW_PLAYER_GEMS: 5,            // was 10

  // Level Up - REDUCED
  LEVEL_UP_COINS_PER_LEVEL: 75,  // was 100
};
```

### ფაილი 2: `src/hooks/useDailyPlays.ts`

ახალი ლოგიკა play regeneration-ისთვის:

```typescript
const MAX_FREE_PLAYS = 5;
const PLAYS_PER_AD = 1;              // Reduced from 2
const PLAY_REGEN_HOURS = 4;          // New: regenerate 1 play every 4 hours
const PLAY_REGEN_MAX = 3;            // New: max regenerated plays
const MAX_ADS_PER_DAY = 5;           // New: limit ads

interface DailyPlaysData {
  plays_used: number;
  plays_from_ads: number;
  plays_regenerated: number;         // New field
  last_regen_at: string | null;      // New field
  ads_watched_today: number;         // New field
}
```

### ფაილი 3: `src/hooks/useShopData.tsx`

ფასების განახლება VIP და power-ups-ისთვის.

---

## მონაცემთა ბაზის ცვლილებები

### ახალი სვეტები `user_daily_plays` ცხრილში:

```sql
ALTER TABLE user_daily_plays 
ADD COLUMN plays_regenerated INTEGER DEFAULT 0,
ADD COLUMN last_regen_at TIMESTAMPTZ,
ADD COLUMN ads_watched_today INTEGER DEFAULT 0;
```

### `economy_config` ცხრილის განახლება:

```sql
UPDATE economy_config SET value = 100 WHERE id = 'daily_reward_day_1';
UPDATE economy_config SET value = 150 WHERE id = 'daily_reward_day_2';
UPDATE economy_config SET value = 200 WHERE id = 'daily_reward_day_3';
-- ... და ა.შ.
```

---

## მოსალოდნელი შედეგები

| მეტრიკა | მანამდე | შემდეგ |
|---------|---------|--------|
| უფასო თამაშები/კვირა | 35+ (5×7 + rewards) | ~45 (5×7 + regen + ads) |
| უფასო მონეტები/კვირა | ~5000+ | ~2500 |
| VIP value proposition | საშუალო | მაღალი (stake-free) |
| Shop conversion | დაბალი | მაღალი (საჭიროება) |
| Retention hook | სუსტი | ძლიერი (regen timer) |

---

## რეზიუმე

ეს ალგორითმი:
1. ✅ ამცირებს უფასო მონეტებს რომ shop-ს აზრი ჰქონდეს
2. ✅ ამატებს play regeneration-ს engagement-ისთვის
3. ✅ VIP-ს აძლევს რეალურ უპირატესობას (stake-free)
4. ✅ რეკლამას აქცევს თამაშად (არა მონეტებად)
5. ✅ ბალანსირებს missions და daily rewards-ს
