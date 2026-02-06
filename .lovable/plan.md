

# Replace All Emojis with 3D Icon Library Assets

## Overview

This is a comprehensive emoji elimination project. The app currently uses emojis in ~44+ component files across toasts, modals, avatars, achievements, VIP benefits, leaderboards, and more. All will be replaced with 3D icons from your 9,000+ icon library stored in Supabase Storage.

## Part 1: Immediate Fix -- Welcome Back Toast + Trivia Buzzer

**File: `src/pages/Auth.tsx` (line 150)**

Replace the hand wave emoji in the "Welcome back" toast notification with the trivia-buzzer icon:
- Copy `user-uploads://trivia-buzzer.png` to `src/assets/trivia-buzzer.png`
- Import it and use it as an `<img>` element in the toast `icon` property
- Same for the `icon: "👋"` in `src/pages/SettingsPrivacy.tsx` (line 65)

## Part 2: GameModal `iconEmoji` Prop Replacement

The `GameModal` component (`src/components/ui/game-modal.tsx`) renders emojis via its `iconEmoji` prop as a bouncing `<span className="text-5xl">`. We will update GameModal to also accept an `iconSrc` prop (URL string for a 3D icon image), and convert all callers.

**GameModal changes:**
- Add `iconSrc?: string` prop
- Render `<img src={iconSrc}>` with same spring animation when provided
- Priority: `icon` > `iconSrc` > `iconEmoji`

**Files using `iconEmoji` (14 files):**

| File | Current Emoji | Replacement Icon |
|------|--------------|-----------------|
| `GuestSignupPromptModal.tsx` | 🎮 | `trivia-buzzer.png` (uploaded asset) |
| `GuestMaxPlaysModal.tsx` | 🎮 | `trivia-buzzer.png` |
| `PlayLimitModal.tsx` | 🎮, 👑 | `trivia-buzzer.png`, crown 3D icon |
| `PlayCategoryModal.tsx` | 🎯 | `bullseye.png` (from icon library) |
| `SoundSettingsModal.tsx` | 🎧 | headphones icon from library |
| `HelpModal.tsx` | ❓ | question-mark icon from library |
| `AllRecentRoomsModal.tsx` | 🎮 | `trivia-buzzer.png` |
| `AllRecentPlayersModal.tsx` | 👥 | users/group icon from library |
| `VSMatchHelpModal.tsx` | ⚔️ | swords icon from library |
| `ComingSoonModal.tsx` | 🏗️ | construction/cone icon from library |
| `GameLoseModal.tsx` | 😔 | sad face icon from library |
| `AdventureHelpModal.tsx` | ❓ | question-mark icon from library |
| `RegisterPromptModal.tsx` | ✨ | sparkle icon from library |
| `SignupOnboardingModal.tsx` | ✨ | sparkle icon from library |

## Part 3: Toast Notification Emojis

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `Auth.tsx` | 117 | `icon: "🎉"` | Party popper 3D icon |
| `Auth.tsx` | 124 | `icon: "🎉"` | Party popper 3D icon |
| `Auth.tsx` | 150 | `icon: "👋"` | `trivia-buzzer.png` |
| `SettingsPrivacy.tsx` | 49 | `icon: "📦"` | Box/package 3D icon |
| `SettingsPrivacy.tsx` | 65 | `icon: "👋"` | `trivia-buzzer.png` |
| `ForgotPassword.tsx` | 161 | `icon: "🎉"` | Party popper 3D icon |
| `AvatarFrameShop.tsx` | 126 | `icon: "🎉"` | Party popper 3D icon |
| `AvatarFrameShop.tsx` | 53 | `icon: "👑"` | Crown 3D icon (already exists as `crown3d`) |
| `BuyCurrencyModal.tsx` | 99 | `icon: "🎁"` | Gift 3D icon |
| `useVipStatus.ts` | 164 | `"VIP! 👑"` | Remove emoji from string |

For toasts, we'll create a small helper `toastIcon(src)` that returns `<img src={src} className="w-6 h-6">` since sonner's `icon` prop accepts ReactNode.

## Part 4: Avatar/Profile Fallback Emojis

| File | Current | Replacement |
|------|---------|-------------|
| `Avatar.tsx` | `emoji = "👤"` default | Use Lucide `User` icon as SVG fallback |
| `AvatarWithFrame.tsx` | `emoji = "👤"` default | Use Lucide `User` icon |
| `AvatarCircle.tsx` | `🎮` (line 383) | `trivia-buzzer.png` |
| `AccountSwitcherModal.tsx` | `"👤"` | Use first letter or Lucide `User` |
| `DesktopLeftNav.tsx` | `"👤"` | Use first letter or Lucide `User` |
| `DesktopRightSidebar.tsx` | `"👤"` (2 places) | Use first letter or Lucide `User` |
| `TVPairingScreen.tsx` | `'👤'` | Use first letter or Lucide `User` |
| `MatchResultScreen.tsx` | `👤` (line 151) | Lucide `User` icon |

## Part 5: Leaderboard Medal Emojis

