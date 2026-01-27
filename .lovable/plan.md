

# Make Collection Suggestions More Specific & Slower Rotation

## Problem

The current suggestions in the Create Collection modal are **generic categories** like "სპორტი", "მუსიკა", "ფილმები" which users already know. They should be **specific, engaging topics** like trending TV shows, interesting facts, or current events that inspire creativity.

Also, the suggestions rotate every **3 seconds** which is too fast - they should rotate every **4 seconds** to give users time to read and decide.

---

## Changes to Make

### File: `src/components/social/CreateCollectionModal.tsx`

#### 1. Replace Generic Categories with Specific Topics

**Current (lines 35-48):**
```typescript
const COLLECTION_TOPIC_POOL = [
  { label: "სპორტი", icon_slug: "basketball" },
  { label: "მუსიკა", icon_slug: "music-note" },
  { label: "ფილმები", icon_slug: "film-reel" },
  // ... generic categories
];
```

**New - Specific, Engaging Topics:**
```typescript
const COLLECTION_TOPIC_POOL = [
  // TV Shows & Entertainment
  { label: "Squid Game", icon_slug: "tv" },
  { label: "House of the Dragon", icon_slug: "dragon" },
  { label: "Wednesday", icon_slug: "gothic" },
  { label: "The Last of Us", icon_slug: "zombie" },
  
  // Trending & Pop Culture
  { label: "Taylor Swift", icon_slug: "music" },
  { label: "Marvel ფილმები", icon_slug: "superhero" },
  { label: "K-Pop", icon_slug: "star" },
  { label: "TikTok ტრენდები", icon_slug: "phone" },
  
  // Facts & Knowledge
  { label: "უცნაური ფაქტები", icon_slug: "lightbulb" },
  { label: "კოსმოსის საიდუმლოებები", icon_slug: "rocket" },
  { label: "ცხოველთა სამყარო", icon_slug: "paw" },
  { label: "ადამიანის სხეული", icon_slug: "heart" },
  
  // Georgian Topics  
  { label: "ქართული კინო", icon_slug: "film" },
  { label: "თბილისის ისტორია", icon_slug: "castle" },
  { label: "ქართული სამზარეულო", icon_slug: "food" },
  { label: "საქართველოს ბუნება", icon_slug: "mountain" },
  
  // Sports Specific
  { label: "Champions League", icon_slug: "trophy" },
  { label: "NBA ვარსკვლავები", icon_slug: "basketball" },
  { label: "ფორმულა 1", icon_slug: "car" },
  { label: "ოლიმპიური თამაშები", icon_slug: "medal" },
  
  // Science & Tech
  { label: "AI და რობოტები", icon_slug: "robot" },
  { label: "iPhone vs Android", icon_slug: "phone" },
  { label: "Video Games", icon_slug: "gamepad" },
  { label: "Social Media", icon_slug: "share" },
];
```

#### 2. Change Rotation Interval from 3s to 4s

**Current (line 117):**
```typescript
}, 3000);
```

**New:**
```typescript
}, 4000);
```

---

## Summary

| Change | Before | After |
|--------|--------|-------|
| Topic pool | Generic categories ("სპორტი", "მუსიკა") | Specific topics ("Squid Game", "უცნაური ფაქტები") |
| Rotation speed | 3 seconds | 4 seconds |
| Pool size | 12 items | ~28 items (more variety) |

This will make the suggestions more inspiring and give users actual ideas for engaging trivia topics rather than broad categories they could think of themselves.

