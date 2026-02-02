

# Plan: Make Room Names Fun & Thematically Connected to Icons

## Problem Analysis

Looking at the screenshot, the name "ჯკუის საკითხავი" (Quiz Reader) with a book icon is:
1. **Boring and literal** - sounds like a study session, not an exciting game
2. **Missing the social element** - trivia rooms are about friends gathering to compete
3. **No energy or excitement** - doesn't convey the fun, competitive nature

## Better Naming Philosophy

Room names for trivia games should evoke:
- **Competition & Battle** - It's a brain fight!
- **Team Spirit** - People gathering together
- **Fun & Energy** - Not a classroom, but a party
- **Clever Wordplay** - Makes people smile

## Curated Theme Categories

### 1. Battle/Competition Names (brain warfare)
| Georgian Name | Meaning | Icon Keywords |
|--------------|---------|---------------|
| ტვინების არენა | Brain Arena | arena, colosseum, stadium |
| IQ დუელი | IQ Duel | sword, duel, fencing |
| გონების რინგი | Mind Ring | boxing, ring, fight |
| ცოდნის ომი | Knowledge War | battle, war, shield |

### 2. Team/Squad Names (gathering vibes)
| Georgian Name | Meaning | Icon Keywords |
|--------------|---------|---------------|
| გენიოსთა კლუბი | Genius Club | group, friends, club |
| ჭკვიანთა ბანდა | Smart Gang | gang, team, squad |
| ერუდიტების ბრძოლა | Erudites' Battle | trophy, medal, crown |

### 3. Fun/Energy Names (party atmosphere)
| Georgian Name | Meaning | Icon Keywords |
|--------------|---------|---------------|
| IQ პარტი | IQ Party | party, celebration, confetti |
| ტვინის ფეირვორკი | Brain Fireworks | fireworks, explosion, lightning |
| გონების რეივი | Mind Rave | party, music, dance |

### 4. Mythical/Epic Names (dramatic flair)
| Georgian Name | Meaning | Icon Keywords |
|--------------|---------|---------------|
| ფენიქსის ბრძოლა | Phoenix Battle | phoenix, fire, dragon |
| დრაკონთა კლუბი | Dragon Club | dragon, fire, knight |
| ნინჯა ტვინები | Ninja Brains | ninja, samurai, warrior |

## Technical Implementation

### Update AI Prompt in `generate-room-name/index.ts`

Replace the current generic prompt with a more creative, theme-focused one:

```typescript
const prompt = `შექმენი კრეატიული და სახალისო ქართული სახელი ტრივია ოთახისთვის, სადაც მეგობრები იკრიბებიან გონებრივი ბრძოლისთვის.

სახელის სტილი უნდა იყოს ერთ-ერთი:
1. ბრძოლის თემა: "ტვინების არენა", "გონების რინგი", "IQ დუელი"
2. გუნდის თემა: "გენიოსთა კლუბი", "ჭკვიანთა ბანდა", "ერუდიტები"
3. წვეულების თემა: "IQ პარტი", "ტვინის ფეირვორკი", "გონების რეივი"
4. მითიური თემა: "ფენიქსის ბრძოლა", "დრაკონთა კლუბი", "ნინჯა ტვინები"
5. სპორტის თემა: "ჩემპიონთა ლიგა", "IQ ჩემპიონატი", "გონების ოლიმპიადა"

მოთხოვნები:
- მაქსიმუმ 18 სიმბოლო
- 1-2 სიტყვა
- სახალისო და ენერგიული
- არ გამოიყენო მოსაწყენი სიტყვები: კვიზი, საკითხავი, ტესტი, გამოცდა

აიკონის სიტყვა (ინგლისურად) უნდა შეესაბამებოდეს სახელის თემას:
- ბრძოლა: sword, shield, arena, boxing, knight
- გუნდი: friends, group, party, team, club
- მითიური: dragon, phoenix, ninja, wizard, lion
- სპორტი: trophy, medal, champion, crown, star

დააბრუნე JSON: {"name": "სახელი", "icon_keyword": "keyword"}`;
```

### Update Fallback Names

Replace boring fallbacks with exciting ones:

```typescript
const FALLBACK_NAMES = [
  // Battle themes
  "ტვინების არენა",   // Brain Arena
  "გონების რინგი",    // Mind Ring
  "IQ დუელი",         // IQ Duel
  // Team themes  
  "გენიოსთა კლუბი",   // Genius Club
  "ჭკვიანთა ბანდა",   // Smart Gang
  // Fun themes
  "IQ პარტი",         // IQ Party
  "გონების რეივი",    // Mind Rave
  // Epic themes
  "დრაკონთა კლუბი",   // Dragon Club
  "ნინჯა ტვინები",    // Ninja Brains
  "ფენიქსის ბრძოლა",  // Phoenix Battle
];
```

### Expand Icon Keyword Mappings

Add more fun and relevant icon search terms:

```typescript
const THEME_ICON_FALLBACKS: Record<string, string[]> = {
  // Battle/Competition
  'arena': ['arena', 'colosseum', 'stadium', 'ring'],
  'duel': ['sword', 'fencing', 'swords', 'fight'],
  'ring': ['boxing', 'ring', 'fight', 'arena'],
  
  // Team/Social  
  'club': ['friends', 'group', 'party', 'team'],
  'gang': ['group', 'friends', 'team'],
  'party': ['party', 'celebration', 'confetti', 'fireworks'],
  
  // Mythical/Epic
  'dragon': ['dragon', 'fire', 'knight'],
  'phoenix': ['phoenix', 'fire', 'flame', 'bird'],
  'ninja': ['ninja', 'samurai', 'warrior'],
  'wizard': ['wizard', 'magic', 'wand', 'hat'],
  'lion': ['lion', 'crown', 'king'],
  'tiger': ['tiger', 'stripes', 'wild'],
  'eagle': ['eagle', 'bird', 'flying'],
  'wolf': ['wolf', 'pack', 'wild'],
  
  // Victory/Success
  'champion': ['trophy', 'medal', 'crown', 'cup'],
  'winner': ['trophy', 'medal', 'star', 'crown'],
  'olympic': ['medal', 'torch', 'olympic'],
};
```

## Visual Examples

**Before (boring):**
```text
📚 ჯკუის საკითხავი    ← "Quiz Reading" with random book
📚 კვიზის ოთახი        ← "Quiz Room" - sounds like homework
```

**After (fun & matching):**
```text
🐉 დრაკონთა კლუბი     ← "Dragon Club" with dragon icon!
⚔️ ტვინების არენა     ← "Brain Arena" with arena/colosseum icon
🦁 ლომთა ბრძოლა       ← "Lions' Battle" with lion icon
🎉 IQ პარტი            ← "IQ Party" with party/celebration icon
🥷 ნინჯა ტვინები       ← "Ninja Brains" with ninja icon
```

## Summary

| Change | Purpose |
|--------|---------|
| New AI prompt with theme categories | Generate exciting, thematic names |
| Updated fallback names | No more boring "generic quiz" names |
| Expanded icon keyword mappings | Better icon-to-name matching |
| Banned boring words | No "კვიზი", "საკითხავი", "ტესტი" |

This creates room names that make people excited to join - like entering "Dragon Club" or "Ninja Brains" feels way more fun than "Quiz Reader"!

