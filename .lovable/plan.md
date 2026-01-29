

# გეგმა: LIVE და TV ბეჯების ლოგიკის გადამუშავება

## პრობლემა

ახლანდელი ლოგიკა:
- **LIVE ბეჯი**: ჩანს თუ `room.status === "playing"` ან `room.has_others_online`
- **TV აიქონი**: ჩანს თუ `isActiveTVSession(room.tv_status)` (TV დაკავშირებულია)

`has_others_online` განისაზღვრება `user_presence` ცხრილიდან - თუ მომხმარებელი "online" არის აპლიკაციაში, მაგრამ **არ ამოწმებს** სპეციფიკურად იმ ოთახშია თუ არა!

## ახალი მოთხოვნები

| ბეჯის ტიპი | პირობა |
|------------|--------|
| **LIVE** | მინიმუმ 1 მოთამაშე არის **ოთახის შიგნით** (lobby-ში ან თამაშში), არა მარტო online აპლიკაციაში |
| **TV** | თამაში LIVE **+** TV-თან დაწყვილებული (paired/playing) |

---

## ტექნიკური ანალიზი

### ახლანდელი მონაცემთა ნაკადი

```text
user_presence (ცხრილი)
├── user_id
├── status ("online" | "away" | "offline")
├── current_page ("/discover", "/team", "/room/ABC123" და ა.შ.)
└── last_seen (timestamp)

useMyRooms.ts:
  - ამოიღებს participants-ს room_participants-დან
  - ამოწმებს თითოეულის presence-ს user_presence-დან
  - has_others_online = presence.status === "online" (აპლიკაციაში online)
```

### გადაწყვეტა: `current_page`-ის გამოყენება

`user_presence.current_page` უკვე ინახავს მომხმარებლის მიმდინარე URL-ს. თუ `/team` გვერდზეა და roomCode-ზე დაბმულია, ან `/tv/host/:sessionId`-ზეა - ნიშნავს ოთახშია.

**ლოგიკა:**
```typescript
// მომხმარებელი ოთახშია თუ:
// 1. მისი current_page = "/team" და ეს ოთახი ღიაა (join param ან opened room)
// 2. მისი current_page = "/tv/host/:sessionId" და session ემთხვევა
```

**პრობლემა:** `current_page = "/team"` არ გვეუბნება **რომელ** ოთახშია.

### უკეთესი გადაწყვეტა: current_page-ში roomId-ის ჩაწერა

როცა მომხმარებელი შედის ოთახში, `current_page` უნდა შეიცვალოს:
- `/team?room=<room_id>` ფორმატით
- ან უფრო სტრუქტურირებული: `/room/<room_id>`

---

## იმპლემენტაციის გეგმა

### ნაბიჯი 1: Presence-ის განახლება ოთახში შესვლისას

**ფაილი:** `src/hooks/useUserPresence.ts`

დავამატოთ ფუნქცია ოთახის ID-ის დასაყენებლად:

```typescript
const setRoomPresence = useCallback(async (roomId: string | null) => {
  if (!canMakeRequest() || isUpdatingRef.current) return;
  
  const userId = user?.id || getGuestSessionId();
  isUpdatingRef.current = true;

  try {
    const pagePath = roomId ? `/room/${roomId}` : location.pathname;
    await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        status: 'online',
        current_page: pagePath,
        last_seen: new Date().toISOString(),
        country_code: countryCodeRef.current,
      }, {
        onConflict: 'user_id',
      });
  } finally {
    isUpdatingRef.current = false;
  }
}, [user?.id, location.pathname, canMakeRequest]);

return { updatePresence, setRoomPresence };
```

### ნაბიჯი 2: MultiplayerContextV2-ში presence-ის დაყენება

**ფაილი:** `src/contexts/MultiplayerContextV2.tsx`

როცა მომხმარებელი შედის ოთახში (`joinRoom` ან `enterRoom`):

```typescript
import { useUserPresence } from "@/hooks/useUserPresence";

// ოთახში შესვლისას:
const enterRoom = useCallback(async (room: GameRoom) => {
  // ... არსებული ლოგიკა
  setRoomPresence(room.id); // <- დამატება
}, [...]);

// ოთახიდან გასვლისას:
const exitRoom = useCallback(() => {
  setRoomPresence(null); // <- გასუფთავება
  // ... არსებული ლოგიკა
}, [...]);
```

