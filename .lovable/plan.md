

## InviteFriendsModal Text Adjustments

Three small tweaks in `src/components/home/InviteFriendsModal.tsx`:

### 1. Title: move up 5px and increase size by 7%
- Current: `fontSize: "1.44rem"`, `mb-2` class
- New: `fontSize: "1.54rem"` (1.44 * 1.07), add `style` margin-top of `-5px`

### 2. Description: decrease size by 8% and change text
- Current: `fontSize: "1.03rem"`
- New: `fontSize: "0.95rem"` (1.03 * 0.92)
- Replace text content with: "გაუზიარე ეს ლინკი მეგობრებს და მიიღეთ საჩუქრად 10 დღიანი PRO!"

### Technical Details

**File:** `src/components/home/InviteFriendsModal.tsx`

**Title h2 (around line 122-128):**
- Change `style={{ fontSize: "1.44rem" }}` to `style={{ fontSize: "1.54rem", marginTop: "-5px" }}`

**Description p (around line 130-142):**
- Change `style={{ fontSize: "1.03rem" }}` to `style={{ fontSize: "0.95rem" }}`
- Replace inner text with:
```
გაუზიარე ეს ლინკი მეგობრებს და მიიღეთ საჩუქრად{" "}
<span className="font-semibold text-yellow-300">10 დღიანი PRO</span>!
```

