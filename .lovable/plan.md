

# Feature: Creator Experience Mode Selection

## Overview
Add an option when creating Trivia or Collection to choose between two experiences:
1. **Edit Mode** - See all questions and answers to review and modify before publishing
2. **Play Mode (Blind)** - Don't see the answers, create content to play with friends/family without spoiling it for yourself

---

## User Flow

```text
User clicks "ტრივია" or "კოლექცია"
           ↓
   NEW: Experience Selection Step
   ┌─────────────────────────────────────┐
   │ როგორ გინდა შექმნა?                 │
   │                                     │
   │ ┌─────────────┐ ┌─────────────────┐ │
   │ │ 📝 რედაქტი- │ │ 🎮 თამაში      │ │
   │ │  რება       │ │ (მეგობრებთან)  │ │
   │ │             │ │                 │ │
   │ │ ნახე პასუ- │ │ არ ნახო პასუ-  │ │
   │ │ ხები,       │ │ ხები, ითამაშე  │ │
   │ │ შეასწორე   │ │ ერთად          │ │
   │ └─────────────┘ └─────────────────┘ │
   └─────────────────────────────────────┘
           ↓                    ↓
   Current flow:          Blind flow:
   Generate → Edit →      Generate → Title →
   Post                   Save → Start Game
```

---

## Implementation

### File 1: `src/components/social/CreateQuizModal.tsx`

**Add new step 0 for experience selection before topic input**

Changes:
- Add `creatorMode` state: `"edit" | "play"`
- Insert new step at the beginning for mode selection
- Shift existing steps by +1
- When `creatorMode === "play"`:
  - Skip showing questions in editor (step 5 becomes title/cover selection only)
  - Hide answer text in editor view OR skip editor entirely
  - Add "დაიწყე თამაში" button that saves trivia and opens game mode

**New State:**
```typescript
const [creatorMode, setCreatorMode] = useState<"edit" | "play" | null>(null);
```

**New Step (Step 1 - Mode Selection):**
```typescript
// Step 1: Choose experience mode
<div className="space-y-6">
  <div className="text-center">
    <h3 className="text-2xl font-bold text-white mb-2">როგორ გინდა შექმნა?</h3>
    <p className="text-white/70">აირჩიე შენთვის შესაფერისი გზა</p>
  </div>
  
  <div className="grid grid-cols-2 gap-4">
    {/* Edit Mode Card */}
    <button onClick={() => { setCreatorMode("edit"); setStep(2); }}>
      <div className="p-6 rounded-2xl bg-white/15 border border-white/20">
        <Edit3 className="w-10 h-10 text-white mb-3" />
        <h4 className="font-bold text-white">რედაქტირება</h4>
        <p className="text-white/60 text-sm">ნახე პასუხები, შეასწორე და გამოაქვეყნე</p>
      </div>
    </button>
    
    {/* Play Mode Card */}
    <button onClick={() => { setCreatorMode("play"); setStep(2); }}>
      <div className="p-6 rounded-2xl bg-white/15 border border-white/20">
        <Play className="w-10 h-10 text-white mb-3" />
        <h4 className="font-bold text-white">თამაში</h4>
        <p className="text-white/60 text-sm">არ ნახო პასუხები, ითამაშე მეგობრებთან</p>
      </div>
    </button>
  </div>
</div>
```

**Conditional Editor Behavior (Step 5/6):**
- If `creatorMode === "edit"`: Show full question editor (current behavior)
- If `creatorMode === "play"`: 
  - Show title editing only
  - Show question count but hide actual questions/answers
  - Replace "გამოაქვეყნე" with "შეინახე და დაიწყე თამაში"
  - Save to database then trigger game start flow

---

### File 2: `src/components/social/CreateCollectionModal.tsx`

**Same pattern - add experience mode selection**

Changes:
- Add `creatorMode` state
- Insert mode selection as first step before round names
- Shift existing steps by +1
- When `creatorMode === "play"`:
  - After generation, show only round names and question counts
  - Hide actual question content
  - Add "შეინახე და დაიწყე თამაში" action

---

### File 3: `src/components/social/CreateTriviaTypeModal.tsx` (Alternative Approach)

**Option: Add mode selection here at the type selection level**

This approach puts the choice earlier, on the main creation type modal:
- Add toggle or tabs: "შექმნა და რედაქტირება" vs "შექმნა და თამაში"
- Pass selected mode to the individual creation modals via props

---

## Database Considerations

No schema changes needed. The trivia is saved the same way regardless of mode - the only difference is the creator's viewing experience during creation.

When `creatorMode === "play"`:
- Save trivia to `user_quiz_posts` with `is_public: false` (private by default for game sessions)
- Optionally add a flag `creator_played: false` to track if creator has played their own content

---

## Step-by-Step Changes for CreateQuizModal

| Current Step | New Step Number | Description |
|--------------|-----------------|-------------|
| - | 1 (NEW) | Mode selection: Edit vs Play |
| 1 | 2 | Topic input |
| 2 | 3 | Question count & difficulty |
| 3 | 4 | Generation loading |
| 4 | 5 | Success animation |
| 5 | 6 | Editor (conditional based on mode) |

---

## UI Mockup for Mode Selection

```text
┌──────────────────────────────────────────────┐
│                                              │
│     🎯 როგორ გინდა შექმნა?                   │
│     აირჩიე შენთვის შესაფერისი გზა           │
│                                              │
│  ┌────────────────┐  ┌────────────────────┐  │
│  │      📝        │  │        🎮          │  │
│  │                │  │                    │  │
│  │  რედაქტირება  │  │      თამაში        │  │
│  │                │  │                    │  │
│  │ ნახე პასუხები │  │ არ ნახო პასუხები  │  │
│  │ და შეასწორე   │  │ ითამაშე ერთად     │  │
│  │                │  │                    │  │
│  │  გამოქვეყნება │  │ მეგობრებთან       │  │
│  └────────────────┘  └────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Play Mode Flow After Generation

When user selects "Play" mode:

1. Generate questions (same as now)
2. Skip editor - show summary screen:
   ```
   ✅ 10 კითხვა მზადაა!
   
   სათაური: [editable title input]
   
   [შეინახე და დაიწყე თამაში]
   ```
3. On button click:
   - Save to `user_quiz_posts` (private)
   - Close modal
   - Optionally: Navigate to game room creation or TV mode setup

---

## Summary

| File | Changes |
|------|---------|
| `CreateQuizModal.tsx` | Add mode selection step, conditional editor display, play mode save+start flow |
| `CreateCollectionModal.tsx` | Same pattern for collections |
| Optional: `CreateTriviaTypeModal.tsx` | Alternative location for mode toggle |

This gives creators flexibility to either:
- **Edit mode**: Full control, see everything, modify, then publish
- **Play mode**: Surprise themselves, play along with friends/family without spoilers

