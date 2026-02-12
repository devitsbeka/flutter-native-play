
# Redesign TV Connect Modal with Step-by-Step Instructions

## What Changes

Replace the current TVConnectModal content (which jumps straight to a confusing code input) with a clear step-by-step guide that walks users through the TV play process, followed by the code entry.

## New Flow

The modal will have two screens:

**Screen 1 - Instructions (new)**
Three numbered steps explaining what to do:
1. Open **mytrivia.io/tv** on your TV browser
2. A 4-digit code will appear on the TV screen
3. Enter the code below to connect

A "Next" button takes the user to Screen 2.

**Screen 2 - Code Entry (existing, slightly refined)**
The current 4-digit OTP input and "Connect" button, with a back arrow to return to instructions.

**Screen 3 - Connected (existing)**
The green checkmark success screen, unchanged.

## Technical Details

### File: `src/components/team/TVConnectModal.tsx`

- Add a `step` state: `'instructions' | 'code-entry' | 'connected'`
- **Instructions screen**: Shows 3 numbered steps with icons (Monitor, Hash, Smartphone) in a vertical list, plus a "Continue" ChunkyButton
- **Code entry screen**: The existing OTP input and connect button (already built), with header back button returning to instructions
- **Connected screen**: Unchanged
- Header title updates per step: "TV-ზე თამაში" for instructions, "კოდის შეყვანა" for code entry

### Step card design
Each step rendered as a row with:
- A numbered circle (1, 2, 3) on the left
- Icon + text on the right
- Subtle card background (`bg-muted/30 rounded-xl p-4`)

No new files or dependencies needed. Only `TVConnectModal.tsx` is modified.
