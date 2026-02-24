

## Fix Room Lobby Glitches and Translate Category Names

### Issue 1: Visual Line Glitches While Scrolling

The thin lines visible between glass-card sections (category picker, TV mode, scoreboard) are caused by semi-transparent `border border-white/20` on elements with `backdrop-blur`. During scrolling on mobile, sub-pixel rendering creates visible seams.

**Fix in `RoomLobbyV2.tsx`:**
- On the glass card containers (CategoryPickerSection wrapper, TV Mode toggle, RoomScoreboard), replace `border border-white/20` with `border border-white/[0.12]` or use `shadow` instead
- This affects lines ~68, ~116, ~909 and related components

**Fix in `CategoryPickerSection.tsx` (line 116):**
- Change `border border-white/20` to `border border-white/[0.12]`

**Fix in `RoomScoreboard.tsx` (line 68):**
- Change `border border-white/20` to `border border-white/[0.12]`

Alternatively, a cleaner approach: add `will-change-transform` to the scrollable container in `RoomLobbyV2.tsx` (line 779) to promote compositing and eliminate sub-pixel rendering artifacts entirely.

---

### Issue 2: Category Names Still in Georgian

The `CategorySelectorModal` fetches categories directly from the `categories` table without applying translations from `category_translations`. The `useCategories` hook already handles this correctly, but this modal has its own separate query.

**Fix in `CategorySelectorModal.tsx`:**
1. Read the current language from `useLanguage()`
2. For non-Georgian languages, also fetch from `category_translations` table (same pattern as `useCategories` hook)
3. Map translated names onto categories before rendering
4. Include `language` in the `queryKey` so it refetches on language change
5. Also filter out language-specific categories for non-Georgian users (matching `useCategories` logic)

**Translate the Mixed category name:**
- Replace hardcoded `MIXED_CATEGORY.name = "სხვადასხვა"` with a dynamic value using `t("extra.csmMixedLabel")` or similar
- Add translation keys: KA = "სხვადასხვა", EN = "Mixed"

---

### Issue 3: Hardcoded Georgian in CategoryPickerSection

**Fix in `CategoryPickerSection.tsx` (lines 222-223):**
- Replace `"შემთხვევითი"` with `t("extra.cpRandomTitle")` (already exists as a key)
- Replace `"ტრივია"` with `"Trivia"` or a `t()` key

---

### Technical Details

**Files to modify:**

1. **`src/components/team/CategorySelectorModal.tsx`**
   - Add language-aware category fetching with `category_translations` join
   - Use `t()` for Mixed category name instead of hardcoded Georgian
   - Filter language-specific categories for non-KA users
   - Add `language` to query key

2. **`src/components/team/CategoryPickerSection.tsx`**
   - Replace hardcoded Georgian strings on lines 222-223 with `t()` calls

3. **`src/components/team/RoomLobbyV2.tsx`**
   - Add `will-change-transform` to the scrollable content container to fix sub-pixel border rendering glitches

4. **`src/components/team/RoomScoreboard.tsx`**
   - Reduce border opacity from `border-white/20` to `border-white/[0.12]` to minimize visible seams

5. **`src/locales/ka.ts`** and **`src/locales/en.ts`**
   - Add `csmMixedLabel` key (KA: "სხვადასხვა", EN: "Mixed")

