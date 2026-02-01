
# Feature Onboarding Tooltips System

## Overview
Redesign the onboarding system with an engaging, sequential tooltip carousel that educates new users about the three main tabs (Rooms, My Trivia, Explore). The tooltips will feature gradient stroke borders with animated shadows and auto-rotate every 4 seconds.

## Current State
- Simple dual tooltips appear above tab bar
- Question mark button manually triggers tooltips  
- Plain white cards with minimal styling
- Shows when empty state "აქტიური ოთახი არ გაქვს" is displayed

## Changes

### 1. Redesigned Tooltip Cards
Each tooltip card will include:
- **Icon**: Using `QuizCategoryIcon` component with appropriate icon slugs
- **Title**: Tab name in Georgian
- **Description**: Detailed feature explanation in Georgian
- **Animated gradient stroke border**: Purple gradient (similar to existing avatar progress rings)
- **Looping shadow animation**: Subtle rotating glow effect

**Content for each tooltip:**
| Tab | Icon | Title | Description |
|-----|------|-------|-------------|
| ოთახები | `retro-tv` | ოთახები | შექმენი სათამაშო ოთახი, აირჩიე რას ითამაშებთ, და მოიწვიე მეგობრები სათამაშოდ. თამაში TV-ზეც შესაძლებელია |
| ჩემი ტრივია | `sparkles` or trivia-buzzer | ჩემი ტრივია | შექმენი შენი Trivia, გამოაქვეყნე ან შექმენი My Trivia Party მეგობრებთან ერთად სათამაშოდ, შენი კითხვებით / შენი პასუხებით |
| აღმოაჩინე | `compass` or icon-compass.png | აღმოაჩინე | ითამაშე სხვა მოთამაშეების მიერ შექმნილი Trivia სხვადასხვა თემაზე |

### 2. Carousel Behavior
- Displays **one tooltip at a time** in the empty state area (replacing "აქტიური ოთახი არ გაქვს")
- Auto-rotates every **4 seconds** in sequence: Rooms -> My Trivia -> Explore
- Includes dot indicators showing current position
- Tap to navigate between tooltips
- Tap on card navigates to the corresponding tab

### 3. Visual Design

```text
+----------------------------------+
|   ╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮   |
|   ┃ [Animated Gradient Border] ┃   |
|   ┃   ╭────────────────────╮   ┃   |
|   ┃   │  [Icon]            │   ┃   |
|   ┃   │  ოთახები           │   ┃   |
|   ┃   │  შექმენი სათამაშო  │   ┃   |
|   ┃   │  ოთახი, აირჩიე...  │   ┃   |
|   ┃   ╰────────────────────╯   ┃   |
|   ╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯   |
|         ● ○ ○  (dot indicators)    |
+----------------------------------+
```

### 4. Animation Details
- **Gradient stroke**: SVG-based animated gradient border using CSS animation (`@keyframes rotate`)
- **Shadow loop**: Box-shadow with rotating blur using `transform: rotate()` animation
- **Card transitions**: Framer Motion for smooth slide/fade between cards
- **Dot pulse**: Active dot has subtle pulse animation

---

## Technical Implementation

### Files to Create

**1. `src/components/team/FeatureOnboardingCarousel.tsx`**
New carousel component containing:
- Array of tooltip data (icon, title, description, targetTab)
- Auto-rotation with 4-second interval using `useEffect` + `setInterval`
- Animated gradient border using SVG `linearGradient` with animation
- Framer Motion for card transitions
- Navigation to corresponding tab on card click
- Dot navigation indicators

**2. `src/pages/OnboardingPreview.tsx`**
Developer preview page showing all tooltips side-by-side:
- All 3 tooltip cards displayed simultaneously
- Controls to test animations
- Useful for design iteration

### Files to Modify

**1. `src/components/team/TabOnboardingTooltips.tsx`**
- Remove or deprecate this component (replaced by new carousel)
- Can be deleted or kept for reference

**2. `src/pages/TeamV2.tsx`**
- Remove `TooltipTriggerButton` (question mark button)
- Remove `TabOnboardingTooltips` usage from tab bar area
- Import and use new `FeatureOnboardingCarousel` component

**3. `src/components/team/MyRoomsSection.tsx`**
- Modify the empty state (lines 165-181)
- Instead of showing the glitch icon + "აქტიური ოთახი არ გაქვს"
- Show `FeatureOnboardingCarousel` for first-time users
- Keep existing empty state for users who have seen onboarding

**4. `src/App.tsx`**
- Add route for `/onboarding-preview` page (lazy loaded)

### localStorage Keys
- `mytrivia_feature_onboarding_seen`: Tracks if user completed feature onboarding
- Existing `mytrivia_tab_tooltips_shown` can be removed or migrated

---

## Component Structure

```text
FeatureOnboardingCarousel
├── GradientBorderCard (SVG animated border)
│   ├── QuizCategoryIcon (dynamic icon)
│   ├── Title text
│   └── Description text
├── DotIndicators
│   └── Animated dots (● ○ ○)
└── Auto-rotation logic (4s interval)
```

### Gradient Animation CSS
```css
@keyframes rotate-gradient {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.gradient-border {
  animation: rotate-gradient 3s linear infinite;
}
```

### Shadow Animation CSS  
```css
@keyframes pulse-shadow {
  0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.3); }
  50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); }
}
```

---

## User Flow

1. New user signs up and lands on `/team?tab=rooms`
2. Empty state shows `FeatureOnboardingCarousel` instead of glitch icon
3. First card appears: "ოთახები" with TV icon
4. After 4 seconds, auto-transitions to "ჩემი ტრივია" 
5. After 4 seconds, auto-transitions to "აღმოაჩინე"
6. Loops back to beginning
7. User can tap dots to navigate manually
8. Tapping a card navigates to that tab and marks onboarding as seen
9. On subsequent visits, empty state shows normal "აქტიური ოთახი არ გაქვს" message

---

## Testing Checklist
- [ ] Tooltips auto-rotate every 4 seconds
- [ ] Gradient border animation loops smoothly
- [ ] Shadow pulse animation works
- [ ] Dot indicators update correctly
- [ ] Tapping card navigates to correct tab
- [ ] Onboarding state persists in localStorage
- [ ] Preview page shows all tooltips
- [ ] Works on mobile and desktop
