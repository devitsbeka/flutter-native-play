

## Beautify Challenge Share Modal

### Changes to `src/components/challenge/ChallengeShareModal.tsx`

**1. Copy uploaded icon to assets**
- Copy `user-uploads://dance-floor-3.png` to `src/assets/dance-floor-3.png`
- Import it as the header icon

**2. Pink/purple gradient background**
- Replace `bg-card border-border` with a gradient background: `bg-gradient-to-b from-[#7E7ADB] to-[#C471ED]` (purple to pink)
- White text throughout for contrast
- Remove border, add subtle shadow

**3. Header: icon + title (no emoji)**
- Remove the emoji from the title
- Add the `dance-floor-3.png` icon (size ~40px) before the title text "გამოიწვიე მეგობრები"
- Layout: icon and text centered horizontally

**4. Add subtitle text**
- Below the title, add a small muted line: "მოაწყვე შეჯიბრი მეგობრებს შორის"
- Styled as `text-sm text-white/70`

**5. Remove URL field**
- Delete the link display section (the `bg-muted` row showing the URL)
- Keep the two action buttons (Share + Copy Link)

**6. Score display restyle**
- Update score card to use `bg-white/15 border-white/20` to match gradient theme
- Text colors: white for score, `white/70` for labels

**7. Share text cleanup**
- Remove emoji from `shareData.title` (replace with plain text)

### Files
| File | Change |
|------|--------|
| `src/assets/dance-floor-3.png` | New file (copied from upload) |
| `src/components/challenge/ChallengeShareModal.tsx` | Gradient bg, icon header, remove URL field, add subtitle, remove emojis |

