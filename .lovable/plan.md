

## Show "მიმდინარე კატეგორია" for Non-Hosts

A small text change in `CategoryPickerSection.tsx` to differentiate what non-host players see.

### Current behavior
- Both hosts and non-hosts see "რისი თამაში გინდა?" when no category is selected, and "დაამატე კატეგორია სათამაშოდ" as subtitle -- this is confusing for non-hosts who can't pick categories.

### Desired behavior
- **Non-hosts without category**: Title shows "მიმდინარე კატეგორია", subtitle shows "ჯერ არჩეული არ არის"
- **Non-hosts with category**: Title shows the category name, subtitle shows "მიმდინარე" (already works)
- **Hosts**: No change, keep current behavior

### Technical changes

**File: `src/components/team/CategoryPickerSection.tsx`**

Update the two text elements (lines 137 and 154-158) to check `isHost`:

1. **Title text (line 137)**: Change from:
   - `hasCategory ? categoryName : "რისი თამაში გინდა?"`
   
   To:
   - `hasCategory ? categoryName : (isHost ? "რისი თამაში გინდა?" : "მიმდინარე კატეგორია")`

2. **Subtitle text (lines 154-158)**: Change the fallback (no category) case from:
   - `"დაამატე კატეგორია სათამაშოდ"`
   
   To:
   - `isHost ? "დაამატე კატეგორია სათამაშოდ" : "ჯერ არჩეული არ არის"`

No other files need changes. The component already receives `isHost` as a prop.