| File | Current | Replacement |
|------|---------|-------------|
| `WeeklyRewardsPreview.tsx` | 🥇🥈🥉 | Gold/Silver/Bronze medal 3D icons from library |
| `MultiplayerObserverScreen.tsx` | 🥇🥈🥉 | Same medal icons |
| `MultiplayerGameScreen.tsx` | 🥇🥈🥉 | Same medal icons |
| `GameResultsScreenV2.tsx` | 🥇🥈🥉 | Same medal icons |

## Part 6: Achievement Icons

**`PlayerProfileModal.tsx`** -- Has `ACHIEVEMENT_ICONS` map with emojis (🏆, 🔥, ⚡, 🎮, 🎯, etc.) and fallback `"🏅"`. Replace each with the corresponding 3D icon from the library.

## Part 7: VIP Benefits Emojis

**`useVipStatus.ts`** -- `VIP_BENEFITS` and `VIP_BENEFITS_BY_TIER` arrays use emoji icons (⭐, 🎰, ⚡, 👑, 🚫, 🎁). These are already mapped to Lucide icons in `ShopProSidebar.tsx` via `BENEFIT_ICONS`. We'll update the source data to use icon slugs instead and render via `AppIcon`.

## Part 8: Power-Up Emojis

**`LevelUpModal.tsx`** -- `getPowerUpDisplay()` uses ✂️, ❄️, 🔄, ⏱️, ⚡. Replace with 3D icons: scissors, snowflake, refresh, timer, lightning from the library.

## Part 9: Room Icon Picker Category Emojis

**`RoomIconPickerModal.tsx`** -- Category tabs use emojis (✨, 🐾, 🍕, 🎵, 🌿, ⚽, 🎮, 💻, 🚗). Replace with AppIcon using appropriate slugs.

## Part 10: Country/Globe Emojis

**`WorldHome.tsx`** and **`InteractiveGlobe.tsx`** -- Continent emojis (🌏, 🌍, 🌎). Replace with globe 3D icons from library.

**`QuickProfileModal.tsx`**, **`PlayerFeedItem.tsx`**, **`CreatorPortfolioCard.tsx`** -- `getCountryFlag()` fallback `"🌍"`. Replace with globe icon.

## Part 11: Multiplayer/Team Emojis

**`RoomLobby.tsx` (line 553)** -- Button text `"🎮 რაუნდის დაწყება"`. Remove the emoji from text; the button already has a Gamepad2 Lucide icon.

## Part 12: Locale File Emojis

All locale files contain emojis in translated strings:
- `welcomeTitle: "Merhaba! 👋"` -- Remove emoji (icon is shown separately)
- `avatarSaved: "Avatar kaydedildi! 🎉"` -- Remove emoji
- Various other strings with 👋, 🎉 embedded

These are in: `ka.ts`, `en.ts`, `tr.ts`, `zh.ts`, `pt.ts`, `es.ts`, `pl.ts`, `ko.ts`, `de.ts`, `fr.ts`, `ru.ts`, and all other locale files.

## Part 13: Admin Panel Emojis

| File | Current | Action |
|------|---------|--------|
| `IAPProductsTab.tsx` | 💎, 👑 | Replace with Lucide icons (Gem, Crown) |
| `EconomyHealthTab.tsx` | 💰, 👑 | Replace with Lucide icons |
| `FixIcons.tsx` | 🎉 | Remove from string |
| `QuestionPreviewList.tsx` | 🌐 flag fallback | Replace with globe Lucide icon |

## Part 14: Desktop Action Cards Status Text Emojis

**`DesktopActionCards.tsx`**:
- `"მზად არის! 🎁"` -- Remove emoji from status text
- `"გახსენი ახლა! 📦"` -- Remove emoji from status text

## Part 15: Inline Text Emojis

**`Auth.tsx` (line 228)** -- `"მოწვეული ხარ! 🎁"` -- Remove emoji from text.

## Technical Details

### New shared assets to import

We'll create a central `src/assets/icons.ts` barrel file that imports and exports commonly used 3D icon assets:
```
trivia-buzzer.png (from user upload)
```

For icons from the Supabase icon library (9k icons), we'll use the existing `AppIcon` component with appropriate slugs. For small inline uses (toasts, badges), we'll use direct `<img>` tags with the storage URL pattern.

### Toast icon helper

```ts
// src/lib/toast-icons.ts
export const toastIcon = (src: string) => 
  React.createElement('img', { src, className: 'w-6 h-6 object-contain', alt: '' });
```

### Implementation order

1. Copy trivia-buzzer asset and fix the welcome back toast (immediate ask)
2. Update GameModal to support `iconSrc` prop
3. Replace all `iconEmoji` usages across 14 modal files
4. Replace toast emojis across 6 files
5. Replace avatar fallback emojis (Avatar.tsx, AvatarWithFrame.tsx, etc.)
6. Replace leaderboard medals
7. Replace achievement/VIP/power-up emojis
8. Clean locale file emojis
9. Clean admin panel emojis
10. Clean inline text emojis

### Total files to modify: ~50+

This is a large refactor touching many files but each change is mechanical -- swap emoji string for either an `AppIcon` component, an `<img>` tag with a library URL, or a Lucide icon.
