

# Wire AdMob Child-Safety Flags (TFCD/TFUA) Based on User Age Group

## Summary
The age gate UI, onboarding flow, and database column (`age_group`) are already implemented. The remaining work is to pass the correct child-directed treatment flags to AdMob when loading/showing ads, based on the user's stored age group.

## What Changes

### 1. Update `adService.ts` -- Add age group awareness
- Add a `setAgeGroup(ageGroup: string | null)` method to the `AdService` class
- Store the age group internally (similar to how `setVipStatus` works)
- When calling `AdMob.prepareRewardVideoAd()`, pass the AdMob child-safety options:
  - `tagForChildDirectedTreatment: true` -- when age group is `"child"` (under 16)
  - `tagForUnderAgeOfConsent: true` -- when age group is `"child"` or `"teen"` (under 18)
  - `maxAdContentRating: 'G'` for children, `'T'` for teens, none for adults
- For child users, also set `npa: true` (non-personalized ads) to comply with COPPA/GDPR

### 2. Update `WatchAdModal.tsx` and `WatchAdForSpinsModal.tsx` -- Pass age group to adService
- Before loading/showing ads, call `adService.setAgeGroup(profile?.age_group)` using the profile from `useAuth()`
- This ensures the correct flags are set before each ad request

### 3. Update `adService.initialize()` -- Pass child flags during AdMob initialization
- Add `requestConfiguration` call after `AdMob.initialize()` to set global child-safety defaults based on the stored age group

## Technical Details

The key AdMob configuration options:

```text
AdMob.initialize() options:
  - tagForChildDirectedTreatment: boolean  (COPPA - under 13/16)
  - tagForUnderAgeOfConsent: boolean       (GDPR - under 18)
  - maxAdContentRating: 'G' | 'PG' | 'T' | 'MA'

prepareRewardVideoAd() options:
  - npa: '1'  (non-personalized ads for minors)
```

Age group mapping:
- `"child"` -> TFCD=true, TFUA=true, maxRating='G', npa=true
- `"teen"` -> TFCD=false, TFUA=true, maxRating='T', npa=true
- `"adult"` / null -> no restrictions

## Files Modified
- `src/services/adService.ts` -- Add age group methods and pass flags to AdMob calls
- `src/components/home/WatchAdModal.tsx` -- Set age group before ad calls
- `src/components/home/WatchAdForSpinsModal.tsx` -- Set age group before ad calls
