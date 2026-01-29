
# გეგმა: ძიებაში მეგობრებისა და არამეგობრების ჩვენება

## პრობლემა

ამჟამად `InviteFriendsModal`-ში ძიების შედეგებიდან მეგობრები ფილტრდება (ხაზი 387):

```typescript
const filteredResults = searchResults.filter(r => !friendIds.has(r.user_id));
```

მომხმარებელს სურს ორივეს ნახვა სხვადასხვა ინდიკატორებით:
- **მეგობრები:** "მოწვევა" ღილაკი
- **არამეგობრები:** "+ დამატება" ღილაკი

---

## გადაწყვეტა

### ფაილი: `src/components/team/InviteFriendsModal.tsx`

**ცვლილება 1:** ფილტრის მოხსნა (ხაზი 387)

```diff
- const filteredResults = searchResults.filter(r => !friendIds.has(r.user_id));
+ // Show all search results - both friends and non-friends
+ const filteredResults = searchResults;
```

**ცვლილება 2:** ღილაკის ტექსტის განახლება მეგობარი/არამეგობარის მიხედვით (ხაზები 467-471)

ამჟამად:
```typescript
<>
  <UserPlus className="w-4 h-4" />
  {isRoomInviteMode ? "მოწვევა" : "დამატება"}
</>
```

ახალი ლოგიკა:
```typescript
const isFriend = friendIds.has(result.user_id);

// Button text logic:
// - If user is already a friend → "მოწვევა" (Invite)
// - If not a friend → "+ დამატება" (Add Friend)
{isFriend ? (
  <>
    <UserPlus className="w-4 h-4" />
    მოწვევა
  </>
) : (
  <>
    <UserPlus className="w-4 h-4" />
    + დამატება
  </>
)}
```

**ცვლილება 3:** ღილაკზე დაჭერის ლოგიკის განახლება

```typescript
const handleButtonAction = () => {
  const isFriend = friendIds.has(result.user_id);
  
  if (isFriend) {
    // For friends - send room invite
    handleInviteToRoom(result.user_id);
  } else {
    // For non-friends - send friend request
    if (isPendingOutgoing) {
      toast.info("მოთხოვნა უკვე გაგზავნილია, დაელოდე პასუხს");
      return;
    }
    handleSendRequest(result.user_id);
  }
};
```

---

## ლოგიკის ნაკადი

```text
┌─────────────────────────────────────┐
│  მომხმარებელი ძებნას იწყებს       │
└────────────────┬────────────────────┘
                 ▼
┌─────────────────────────────────────┐
│  searchResults - ყველა მომხმარებელი │
│  (ფილტრი აღარ არის!)               │
└────────────────┬────────────────────┘
                 ▼
       ┌─────────┴─────────┐
       │                   │
   isFriend?          !isFriend?
       │                   │
       ▼                   ▼
  "მოწვევა"          "+ დამატება"
  (room invite)      (friend request)
```

---

## შედეგი

| მომხმარებლის ტიპი | მანამდე | შემდეგ |
|-------------------|---------|--------|
| მეგობარი | არ ჩანს ძიებაში | ჩანს + "მოწვევა" ღილაკი |
| არამეგობარი | ჩანს + "დამატება" | ჩანს + "+ დამატება" ღილაკი |

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილებები |
|-------|------------|
| `src/components/team/InviteFriendsModal.tsx` | ფილტრის მოხსნა + ღილაკის ლოგიკის განახლება |
