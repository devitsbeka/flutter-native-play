

# Plan: Generate Relevant Room Icons with Matching Room Names

## Problem Identified

Currently, the room creation flow generates:
1. A creative **AI-generated room name** (e.g., "ტვინის გამოსაცდელი", "ცოდნის ასისი")  
2. A completely **random icon** from the 9,000+ icon library

These two are **not connected** - the name might be "Brain Battle" but the icon could be a lollipop or shark fin hat. This creates a confusing and less engaging experience.

## Solution: Two-Phase AI Generation

Generate the name and icon **together** in a single AI call that produces both a thematic name AND a relevant icon search term. Then use that term to find a matching icon from the library.

### How It Works

```text
┌──────────────────────────────────────────────────────────────┐
│                    generate-room-name                        │
├──────────────────────────────────────────────────────────────┤
│  1. AI generates BOTH name + icon keyword together           │
│     Prompt: "Create a room name AND a matching icon theme"   │
│                                                              │
│  2. Response example:                                        │
│     { "name": "ტვინების ომი", "icon_keyword": "brain" }      │
│                                                              │
│  3. Search icon_library for icons matching that keyword      │
│     SELECT * FROM icon_library                               │
│     WHERE title ILIKE '%brain%' OR tags @> '["brain"]'       │
│                                                              │
│  4. Return matched name + icon pair                          │
└──────────────────────────────────────────────────────────────┘
```

## Technical Changes

### File: `supabase/functions/generate-room-name/index.ts`

**1. Update AI Prompt to Generate Both Name + Icon Keyword**

```typescript
const prompt = `შექმენი ქართული სახელი ტრივია თამაშის ოთახისთვის და შესაბამისი აიკონის საძიებო სიტყვა.

მოთხოვნები სახელისთვის:
- მაქსიმუმ 18 სიმბოლო
- 1-2 სიტყვა მაქსიმუმ  
- კრეატიული და სახალისო
- მხოლოდ ქართული (IQ შეიძლება)

აიკონის სიტყვა უნდა იყოს:
- ინგლისურად, 1 სიტყვა
- რომელიც შეესაბამება სახელის თემას
- მაგალითად: brain, trophy, star, book, lightning, rocket, crown, wizard

დააბრუნე JSON ფორმატში:
{"name": "სახელი აქ", "icon_keyword": "keyword"}

მაგალითები:
{"name": "ტვინების ომი", "icon_keyword": "brain"}
{"name": "IQ გენიუსები", "icon_keyword": "lightbulb"}
{"name": "მეცნიერები", "icon_keyword": "scientist"}
{"name": "ვარსკვლავები", "icon_keyword": "star"}`;
```

**2. Parse JSON Response from AI**

```typescript
// Parse AI response as JSON
let generatedName = getRandomFallbackName();
let iconKeyword = null;

try {
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    generatedName = validateAndCleanName(parsed.name || '');
    iconKeyword = parsed.icon_keyword?.toLowerCase()?.trim() || null;
  }
} catch (e) {
  console.error('Failed to parse AI JSON:', e);
  // Fall back to treating response as plain name
  generatedName = validateAndCleanName(rawResponse);
}
```

**3. Search Icon Library by Keyword**

```typescript
// If we have a keyword, search for relevant icon
let selectedIconUrl: string | null = null;

if (iconKeyword) {
  // Try to find icon matching the keyword in title or tags
  const { data: matchingIcons, error } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title, tags')
    .not('icon_url', 'is', null)
    .or(`title.ilike.%${iconKeyword}%,tags.cs.{${iconKeyword}}`)
    .limit(10);
  
  if (!error && matchingIcons && matchingIcons.length > 0) {
    // Pick random from matches for variety
    const randomMatch = matchingIcons[Math.floor(Math.random() * matchingIcons.length)];
    selectedIconUrl = randomMatch.icon_url;
    console.log(`Matched icon "${randomMatch.slug}" for keyword "${iconKeyword}"`);
  }
}

// Fallback to random if no match found
if (!selectedIconUrl) {
  const { data: randomIcon } = await supabase
    .from('icon_library')
    .select('slug, icon_url')
    .not('icon_url', 'is', null)
    .order('random()')
    .limit(1);
  
  if (randomIcon?.[0]) {
    selectedIconUrl = randomIcon[0].icon_url;
  }
}
```

**4. Add Curated Keyword-to-Category Fallback Map**

For common trivia themes, provide reliable icon mappings:

```typescript
const THEME_ICON_FALLBACKS: Record<string, string> = {
  // Knowledge themes
  'brain': 'brain',
  'smart': 'brain', 
  'genius': 'lightbulb',
  'lightbulb': 'lightbulb',
  'idea': 'lightbulb',
  
  // Competition themes
  'battle': 'sword',
  'war': 'shield',
  'champion': 'trophy',
  'trophy': 'trophy',
  'winner': 'medal',
  'crown': 'crown',
  
  // Knowledge themes
  'book': 'book',
  'science': 'flask',
  'scientist': 'scientist',
  'wizard': 'wizard-hat',
  'magic': 'magic-wand',
  
  // Speed/energy themes  
  'lightning': 'lightning',
  'fast': 'rocket',
  'rocket': 'rocket',
  'star': 'star',
};
```

## Visual Result

**Before (disconnected):**
```text
┌─────────────────────────────────┐
│ 🔴 (buzzer)  ტვინის გამოსაცდელი │  ← Random buzzer icon
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🔴 (buzzer)  ცოდნის ასისი       │  ← Same random icon
└─────────────────────────────────┘
```

**After (thematically connected):**
```text
┌─────────────────────────────────┐
│ 🧠 (brain)   ტვინის გამოსაცდელი │  ← Brain icon matches "brain test"
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📚 (books)   ცოდნის ასისი       │  ← Book/knowledge icon matches
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⚡ (lightning) IQ სპრინტი       │  ← Lightning for speed theme
└─────────────────────────────────┘
```

## Summary

| Component | Change |
|-----------|--------|
| AI Prompt | Request JSON with both `name` and `icon_keyword` |
| Response Parser | Extract keyword from JSON response |
| Icon Selection | Search library by keyword (title/tags match) |
| Fallback | Curated keyword-to-slug map + random fallback |

This creates a cohesive experience where room names and icons are **meaningfully connected**, making room creation more engaging and fun.

