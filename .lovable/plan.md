

## Fix Georgian Ergative Case ("-მ") in Notification Titles

### Problem
Notification titles show names without the Georgian ergative case suffix. For example, "Barbara მოიწონა შენი ტრივია" is grammatically incorrect -- it should be "Barbara-მ მოიწონა შენი ტრივია".

### Changes

All 4 notification creation points need the nickname formatted with "-მ" suffix:

**1. `src/hooks/useSocialFeed.ts` -- Like notification (line 166)**
```
Before: `${senderProfile?.nickname || "ვიღაცამ"} მოიწონა შენი ტრივია`
After:  `${senderProfile?.nickname ? senderProfile.nickname + "-მ" : "ვიღაცამ"} მოიწონა შენი ტრივია`
```

**2. `src/hooks/useSocialFeed.ts` -- Save notification (line 227)**
```
Before: `${senderProfile?.nickname || "ვიღაცამ"} შეინახა შენი ტრივია`
After:  `${senderProfile?.nickname ? senderProfile.nickname + "-მ" : "ვიღაცამ"} შეინახა შენი ტრივია`
```

**3. `src/components/social/QuizPlayModal.tsx` -- Play notification (line 222)**
```
Before: `${senderProfile?.nickname || "ვიღაცამ"} ითამაშა შენი ტრივია`
After:  `${senderProfile?.nickname ? senderProfile.nickname + "-მ" : "ვიღაცამ"} ითამაშა შენი ტრივია`
```

**4. `src/contexts/MultiplayerContextV2.tsx` -- Multiplayer play notification (line 38)**
```
Before: `${playerProfile?.nickname || "ვიღაცამ"} ითამაშა შენი ტრივია`
After:  `${playerProfile?.nickname ? playerProfile.nickname + "-მ" : "ვიღაცამ"} ითამაშა შენი ტრივია`
```

### Why this works
- When a nickname exists, we append "-მ" (e.g., "Barbara-მ მოიწონა")
- The fallback "ვიღაცამ" already has the ergative suffix built in, so no change needed there
- This is the standard Georgian grammatical convention for foreign/Latin-script names acting as the subject of an action verb

### Files changed
| File | Lines |
|------|-------|
| `src/hooks/useSocialFeed.ts` | 166, 227 |
| `src/components/social/QuizPlayModal.tsx` | 222 |
| `src/contexts/MultiplayerContextV2.tsx` | 38 |
