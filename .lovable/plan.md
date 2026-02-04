

# Plan: Creative Icon-Based Room Name Generation

## Problem

Current room names are repetitive - too many names use similar patterns like "გონების...", "ტვინების...", etc. The AI generates from a limited set of styles and the fallback names also lack diversity.

## Solution Overview

Create a completely new naming system where:
1. Each room name is generated based on a **randomly selected themed icon**
2. Names match the icon's theme but with huge variety
3. Multiple distinct naming patterns per theme (not just one word + "გონების")

---

## Implementation Strategy

### Step 1: Expand Icon Theme Categories

Instead of 6 generic styles, create 15+ thematic groups with 8-10 diverse name templates each:

**Theme Groups (each with paired icon keywords):**

| Theme | Icon Keywords | Sample Names (diverse patterns) |
|-------|--------------|--------------------------------|
| **Champion** | trophy, medal, crown | ოქროს თასი, ვარსკვლავთა კლუბი, პირველობის რინგი |
| **Adventure** | rocket, compass, map | კოსმოსის მოგზაური, ექსპედიცია X, აღმოჩენის გზა |
| **Creature** | dragon, phoenix, unicorn | ცეცხლის მცველი, მითიური ბუნაგი, ლეგენდის კვალი |
| **Animal** | lion, wolf, eagle, bear, tiger | მტაცებლის ხროვა, ბუნაგის მეფე, მფრინავი მხედარი |
| **Battle** | sword, shield, boxing | ჯავშნის რინგი, კლინკის ჟღერა, მეომრის ბილიკი |
| **Magic** | wizard, wand, crystal | ჯადოქართა სახლი, კრისტალის კოშკი, მოჯადოე კლანი |
| **Party** | balloon, confetti, cake | ზეიმის მოედანი, ფეიერვერკი, სახალისო ბუდე |
| **Nature** | tree, mountain, sun | მწვერვალის ჯგუფი, მზის ხეობა, ტყის კლანი |
| **Tech** | robot, chip, gamepad | კიბერ არენა, პიქსელების ომი, დიჯიტალ გვარდია |
| **Music** | guitar, piano, headphones | რიტმის კლუბი, ნოტების ბრძოლა, ჰარმონია |
| **Mystery** | detective, mask, key | საიდუმლო კლუბი, გამოცანის სახლი, დეტექტივები |
| **Speed** | racing, lightning, flame | მეხის სიჩქარე, ელვის გუნდი, თავგადასავალი |
| **Ocean** | shark, anchor, wave | ზღვის მგლები, ოკეანის კლანი, ტალღის მხედარი |
| **Food** | pizza, burger, chef | გემოვნების ბრძოლა, შეფთა დუელი, გურმანთა კლუბი |
| **Space** | astronaut, planet, star | გალაქტიკის რინგი, ვარსკვლავთა ჯგუფი, კოსმიური ჯგუფი |

### Step 2: Name Generation Logic

```text
1. Pick random theme group (15 options)
2. Pick random icon keyword from that group
3. Pick random name template from that group
4. Search icon_library for matching icon
5. Return name + icon_url
```

### Step 3: Ensure No Repetition

- Use 8-10 unique name templates per theme
- Avoid reusing same words across templates
- Add slight randomization with adjective prefixes

---

## Technical Changes

### File: `supabase/functions/generate-room-name/index.ts`

**Replace** the existing prompt + fallback logic with new icon-themed name generation:

