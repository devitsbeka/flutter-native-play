
# ანალიზი: ოთახების ჩვენების ლოგიკა და UX გაუმჯობესება

## მიმდინარე ლოგიკის ახსნა

### სტატუსების მნიშვნელობა

| სტატუსი | განმარტება | როდის ჩანს |
|---------|------------|------------|
| **LIVE** | თამაში აქტიურად მიმდინარეობს | როდესაც `room.status === "playing"` ან TV სესიაა აქტიური (`countdown`, `question`, `reveal` და ა.შ.) ან სხვა მოთამაშეა ონლაინ |
| **მოლოდინი** | თამაში ჯერ არ დაწყებულა | როდესაც `room.status === "waiting"` და არავინაა ონლაინ და თამაში არ მიმდინარეობს |
| **დასრულდა** | თამაში დასრულებულია | როდესაც `room.status === "completed"` |

### მიმდინარე სორტირების ლოგიკა (`useMyRooms.ts`, lines 382-414)

```text
1. აქტიური TV სესიები (LIVE badge) - პირველი
2. TV სესიები მოთამაშეებით - მეორე
3. "playing" სტატუსის ოთახები - მესამე  
4. "waiting" სტატუსის ოთახები - მეოთხე
5. Unread activity-ით ოთახები - მეხუთე
6. ბოლო აქტივობის მიხედვით - ბოლოში
```

---

## გამოვლენილი პრობლემა

### რატომ ვერ პოულობთ ახლახან შექმნილ ოთახს?

**პრობლემა**: თქვენმა ახლად შექმნილმა ოთახმა შეიძლება:
1. `last_activity_at` მნიშვნელობა არ განახლდა სწორად
2. სხვა ოთახებს აქვთ "LIVE" სტატუსი (უფრო მაღალი პრიორიტეტით)
3. სხვა ოთახებს აქვთ `has_unread_activity: true`

**მაგალითი სკრინშოტიდან**:
- "გასართობი არენა" - **მოლოდინი** (1 მოთამაშე) 
- "კლავიშთა ჰარმონია" - **LIVE** (2 მოთამაშე)

"კლავიშთა ჰარმონია" ზემოთაა რადგან LIVE სტატუსით, თუმცა თქვენი ახლად შექმნილი ოთახი შეიძლება კიდევ უფრო ქვემოთაა.

---

## გადაწყვეტის გეგმა: ოპტიმალური UX

### ახალი სორტირების პრიორიტეტები

| პრიორიტეტი | კატეგორია | ლოგიკა |
|------------|-----------|--------|
| **1** | ჩემი ახალი ოთახები | ჰოსტის მიერ შექმნილი, `waiting` სტატუსით, ბოლო 5 წუთში |
| **2** | LIVE ოთახები | `playing` ან აქტიური TV სესია |
| **3** | სხვები ონლაინ | ვინმე მელოდება ოთახში (`has_others_online`) |
| **4** | Unread activity | ახალი აქტივობა |
| **5** | მოლოდინის ოთახები | `waiting` სტატუსით |
| **6** | დასრულებული | `completed` სტატუსით |

### ვიზუალური ცვლილებები

**ახალი ბეჯი "ახალი" (New)** - ოთახებისთვის რომლებიც შეიქმნა ბოლო 5 წუთში:

```typescript
// Check if room was created recently (within 5 minutes)
const isNewlyCreated = (createdAt: string): boolean => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return new Date(createdAt).getTime() > fiveMinutesAgo;
};
```

**ბეჯების ტიპები**:
- 🔴 **LIVE** - წითელი, თამაში მიმდინარეობს
- 🟢 **ახალი** - მწვანე, ახლახან შექმნილი (ჩემი)
- 🟡 **მოლოდინი** - ყვითელი/ნარინჯისფერი, ელოდება მოთამაშეებს
- ⚪ **დასრულდა** - ნაცრისფერი

---

## კოდის ცვლილებები

### ფაილი 1: `src/hooks/useMyRooms.ts`

**ცვლილება**: სორტირების ლოგიკაში დავამატოთ "ჩემი ახალი ოთახების" პრიორიტეტი