### ნაბიჯი 3: useMyRooms-ში "in-room" ლოგიკის დამატება

**ფაილი:** `src/hooks/useMyRooms.ts`

```typescript
// Fetch online presence with current_page
const { data: presenceData } = await supabase
  .from("user_presence")
  .select("user_id, status, last_seen, current_page")
  .in("user_id", allParticipantUserIds)
  .eq("status", "online")
  .gte("last_seen", twoMinutesAgo);

// აწ გადამოწმება: არის თუ არა ამ კონკრეტულ ოთახში
const inRoomParticipants = participants
  .filter(p => {
    const presence = presenceData?.find(pr => pr.user_id === p.user_id);
    if (!presence) return false;
    // შევამოწმოთ current_page = "/room/<this_room_id>"
    return presence.current_page === `/room/${room.id}`;
  })
  .filter(p => p.user_id !== user.id); // გამოვტოვოთ საკუთარი თავი

return {
  // ...
  participants_in_room: inRoomParticipants,
  has_players_in_room: inRoomParticipants.length > 0,
};
```

### ნაბიჯი 4: ბეჯების ლოგიკის განახლება

**ფაილი:** `src/components/team/MyRoomsSection.tsx`

RoomCard-ში:

```typescript
// ახალი ლოგიკა:
const hasPlayersInRoom = room.has_players_in_room; // მინ. 1 მოთამაშე ოთახშია
const hasTVSession = isActiveTVSession(room.tv_status);
const isTVLive = hasPlayersInRoom && hasTVSession; // TV + მოთამაშეები შიგნით

// Badge conditions:
// 1. TV badge: თამაში live + TV დაწყვილებული
// 2. LIVE badge: მოთამაშეები ოთახში, TV-ს გარეშე
// 3. სხვა badges: ახალი, მოლოდინი, დასრულდა

{isTVLive ? (
  <div className="w-8 h-8 rounded-lg bg-white/20 ...">
    <QuizCategoryIcon iconSlug="retro-tv" />
  </div>
) : hasPlayersInRoom ? (
  <LiveBadge />
) : room.is_host && isNewlyCreated(room.created_at) ? (
  // ახალი badge
) : ... }
```

**ფაილი:** `src/components/team/widgets/ActiveRoomsWidget.tsx`

იგივე ლოგიკის გამოყენება.

---

## მონაცემთა ნაკადის დიაგრამა

```text
┌─────────────────────────────────────────────────────────────────┐
│  მომხმარებელი შედის ოთახში                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  setRoomPresence(roomId)                                        │
│  → user_presence.current_page = "/room/<room_id>"              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  useMyRooms fetches:                                            │
│  - room_participants (ვინ არის ოთახის წევრი)                   │
│  - user_presence (ვინ არის online + current_page)              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  has_players_in_room = participants.filter(                     │
│    p => presence.current_page === `/room/${room.id}`            │
│  ).length > 0                                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
          ┌───────────┴───────────┐
          │                       │
   has_players_in_room      !has_players_in_room
   + hasTVSession                 │
          │                       │
          ▼                       ▼
      TV Badge              has_players_in_room
                            (no TV)
                                  │
                                  ▼
                            LIVE Badge
```

---

## ცვლილებების შეჯამება

| ფაილი | ცვლილება |
|-------|----------|
| `src/hooks/useUserPresence.ts` | `setRoomPresence(roomId)` ფუნქციის დამატება |
| `src/contexts/MultiplayerContextV2.tsx` | ოთახში შესვლა/გასვლისას presence-ის განახლება |
| `src/hooks/useMyRooms.ts` | `current_page`-ის ამოღება და `has_players_in_room`-ის გამოთვლა |
| `src/components/team/MyRoomsSection.tsx` | ბეჯების ლოგიკის განახლება - LIVE და TV ცალ-ცალკე |
| `src/components/team/widgets/ActiveRoomsWidget.tsx` | იგივე ბეჯების ლოგიკა |

---

## შედეგი

| სცენარი | ბეჯი |
|---------|------|
| ოთახი ცარიელია (არავინ შიგნით) | მოლოდინი / ახალი / დასრულდა |
| 1+ მოთამაშე ოთახშია (TV-ს გარეშე) | **LIVE** |
| 1+ მოთამაშე ოთახშია + TV დაწყვილებული | **TV აიქონი** |
| TV დაწყვილებული, მაგრამ 0 მოთამაშე ოთახში | მოლოდინი (არა TV badge) |