```typescript
// Theme-based room names (15 themes × 8-10 names each = 120+ options)
const THEMED_ROOM_NAMES: Record<string, { names: string[], iconKeywords: string[] }> = {
  champion: {
    names: [
      "ოქროს თასი",        // Golden Cup
      "ვარსკვლავთა ბრძოლა", // Stars Battle
      "მედლების კლუბი",    // Medals Club
      "ჩემპიონები",        // Champions
      "პირველობის რინგი",   // Championship Ring
      "გამარჯვებულთა ზონა", // Winners Zone
      "ტრიუმფის არენა",     // Triumph Arena
      "პოდიუმის გზა",       // Podium Way
    ],
    iconKeywords: ['trophy', 'medal', 'crown', 'cup', 'winner', 'gold']
  },
  adventure: {
    names: [
      "კოსმოსის მოგზაური",  // Space Traveler
      "ექსპედიცია X",       // Expedition X
      "აღმოჩენის გზა",      // Discovery Path
      "მკვლევართა კლანი",   // Explorers Clan
      "ჰორიზონტის მიღმა",   // Beyond Horizon
      "საზღვრების მიღმა",   // Beyond Borders
      "ძიების ბილიკი",      // Search Trail
      "ახალი ტერიტორია",    // New Territory
    ],
    iconKeywords: ['rocket', 'compass', 'map', 'telescope', 'binoculars']
  },
  creature: {
    names: [
      "ცეცხლის მცველი",     // Fire Guardian
      "მითიური ბუნაგი",     // Mythical Den
      "ლეგენდის კვალი",     // Legend's Trail
      "ჯადოსნური არსება",   // Magical Creature
      "ფანტასტიური კლუბი",  // Fantastic Club
      "მონსტრების ლიგა",    // Monsters League
      "ზღაპრის სამყარო",    // Fairytale World
      "ფრთოსანთა კლანი",    // Winged Clan
    ],
    iconKeywords: ['dragon', 'phoenix', 'unicorn', 'griffin', 'pegasus']
  },
  animal: {
    names: [
      "მტაცებლის ხროვა",    // Predator Pack
      "ბუნაგის მეფე",       // Den King
      "მფრინავი მხედარი",   // Flying Rider
      "ველური კლანი",       // Wild Clan
      "ბუნების ძალა",       // Nature's Power
      "თათების ლიგა",       // Paws League
      "ფოლადის კლანჭა",     // Steel Claw
      "სწრაფი ნადირი",      // Swift Hunter
    ],
    iconKeywords: ['lion', 'wolf', 'eagle', 'bear', 'tiger', 'shark', 'panther']
  },
  battle: {
    names: [
      "ჯავშნის რინგი",      // Armor Ring
      "კლინკის ჟღერა",      // Blade Clang
      "მეომრის ბილიკი",     // Warrior's Path
      "ფარების კედელი",     // Shield Wall
      "გლადიატორები",       // Gladiators
      "რაინდთა კლანი",      // Knights Clan
      "ბრძოლის მოედანი",    // Battle Arena
      "ფოლადის გუნდი",      // Steel Team
    ],
    iconKeywords: ['sword', 'shield', 'boxing', 'knight', 'armor', 'battle']
  },
  magic: {
    names: [
      "ჯადოქართა სახლი",    // Wizards House
      "კრისტალის კოშკი",    // Crystal Tower
      "მოჯადოე კლანი",      // Enchanted Clan
      "შელოცვის წრე",       // Spell Circle
      "მაგიური ბროლი",      // Magic Orb
      "ალქიმიკოსები",       // Alchemists
      "ჯადოს სკოლა",        // Magic School
      "მისტიკის კლუბი",     // Mystic Club
    ],
    iconKeywords: ['wizard', 'wand', 'crystal', 'magic', 'potion', 'hat']
  },
  party: {
    names: [
      "ზეიმის მოედანი",     // Celebration Square
      "ფეიერვერკი",         // Fireworks
      "სახალისო ბუდე",      // Fun Nest
      "წვეულების კლუბი",    // Party Club
      "ბალონების ომი",      // Balloon War
      "კონფეტის წვიმა",     // Confetti Rain
      "დღესასწაული",        // Holiday
      "ფესტივალი",          // Festival
    ],
    iconKeywords: ['balloon', 'confetti', 'cake', 'party', 'gift', 'fireworks']
  },
  nature: {
    names: [
      "მწვერვალის ჯგუფი",   // Summit Group
      "მზის ხეობა",         // Sun Valley
      "ტყის კლანი",         // Forest Clan
      "მთის მგლები",        // Mountain Wolves
      "ბუნების ძალა",       // Nature's Force
      "მწვანე ლიგა",        // Green League
      "ხეობის მცველი",      // Valley Guardian
      "კლდის არწივები",     // Rock Eagles
    ],
    iconKeywords: ['tree', 'mountain', 'sun', 'leaf', 'forest', 'flower']
  },
  tech: {
    names: [
      "კიბერ არენა",        // Cyber Arena
      "პიქსელების ომი",     // Pixel War
      "დიჯიტალ გვარდია",    // Digital Guard
      "კოდის მეომრები",     // Code Warriors
      "ტექნო კლანი",        // Techno Clan
      "რობოტების ლიგა",     // Robots League
      "ჩიპის ჯგუფი",        // Chip Squad
      "მატრიცის რინგი",     // Matrix Ring
    ],
    iconKeywords: ['robot', 'chip', 'gamepad', 'laptop', 'console', 'controller']
  },
  music: {
    names: [
      "რიტმის კლუბი",       // Rhythm Club
      "ნოტების ბრძოლა",     // Notes Battle
      "ჰარმონია",           // Harmony
      "მელოდიის კლანი",     // Melody Clan
      "კონცერტის ზონა",     // Concert Zone
      "ბითების არენა",      // Beats Arena
      "როკის ბუნაგი",       // Rock Den
      "ჯაზის კლუბი",        // Jazz Club
    ],
    iconKeywords: ['guitar', 'piano', 'headphones', 'microphone', 'music', 'drum']
  },
  mystery: {
    names: [
      "საიდუმლო კლუბი",     // Secret Club
      "გამოცანის სახლი",    // Riddle House
      "დეტექტივები",        // Detectives
      "შერლოკის კლანი",     // Sherlock Clan
      "მისტერიის ზონა",     // Mystery Zone
      "გასაღების მფლობელი", // Key Holder
      "ნიღბის უკან",        // Behind the Mask
      "საიდუმლო საზოგადო",  // Secret Society
    ],
    iconKeywords: ['detective', 'mask', 'key', 'magnifier', 'mystery', 'spy']
  },
  speed: {
    names: [
      "მეხის სიჩქარე",      // Thunder Speed
      "ელვის გუნდი",        // Lightning Team
      "თავგადასავალი",      // Thrill
      "რბოლის კლუბი",       // Racing Club
      "ტურბო არენა",        // Turbo Arena
      "სწრაფი და ფოლადი",   // Fast & Steel
      "ნიტროს რინგი",       // Nitro Ring
      "სიჩქარის ეშმაკი",    // Speed Demon
    ],
    iconKeywords: ['racing', 'lightning', 'flame', 'car', 'motorcycle', 'bolt']
  },
  ocean: {
    names: [
      "ზღვის მგლები",       // Sea Wolves
      "ოკეანის კლანი",      // Ocean Clan
      "ტალღის მხედარი",     // Wave Rider
      "მეკობრეები",         // Pirates
      "წყალქვეშა ლიგა",     // Underwater League
      "ზვიგენის კბილი",     // Shark Tooth
      "ნავთსადგური",        // Harbor
      "კაპიტნის ხიდი",      // Captain's Bridge
    ],
    iconKeywords: ['shark', 'anchor', 'wave', 'ship', 'pirate', 'whale', 'octopus']
  },
  food: {
    names: [
      "გემოვნების ბრძოლა",  // Taste Battle
      "შეფთა დუელი",        // Chefs Duel
      "გურმანთა კლუბი",     // Gourmets Club
      "რეცეპტის საიდუმლო",  // Recipe Secret
      "სამზარეულოს ომი",    // Kitchen War
      "დეგუსტაცია",         // Tasting
      "ფლეივერის ზონა",     // Flavor Zone
      "გასტრო არენა",       // Gastro Arena
    ],
    iconKeywords: ['pizza', 'burger', 'chef', 'cooking', 'cake', 'food']
  },
  space: {
    names: [
      "გალაქტიკის რინგი",   // Galaxy Ring
      "ვარსკვლავთა ჯგუფი", // Stars Group
      "კოსმიური კლანი",     // Cosmic Clan
      "ასტრონავტები",       // Astronauts
      "ორბიტის მცველი",     // Orbit Guardian
      "პლანეტების ლიგა",    // Planets League
      "მეტეორის გზა",       // Meteor Path
      "კოსმოსის კაპიტანი",  // Space Captain
    ],
    iconKeywords: ['astronaut', 'planet', 'star', 'moon', 'satellite', 'ufo']
  }
};
```

**New generation flow:**

```typescript
function generateThemedRoomName(): { name: string, iconKeyword: string } {
  // Get all theme keys
  const themes = Object.keys(THEMED_ROOM_NAMES);
  
  // Pick random theme
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const themeData = THEMED_ROOM_NAMES[randomTheme];
  
  // Pick random name from that theme
  const randomName = themeData.names[Math.floor(Math.random() * themeData.names.length)];
  
  // Pick random icon keyword from that theme
  const randomKeyword = themeData.iconKeywords[Math.floor(Math.random() * themeData.iconKeywords.length)];
  
  return { name: randomName, iconKeyword: randomKeyword };
}
```

### File: `src/utils/roomNameGenerator.ts`

**Update** fallback names to use the same diverse themed approach (in case edge function fails).

---

## Result

| Before | After |
|--------|-------|
| 12 fallback names | 120+ themed names |
| 6 style categories | 15 distinct themes |
| Repetitive "გონების..." | Diverse themed names |
| AI with limited examples | Pure random from curated list |
| Names don't match icons | Names always match icon theme |

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-room-name/index.ts` | Replace AI prompt with themed name generation |
| `src/utils/roomNameGenerator.ts` | Update fallback names to match new themes |