```typescript
// Lines 382-414 - New sorting logic
result = [...result].sort((a, b) => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  // Priority 0: MY recently created rooms (within 5 min) - HIGHEST PRIORITY
  const aIsMyNew = a.is_host && a.status === "waiting" && 
    new Date(a.created_at).getTime() > fiveMinutesAgo;
  const bIsMyNew = b.is_host && b.status === "waiting" && 
    new Date(b.created_at).getTime() > fiveMinutesAgo;
  
  if (aIsMyNew && !bIsMyNew) return -1;
  if (bIsMyNew && !aIsMyNew) return 1;
  
  // Priority 1: LIVE rooms (playing or active TV with players)
  const aIsLive = a.status === "playing" || 
    (isLiveTVSession(a.tv_status) && a.tv_active_players > 0) || 
    a.has_others_online;
  const bIsLive = b.status === "playing" || 
    (isLiveTVSession(b.tv_status) && b.tv_active_players > 0) || 
    b.has_others_online;
  
  if (aIsLive && !bIsLive) return -1;
  if (bIsLive && !aIsLive) return 1;
  
  // Priority 2: Unread activity
  if (a.has_unread_activity && !b.has_unread_activity) return -1;
  if (b.has_unread_activity && !a.has_unread_activity) return 1;
  
  // Priority 3: Waiting rooms over completed
  if (a.status === "waiting" && b.status === "completed") return -1;
  if (b.status === "waiting" && a.status === "completed") return 1;
  
  // Priority 4: By last activity (most recent first)
  const aTime = new Date(a.last_activity_at || a.created_at).getTime();
  const bTime = new Date(b.last_activity_at || b.created_at).getTime();
  return bTime - aTime;
});
```

**დამატებითი export** - დავამატოთ `isNewlyCreated` ფუნქცია:

```typescript
export function isNewlyCreated(createdAt: string): boolean {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return new Date(createdAt).getTime() > fiveMinutesAgo;
}
```

---

### ფაილი 2: `src/components/team/MyRoomsSection.tsx`

**ცვლილება**: ახალი "ახალი" ბეჯის დამატება სტატუსის ლოგიკაში

```typescript
// Import the new helper
import { useMyRooms, MyRoom, RoomFilter, RoomSort, isActiveTVSession, isLiveTVSession, isNewlyCreated } from "@/hooks/useMyRooms";

// In RoomCard component - Lines ~410-424 and ~660-674
// Before the current status badge logic, add check for newly created:

const isMyNewRoom = room.is_host && room.status === "waiting" && isNewlyCreated(room.created_at);

// Updated badge rendering:
{(isPlaying || isTVLive || hasOthersOnline) ? (
  <div className="flex items-center">
    <LiveBadge />
    {isTVLive && <Tv className="w-3.5 h-3.5 text-white ml-1" />}
  </div>
) : isMyNewRoom ? (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/80 text-white font-bold text-xs">
    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
    ახალი
  </span>
) : isCompleted ? (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
    დასრულდა
  </span>
) : (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-xs">
    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
    მოლოდინი
  </span>
)}
```

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/hooks/useMyRooms.ts` | სორტირების ლოგიკა + `isNewlyCreated` ფუნქცია |
| `src/components/team/MyRoomsSection.tsx` | "ახალი" ბეჯის დამატება (2 ადგილას - desktop და mobile) |

---

## მოსალოდნელი შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| ახლად შექმნილი ოთახი | LIVE ოთახების შემდეგ | 🟢 **ახალი** ბეჯით, სიის თავში |
| LIVE ოთახი | პირველი | მეორე (ახალი ოთახების შემდეგ) |
| მოლოდინის ოთახი | შემთხვევითი თანმიმდევრობით | 🟡 **მოლოდინი** ბეჯით, LIVE-ის შემდეგ |

---

## UX შეჯამება

```text
სორტირების თანმიმდევრობა:
┌─────────────────────────────────────┐
│ 🟢 ახალი (ჩემი, ბოლო 5 წუთი)        │  ← პრიორიტეტი 1
├─────────────────────────────────────┤
│ 🔴 LIVE (თამაშობენ ან ონლაინ არიან) │  ← პრიორიტეტი 2
├─────────────────────────────────────┤
│ 🔵 Unread (ახალი აქტივობა)          │  ← პრიორიტეტი 3
├─────────────────────────────────────┤
│ 🟡 მოლოდინი (ელოდება)               │  ← პრიორიტეტი 4
├─────────────────────────────────────┤
│ ⚪ დასრულდა                        │  ← პრიორიტეტი 5
└─────────────────────────────────────┘
```

ამ ლოგიკით, თქვენი ახლად შექმნილი ოთახი **ყოველთვის** იქნება სიის თავში პირველი 5 წუთის განმავლობაში, რაც საშუალებას მოგცემთ მარტივად იპოვოთ და გააზიაროთ მეგობრებთან.
