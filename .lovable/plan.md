
# გამარტივება: გამოწვევის ღილაკი პირდაპირ ოთახის შექმნაზე

## პრობლემა

"გამოწვევა" ღილაკზე დაჭერისას ჩნდება შუალედური ეკრანი (ChallengeTypeModal) სხვადასხვა ვარიანტებით. თქვენ გსურთ ამ ეკრანის გამოტოვება და პირდაპირ ოთახის შექმნის გვერდზე გადასვლა, სადაც არჩეული მეგობარი უკვე იქნება მოწვევაში.

---

## გადაწყვეტა

შევცვლით `PlayerProfileModal.tsx`-ში `handleChallenge` ფუნქციას, რომ:

1. დახუროს პროფილის მოდალი
2. პირდაპირ გადაამისამართოს `/team?challenge={userId}&type=create-room` URL-ზე (გვერდს გვერდის ავლით ChallengeTypeModal-ს)

ეს ავტომატურად გახსნის CreateRoomPage-ს, სადაც გამოწვეული მეგობარი უკვე იქნება მოწვევის სიაში.

---

## ტექნიკური ცვლილება

### ფაილი: `src/components/profile/PlayerProfileModal.tsx`

**ამჟამინდელი კოდი (სტრიქონები 105-107):**
```typescript
const handleChallenge = () => {
  setChallengeModalOpen(true);
};
```

**ახალი კოდი:**
```typescript
const handleChallenge = () => {
  onClose();
  navigate(`/team?challenge=${userId}&type=create-room`);
};
```

### დამატებით წასაშლელი კოდი:

1. წავშლით `challengeModalOpen` state-ს (სტრიქონი 59)
2. წავშლით `ChallengeTypeModal` იმპორტს (სტრიქონი 17)
3. წავშლით `ChallengeTypeModal` კომპონენტს JSX-დან (სტრიქონები 437-451)

---

## შედეგი

```text
მოქმედება: "გამოწვევა" ღილაკზე დაჭერა
შედეგი:   პირდაპირ გახსნის ოთახის შექმნის გვერდს
          მეგობარი ავტომატურად არჩეულია მოწვევაში
```

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/components/profile/PlayerProfileModal.tsx` | handleChallenge → navigate პირდაპირ; ChallengeTypeModal-ის წაშლა |
