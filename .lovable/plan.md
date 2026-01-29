
# შეტყობინებებიდან ტრივია/კოლექციაზე ნავიგაციის გასწორება

## პრობლემა

შეტყობინებაზე დაჭერისას (like/save/play) სისტემა ცდილობს `/collection/{id}`-ზე გადასვლას, მაგრამ `post_id` არის **ტრივიის ID** (`user_quiz_posts` ცხრილიდან), არა კოლექციის ID (`quiz_collections` ცხრილიდან).

```text
┌─────────────────────────────────────────────────────────────────┐
│ მიმდინარე ლოგიკა:                                               │
│   trivia_liked → /collection/{post_id} → "კოლექცია ვერ მოიძებნა" │
│                                                                  │
│ სწორი ლოგიკა:                                                   │
│   trivia_liked → /trivia/{post_id} → ტრივიის გვერდი ✓          │
└─────────────────────────────────────────────────────────────────┘
```

## მარშრუტების სტრუქტურა

| მარშრუტი | გვერდი | მონაცემთა წყარო |
|----------|--------|-----------------|
| `/trivia/:triviaId` | TriviaLobby | `user_quiz_posts` |
| `/collection/:collectionId` | CollectionLobby | `quiz_collections` |

## გადაწყვეტა

შევცვლით `handleNavigate` ფუნქციას `Notifications.tsx`-ში:

```typescript
case 'trivia_liked':
case 'trivia_saved':
  if (data?.post_id) {
    navigate(`/trivia/${data.post_id}`);  // /collection/ → /trivia/
  } else {
    navigate('/discover?tab=my-trivia');
  }
  break;
case 'trivia_played':
  if (data?.post_id) {
    navigate(`/trivia/${data.post_id}`);  // ასევე trivia lobby-ზე
  } else {
    navigate('/discover?tab=my-trivia');
  }
  break;
```

---

## შესაცვლელი ფაილი

**src/pages/Notifications.tsx** (ხაზები 197-213)

---

## ცვლილების დეტალები

### მანამდე:
```typescript
case 'trivia_liked':
case 'trivia_saved':
  // Navigate to view trivia (collection preview) instead of playing
  if (data?.post_id) {
    navigate(`/collection/${data.post_id}`);
  } else {
    navigate('/explore?tab=my-trivia');
  }
  break;
case 'trivia_played':
  // Keep play behavior for "played" notifications
  if (data?.post_id) {
    navigate(`/team?playTrivia=${data.post_id}`);
  } else {
    navigate('/explore?tab=my-trivia');
  }
  break;
```

### შემდეგ:
```typescript
case 'trivia_liked':
case 'trivia_saved':
case 'trivia_played':
  // Navigate to trivia lobby page to view the trivia details
  if (data?.post_id) {
    navigate(`/trivia/${data.post_id}`);
  } else {
    navigate('/discover?tab=my-trivia');
  }
  break;
```

---

## მოსალოდნელი შედეგი

| შეტყობინება | მანამდე | შემდეგ |
|-------------|---------|--------|
| trivia_liked | `/collection/{id}` - "ვერ მოიძებნა" | `/trivia/{id}` - ტრივიის გვერდი ✓ |
| trivia_saved | `/collection/{id}` - "ვერ მოიძებნა" | `/trivia/{id}` - ტრივიის გვერდი ✓ |
| trivia_played | `/team?playTrivia={id}` | `/trivia/{id}` - ტრივიის გვერდი ✓ |

---

## დამატებითი გაუმჯობესება

ასევე შევცვლით fallback URL-ს `/explore?tab=my-trivia`-დან `/discover?tab=my-trivia`-ზე, რადგან `/explore` მარშრუტი არ არსებობს (სწორია `/discover`).
