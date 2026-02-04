
# Plan: PRO Feature Gating System

## Overview
Create a centralized, reusable system for gating PRO-only features that shows a minimal, beautiful modal when non-PRO users try to access premium features. The modal will have minimal wording and a one-click upgrade path.

---

## PRO-Only Features to Gate

Based on codebase analysis, these features should be PRO-only:
| Feature | Current State | Location |
|---------|--------------|----------|
| **3D Avatar Generation** | Already gated with upsell card | `AvatarModal.tsx` |
| **Avatar Animation** | Already gated | `AvatarModal.tsx` |
| **Create Rooms** | NOT gated | `TeamV2.tsx` → `CreateRoomScreen.tsx` |
| **Create Trivia/Quiz** | NOT gated | `TeamV2.tsx` → `CreateQuizModal.tsx` |
| **Create Collections** | NOT gated | `TeamV2.tsx` → `CreateCollectionModal.tsx` |

---

## Solution: Create `ProRequiredModal` Component

### Component Design (Minimal & Clean)

```
┌─────────────────────────────────────┐
│                                     │
│              👑                     │
│         PRO ფუნქცია                 │
│                                     │
│   ოთახების და ტრივიას შესაქმნელად    │
│        გახდი PRO მომხმარებელი        │
│                                     │
│   ╔═══════════════════════════════╗ │
│   ║       გახდი PRO              ║  │
│   ╚═══════════════════════════════╝ │
│                                     │
│           [გაუქმება]                │
│                                     │
└─────────────────────────────────────┘
```

### Props Interface
```typescript
interface ProRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: "rooms" | "trivia" | "avatar" | "animation" | "general";
}
```

### Feature Messages (Georgian)
- **rooms**: "ოთახების შესაქმნელად"
- **trivia**: "ტრივიას შესაქმნელად"
- **avatar**: "3D ავატარის შესაქმნელად"
- **animation**: "ავატარის ანიმაციისთვის"
- **general**: "ამ ფუნქციისთვის" (default)

---

## Implementation Plan

### Step 1: Create `ProRequiredModal` Component

**File**: `src/components/shared/ProRequiredModal.tsx`

Features:
- Minimal, elegant design using existing `GameModal` component
- Crown icon with gradient background
- Feature-specific message in Georgian
- Single "გახდი PRO" button that navigates to `/profile?tab=PRO`
- Small "გაუქმება" cancel button
- Uses `useProPurchase` for one-click purchase on native platforms

### Step 2: Create `useProGating` Hook

**File**: `src/hooks/useProGating.ts`

Provides centralized logic:
```typescript
function useProGating() {
  const { isVip } = useVipStatus();
  const [showProModal, setShowProModal] = useState(false);
  const [gatedFeature, setGatedFeature] = useState<ProFeature>("general");

  const requirePro = (feature: ProFeature, callback: () => void) => {
    if (isVip) {
      callback();
    } else {
      setGatedFeature(feature);
      setShowProModal(true);
    }
  };

  return { 
    isVip, 
    requirePro, 
    showProModal, 
    setShowProModal, 
    gatedFeature 
  };
}
```

### Step 3: Update `TeamV2.tsx`

Add PRO gating to:
1. **Create Room button** - wrap `setShowCreateModal(true)` with `requirePro("rooms", ...)`
2. **Create Trivia button** - wrap `setShowCreateQuizModal(true)` with `requirePro("trivia", ...)`
3. **Create Collection button** - wrap `setShowCreateCollectionModal(true)` with `requirePro("trivia", ...)`

Add `ProRequiredModal` to render at bottom of component.

### Step 4: Update `CreateRoomScreen.tsx`

No changes needed - the gating happens before this modal opens.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/shared/ProRequiredModal.tsx` | **CREATE** - New modal component |
| `src/hooks/useProGating.ts` | **CREATE** - Centralized PRO gating hook |
| `src/pages/TeamV2.tsx` | **MODIFY** - Add PRO gates to create buttons |

---

## Technical Details

### ProRequiredModal.tsx

```tsx
// Key imports
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useProPurchase } from "@/hooks/useProPurchase";
import { Capacitor } from "@capacitor/core";

// Feature messages map
const FEATURE_MESSAGES: Record<ProFeature, string> = {
  rooms: "ოთახების შესაქმნელად",
  trivia: "ტრივიას შესაქმნელად",
  avatar: "3D ავატარის შესაქმნელად",
  animation: "ავატარის ანიმაციისთვის",
  general: "ამ ფუნქციისთვის",
};

// Main component renders minimal modal with Crown icon,
// feature message, and CTA button
```

### useProGating.ts

```tsx
import { useState, useCallback } from "react";
import { useVipStatus } from "@/hooks/useVipStatus";

export type ProFeature = "rooms" | "trivia" | "avatar" | "animation" | "general";

export function useProGating() {
  const { isVip } = useVipStatus();
  const [showProModal, setShowProModal] = useState(false);
  const [gatedFeature, setGatedFeature] = useState<ProFeature>("general");

  const requirePro = useCallback((feature: ProFeature, callback: () => void) => {
    if (isVip) {
      callback();
    } else {
      setGatedFeature(feature);
      setShowProModal(true);
    }
  }, [isVip]);

  return {
    isVip,
    requirePro,
    showProModal,
    setShowProModal,
    gatedFeature,
  };
}
```

### TeamV2.tsx Changes

Update the FAB and create buttons:

```tsx
// Import the new hook and modal
import { useProGating } from "@/hooks/useProGating";
import { ProRequiredModal } from "@/components/shared/ProRequiredModal";

// Inside component:
const { requirePro, showProModal, setShowProModal, gatedFeature } = useProGating();

// Wrap create room action:
const handleCreateRoom = () => {
  requirePro("rooms", () => setShowCreateModal(true));
};

// Wrap create trivia action:
const handleCreateTrivia = () => {
  requirePro("trivia", () => setShowCreateQuizModal(true));
};

// Add modal at bottom of render:
<ProRequiredModal
  isOpen={showProModal}
  onClose={() => setShowProModal(false)}
  feature={gatedFeature}
/>
```

---

## User Flow

1. **Non-PRO user taps "Create Room"**
2. `requirePro("rooms", callback)` checks VIP status
3. Not VIP → shows `ProRequiredModal` with "ოთახების შესაქმნელად გახდი PRO"
4. User taps "გახდი PRO"
   - **On mobile app**: Initiates native purchase via RevenueCat
   - **On web**: Navigates to `/profile?tab=PRO` for Stripe checkout
5. After successful purchase, user returns and can create rooms

---

## Minimal Wording (Georgian)

- Modal title: `PRO ფუნქცია`
- Message template: `{feature_message} გახდი PRO მომხმარებელი`
- CTA button: `გახდი PRO`
- Cancel: `გაუქმება`

This keeps it simple, clear, and action-oriented.
