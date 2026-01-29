
# გეგმა: მეგობრის წაშლის დიალოგის z-index გამოსწორება

## პრობლემა

AlertDialog არ ჩანს რადგან **z-index კონფლიქტია**:
- `PlayerProfileModal` იყენებს `z-[100]`
- `AlertDialogOverlay` და `AlertDialogContent` იყენებენ `z-50`
- შედეგად AlertDialog ჩნდება modal-ის **უკან** და მომხმარებელი ვერ ხედავს/ვერ დაკლიკავს

## გადაწყვეტა

`AlertDialogContent`-ს უნდა მივცეთ უფრო მაღალი z-index (`z-[150]` ან მეტი) რომ modal-ის ზემოთ გამოჩნდეს.

## ცვლილება

### ფაილი: `src/components/profile/PlayerProfileModal.tsx`

**ხაზი 521:**

მანამდე:
```typescript
<AlertDialogContent>
```

შემდეგ:
```typescript
<AlertDialogContent className="z-[150]">
```

**ასევე** უნდა დავამატოთ overlay-ს მაღალი z-index. Radix AlertDialog საშუალებას გვაძლევს გამოვიყენოთ `AlertDialogPortal` და `AlertDialogOverlay` ცალ-ცალკე მაღალი z-index-ით.

### სრული ცვლილება (ხაზები 519-542):

მანამდე:
```typescript
{/* Delete Friend Confirmation Dialog */}
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>მეგობრის წაშლა</AlertDialogTitle>
      <AlertDialogDescription>
        ნამდვილად გსურთ {data?.profile?.nickname}-ის მეგობრებიდან წაშლა?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={deletingFriend}>გაუქმება</AlertDialogCancel>
      <AlertDialogAction
        onClick={(e) => {
          e.preventDefault();
          handleDeleteFriend();
        }}
        disabled={deletingFriend}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {deletingFriend ? "იშლება..." : "წაშლა"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

შემდეგ:
```typescript
{/* Delete Friend Confirmation Dialog */}
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogPortal>
    <AlertDialogOverlay className="z-[140]" />
    <AlertDialogContent className="z-[150]">
      <AlertDialogHeader>
        <AlertDialogTitle>მეგობრის წაშლა</AlertDialogTitle>
        <AlertDialogDescription>
          ნამდვილად გსურთ {data?.profile?.nickname}-ის მეგობრებიდან წაშლა?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={deletingFriend}>გაუქმება</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault();
            handleDeleteFriend();
          }}
          disabled={deletingFriend}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {deletingFriend ? "იშლება..." : "წაშლა"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialogPortal>
</AlertDialog>
```

**ასევე import-ებში დავამატებთ:**
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogPortal,    // ← დამატება
  AlertDialogOverlay,   // ← დამატება
} from "@/components/ui/alert-dialog";
```

## რატომ მუშაობს

| კომპონენტი | ახლა | ახალი |
|------------|------|-------|
| PlayerProfileModal | z-[100] | z-[100] (უცვლელი) |
| AlertDialogOverlay | z-50 | z-[140] |
| AlertDialogContent | z-50 | z-[150] |

ახლა AlertDialog გამოჩნდება modal-ის **ზემოთ** და მომხმარებელს შეეძლება ინტერაქცია.

## ტექნიკური შენიშვნა

`AlertDialogContent` კომპონენტი default-ად render-ს `AlertDialogPortal`-ს და `AlertDialogOverlay`-ს შიგნით (alert-dialog.tsx ხაზები 31-42). ჩვენ ხელით ვიყენებთ `AlertDialogPortal` და `AlertDialogOverlay` ცალ-ცალკე, რომ თითოეულს მივცეთ სწორი z-index.

ალტერნატიულად შეგვიძლია შევცვალოთ alert-dialog.tsx-ში default z-index, მაგრამ ეს სხვა ადგილებზეც იმოქმედებს. ამიტომ **inline className override** უფრო უსაფრთხოა.
