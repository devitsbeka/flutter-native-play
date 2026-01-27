

# UI Improvements for Trivia & Collection Creation

## Overview

Two separate improvements for the creation flows:

1. **Create Trivia page (CreateBlindTriviaModal)**: Add "+ დაამატე რაუნდი" button and limit suggestions to 4
2. **Create Collection page (CreateCollectionModal)**: Add rotating suggestions and dynamic title based on round count

---

## Part 1: Create Trivia Page Changes

### File: `src/components/team/CreateBlindTriviaModal.tsx`

#### 1.1 Reduce suggestions from 6 to 4
```typescript
// Line 107: Change from 6 to 4
const selected = shuffled.slice(0, 4);
```

Also update the placeholder skeleton count:
```typescript
// Line 405: Change from 6 to 4
Array.from({ length: 4 }).map((_, i) => (
  <div key={i} className="h-9 w-24 bg-white/20 rounded-full animate-pulse" />
))
```

#### 1.2 Add "+ დაამატე რაუნდი" button
Add a button below the suggestions that opens CreateCollectionModal (or navigates to collection creation) since adding rounds means creating a collection with multiple rounds:

```typescript
// After the suggestions section, add button:
<button
  onClick={() => {
    // Switch to collection creation mode
    onOpenChange(false);
    // Trigger collection creation with current subject as first round
  }}
  className="w-full py-3 rounded-xl bg-white/20 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors mt-4"
>
  <Plus className="w-5 h-5" />
  დაამატე რაუნდი
</button>
```

**Alternative approach**: Add a callback prop `onSwitchToCollection?: (firstRoundSubject: string) => void` that the parent component can handle to switch from trivia to collection creation mode.

---

## Part 2: Create Collection Page Changes

### File: `src/components/social/CreateCollectionModal.tsx`

#### 2.1 Add rotating suggestions for round topics

**Add topic pool and suggestion state** (similar to trivia modal):
```typescript
// Add near top with other constants
const COLLECTION_TOPIC_POOL = [
  { label: "სპორტი", icon_slug: "basketball" },
  { label: "მუსიკა", icon_slug: "music-note" },
  { label: "ფილმები", icon_slug: "film-reel" },
  { label: "ისტორია", icon_slug: "clock" },
  { label: "გეოგრაფია", icon_slug: "globe" },
  { label: "სამეცნიერო", icon_slug: "chemistry" },
  // ... more topics
];
```

**Add state for rotating suggestions:**
```typescript
const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
const [suggestionIndex, setSuggestionIndex] = useState(0);
```

**Add auto-rotation effect:**
```typescript
useEffect(() => {
  // Rotate suggestions every 3 seconds
  const shuffled = [...COLLECTION_TOPIC_POOL].sort(() => Math.random() - 0.5);
  setTopicSuggestions(shuffled.map(t => t.label));
  
  const interval = setInterval(() => {
    setSuggestionIndex(prev => (prev + 4) % shuffled.length);
  }, 3000);
  
  return () => clearInterval(interval);
}, [open]);
```

**Add suggestions section in Step 2** (below the round inputs and before the "+ დაამატე რაუნდი" button):
```typescript
{/* Suggestions - max 4 at a time, rotating */}
<div className="space-y-2">
  <span className="text-sm text-white/70">💡 იდეები:</span>
  <div className="flex flex-wrap gap-2">
    {topicSuggestions.slice(suggestionIndex, suggestionIndex + 4).map((topic) => (
      <motion.button
        key={topic}
        onClick={() => {
          // Add to empty round or create new round
          const emptyIndex = roundNames.findIndex(n => !n.trim());
          if (emptyIndex !== -1) {
            updateRoundName(emptyIndex, topic);
          } else if (roundNames.length < 5) {
            setRoundNames([...roundNames, topic]);
          }
        }}
        className="px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white hover:bg-white/30"
      >
        {topic}
      </motion.button>
    ))}
  </div>
</div>
```

#### 2.2 Dynamic title based on round count

**Change the title dynamically in Step 2:**
```typescript
// Line 869: Change static title to dynamic
<h3 className="text-2xl font-bold text-white mb-2">
  {roundNames.length === 1 ? "შექმენი Trivia" : "შექმენი კოლექცია"}
</h3>
<p className="text-white/70">
  {roundNames.length === 1 
    ? "ჩაწერე თემა" 
    : "ჩაწერე რა თემებზე გსურს რაუნდები"}
</p>
```

**Update the icon based on mode:**
```typescript
<img 
  src={roundNames.length === 1 ? triviaBuzzer : iconCollections} 
  alt="Create" 
  className="w-16 h-16 object-contain" 
/>
```

This requires importing `triviaBuzzer`:
```typescript
import triviaBuzzer from "@/assets/trivia-buzzer.png";
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/CreateBlindTriviaModal.tsx` | Reduce suggestions to 4, add "+ დაამატე რაუნდი" button with callback |
| `src/components/social/CreateCollectionModal.tsx` | Add rotating suggestions, dynamic title/icon based on round count |

---

## Visual Summary

### Create Trivia (1 round):
- Input field for topic
- 4 suggestion chips (reduced from 6)
- **NEW**: "+ დაამატე რაუნდი" button → switches to collection mode

### Create Collection (2+ rounds):
- Multiple input fields with delete buttons
- **NEW**: Rotating suggestions (4 at a time, every 3 seconds)
- "+ დაამატე რაუნდი" button (already exists)
- When user deletes down to 1 round:
  - Title changes to "შექმენი Trivia"
  - Show suggestions below input

