
# გეგმა: მეგობრის წაშლის ღილაკის გამოსწორება

## პრობლემა

`DropdownMenu`-დან `AlertDialog`-ის გახსნა იწვევს კონფლიქტს. როცა მომხმარებელი დაკლიკავს "წაშლა" ღილაკს:
1. `setShowDeleteConfirm(true)` გამოიძახება
2. მაგრამ `DropdownMenu` იხურება და ფოკუსს "იპარავს"
3. `AlertDialog` ვერ იხსნება სწორად

ეს არის ცნობილი პრობლემა Radix UI-ში, როცა `DropdownMenu`-დან `Dialog/AlertDialog`-ს ხსნი.

## გადაწყვეტა

### მიდგომა: `onSelect` + timing delay

`onClick`-ის ნაცვლად გამოვიყენოთ `onSelect` და დავამატოთ მცირე delay, რომ dropdown-მა მოასწროს დახურვა:

```typescript
<DropdownMenuItem 
  onSelect={(e) => {
    e.preventDefault(); // Prevent default selection behavior
    // Small delay to let dropdown close first
    setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 100);
  }}
  className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer"
>
  <UserMinus className="w-4 h-4" />
  წაშლა
</DropdownMenuItem>
```

### ცვლილება ფაილში: `src/components/profile/PlayerProfileModal.tsx`

**ხაზები 206-216:**

მანამდე:
```typescript
<DropdownMenuItem 
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  }}
  className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer"
>
  <UserMinus className="w-4 h-4" />
  წაშლა
</DropdownMenuItem>
```

შემდეგ:
```typescript
<DropdownMenuItem 
  onSelect={(e) => {
    e.preventDefault();
    // Delay to allow dropdown to close before opening AlertDialog
    setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 100);
  }}
  className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer"
>
  <UserMinus className="w-4 h-4" />
  წაშლა
</DropdownMenuItem>
```

## რატომ მუშაობს

1. `onSelect` არის Radix-ის სწორი event handler `DropdownMenuItem`-ისთვის
2. `e.preventDefault()` აჩერებს dropdown-ის default დახურვის behavior-ს
3. `setTimeout(..., 100)` აძლევს dropdown-ს დროს რომ სრულად დაიხუროს და ფოკუსი გაათავისუფლოს
4. შემდეგ `AlertDialog` იხსნება უპრობლემოდ

## ტექნიკური შენიშვნები

- Radix UI-ში `onClick` არ არის რეკომენდირებული `DropdownMenuItem`-ზე - `onSelect` უფრო სანდოა
- `modal` prop dropdown-ზე ასევე შეიძლება დაეხმაროს, მაგრამ timing approach უფრო მარტივია
- `100ms` delay საკმარისია ანიმაციისთვის და ფოკუსის გადასვლისთვის
