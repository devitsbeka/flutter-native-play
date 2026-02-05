
# Plan: Glowing Category Icon Loading + Workout Icons for "გააგრძელე ვარჯიში"

## Overview

Two changes:
1. Replace the bland pulse loading animation with the category icon + beautiful glowing light effect
2. Replace the "💪" emoji on failed quiz results with random workout icons

---

## Part 1: Glowing Category Icon Loading Animation

### Current Behavior
When questions are loading, `QuizCategoryIcon` shows a gray pulsing placeholder:
```tsx
<div className="w-full h-full rounded-2xl bg-white/20 animate-pulse" />
```

### New Behavior
Show the actual category icon with soft glowing lights radiating from behind - elegant, not spinning or crazy.

### File: `src/components/ui/quiz-category-icon.tsx`

Replace the loading state with a glowing category icon:

```tsx
{isLoading ? (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Glowing light rays behind icon */}
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(139,92,246,0.2) 40%, transparent 70%)",
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
    
    {/* Secondary glow ring */}
    <motion.div
      className="absolute inset-0"
      style={{
        background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 60%)",
        filter: "blur(12px)",
      }}
      animate={{
        scale: [1.1, 1.3, 1.1],
        opacity: [0.4, 0.7, 0.4],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.3,
      }}
    />
    
    {/* The category icon itself */}
    <DynamicIcon
      slug={iconSlug}
      categoryId={categoryId}
      size={size * 0.85}
      className="relative z-10"
    />
  </div>
) : (/* existing default state */)}
```

### Visual Effect
```text
     ⋆ ˚ ✧ ˚
   ✦   🎓   ✦      ← Category icon with soft purple glow pulsing outward
     ˚ ✧ ˚ ⋆
```

The glow pulses gently with 2 overlapping radial gradients creating a breathing light effect.

---

## Part 2: Workout Icons for "გააგრძელე ვარჯიში"

### Current Behavior
When user fails a quiz level (scores below passing threshold), it shows:
- "💪" emoji
- Text: "გააგრძელე ვარჯიში!" (Keep practicing!)

### New Behavior
Show one of the 7 workout character icons randomly instead of emoji.

### Step 1: Copy workout icons to assets

Copy the 7 uploaded workout/exercise icons to `src/assets/workout/`:
- `acroyoga.png` - Two people doing acrobatic yoga
- `balance-board.png` - Person on balance board
- `yoga-warrior-i-pose.png` - Warrior yoga pose
- `workout.png` - Person doing squats
- `plank.png` - Person doing plank exercise
- `flexibility.png` - Person doing stretching
- `calisthenics-pull-up.png` - Person doing pull-ups

### Step 2: Create workout icons array

### File: `src/pages/CategoryQuizPage.tsx`

Add imports at top:
```tsx
import acroyogaIcon from "@/assets/workout/acroyoga.png";
import balanceBoardIcon from "@/assets/workout/balance-board.png";
import yogaWarriorIcon from "@/assets/workout/yoga-warrior-i-pose.png";
import workoutSquatIcon from "@/assets/workout/workout.png";
import plankIcon from "@/assets/workout/plank.png";
import flexibilityIcon from "@/assets/workout/flexibility.png";
import pullUpIcon from "@/assets/workout/calisthenics-pull-up.png";

const WORKOUT_ICONS = [
  acroyogaIcon,
  balanceBoardIcon,
  yogaWarriorIcon,
  workoutSquatIcon,
  plankIcon,
  flexibilityIcon,
  pullUpIcon,
];
```

### Step 3: Pick random icon on mount

Add state to store random workout icon:
```tsx
const [workoutIcon] = useState(() => 
  WORKOUT_ICONS[Math.floor(Math.random() * WORKOUT_ICONS.length)]
);
```

### Step 4: Replace emoji in results screen

Replace the current result emoji section (lines 814-822):

**Current:**
```tsx
<motion.div className="text-7xl mb-4" ...>
  {isPerfect ? "🏆" : passed ? "🎉" : "💪"}
</motion.div>
```

**New:**
```tsx
<motion.div 
  className="mb-4 flex justify-center"
  initial={{ scale: 0, rotate: -180 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
>
  {isPerfect ? (
    <span className="text-7xl">🏆</span>
  ) : passed ? (
    <span className="text-7xl">🎉</span>
  ) : (
    <img 
      src={workoutIcon} 
      alt="Keep practicing" 
      className="w-24 h-24 object-contain drop-shadow-lg"
    />
  )}
</motion.div>
```

---

## Visual Comparison

### Loading State

| Before | After |
|--------|-------|
| Gray pulsing rectangle | Category icon with soft purple glowing lights |

### Failed Quiz Result

| Before | After |
|--------|-------|
| 💪 emoji | Random workout character (7 variants) |

---

## Summary

| File | Change |
|------|--------|
| `src/assets/workout/` | New folder with 7 workout character icons |
| `src/components/ui/quiz-category-icon.tsx` | Glowing category icon for loading state |
| `src/pages/CategoryQuizPage.tsx` | Random workout icon for "გააგრძელე ვარჯიში" results |

The glowing effect uses framer-motion's animate prop with multiple overlapping radial gradients that pulse at slightly different rates, creating a beautiful, elegant breathing light effect without any spinning or jarring animations.
