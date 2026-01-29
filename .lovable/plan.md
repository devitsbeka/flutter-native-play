
# გატეხილი ავატარების პრობლემის გადაჭრა

## პრობლემის აღწერა

სკრინშოტზე ჩანს "TE" ტექსტი ავატარის ნაცვლად - ეს ნიშნავს რომ ავატარის URL გატეხილია და fallback ჩანს.

## მიზეზის ანალიზი

მონაცემთა ბაზაში აღმოვაჩინე **2 მომხმარებელი** გატეხილი ავატარებით:

| მომხმარებელი | გატეხილი URL |
|-------------|---------------|
| Hgghn | `/assets/bot-avatar-1-BvXs2Ih1.png` |
| Mako | `/assets/bot-avatar-1-BvXs2Ih1.png` |

### რატომ არის გატეხილი?

ეს არის **Vite-ის build-დროინდელი hashed path** (`-BvXs2Ih1`), რომელიც:
- მხოლოდ იმ კონკრეტულ build-ში მუშაობდა
- ახალ build-ებში hash იცვლება
- შესაბამისად, ძველი hash-ით URL-ები აღარ მუშაობს

### რა აკეთებს სისტემა ახლა?

`avatarUtils.ts` უკვე ამოიცნობს ამ გატეხილ URL-ებს:
```typescript
const VITE_HASHED_ASSET_PATTERN = /^\/assets\/.*-[a-zA-Z0-9]{8}\.(png|jpg|jpeg|webp|gif|svg)$/;
```

და აბრუნებს `undefined`-ს, რაც იწვევს fallback-ის ჩვენებას ("TE").

---

## გადაწყვეტა

### ნაწილი 1: მონაცემთა ბაზაში გატეხილი URL-ების გასწორება

გავასწორებთ 2 გატეხილ ჩანაწერს სწორ canonical path-ზე:

```sql
UPDATE profiles 
SET avatar_url = '/src/assets/avatars/bot-avatar-1.png',
    updated_at = NOW()
WHERE avatar_url LIKE '/assets/bot-avatar-%-%.png';
```

### ნაწილი 2: ავტომატური გასწორება მომავლისთვის

`resolveAvatarUrl` ფუნქციაში დავამატებთ ლოგიკას რომელიც გატეხილ Vite hash URL-ებს ავტომატურად გარდაქმნის სწორ ავატარზე:

```typescript
// avatarUtils.ts
if (VITE_HASHED_ASSET_PATTERN.test(avatarUrl)) {
  // Try to extract the base avatar name and map to a valid one
  const match = avatarUrl.match(/bot-avatar-(\d+)/);
  if (match && match[1]) {
    const avatarNum = match[1];
    const filename = `bot-avatar-${avatarNum}.png`;
    if (BOT_AVATAR_MAP[filename]) {
      return BOT_AVATAR_MAP[filename];
    }
  }
  console.warn('Invalid Vite-hashed avatar path:', avatarUrl);
  return undefined;
}
```

### ნაწილი 3: რეალურ დროში გასწორება (Optional Enhancement)

როცა აღმოვაჩენთ გატეხილ URL-ს, შეგვიძლია ავტომატურად შევცვალოთ მონაცემთა ბაზაში:

```typescript
// SmartAvatar.tsx or SafeAvatar.tsx
useEffect(() => {
  if (avatarUrl && VITE_HASHED_ASSET_PATTERN.test(avatarUrl) && userId) {
    // Auto-fix broken avatar in DB
    const fixedPath = extractCanonicalPath(avatarUrl);
    if (fixedPath) {
      supabase.from('profiles').update({ avatar_url: fixedPath }).eq('user_id', userId);
    }
  }
}, [avatarUrl, userId]);
```

---

## ტექნიკური დეტალები

### შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/utils/avatarUtils.ts` | Vite hash URL-ების ავტომატური გარდაქმნა |
| Database migration | 2 გატეხილი ჩანაწერის გასწორება |

### avatarUtils.ts - განახლებული ლოგიკა

```typescript
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | undefined {
  if (!avatarUrl) return undefined;
  
  // Try to recover Vite-hashed asset paths by extracting avatar number
  if (VITE_HASHED_ASSET_PATTERN.test(avatarUrl)) {
    const match = avatarUrl.match(/bot-avatar-(\d+)/);
    if (match && match[1]) {
      const filename = `bot-avatar-${match[1]}.png`;
      if (BOT_AVATAR_MAP[filename]) {
        console.info('Recovered broken Vite-hashed avatar:', avatarUrl, '→', filename);
        return BOT_AVATAR_MAP[filename];
      }
    }
    console.warn('Unrecoverable Vite-hashed avatar path:', avatarUrl);
    return undefined;
  }
  
  // ... rest of existing logic
}
```

---

## მოსალოდნელი შედეგი

| მანამდე | შემდეგ |
|---------|--------|
| "TE" fallback ტექსტი | bot-avatar-1 სურათი |
| 2 გატეხილი ჩანაწერი DB-ში | 0 გატეხილი ჩანაწერი |
| მომავალი გატეხილი URL-ები → fallback | მომავალი გატეხილი URL-ები → ავტომატურად recover |

---

## URL ტიპების სტატისტიკა (ამჟამად)

```text
┌─────────────────────┬───────┐
│ URL ტიპი            │ რაოდ. │
├─────────────────────┼───────┤
│ valid_url (https)   │ 15    │
│ canonical_path      │ 4     │
│ broken_vite_hash ⚠️ │ 2     │
└─────────────────────┴───────┘
```

გასწორების შემდეგ `broken_vite_hash` იქნება 0.
