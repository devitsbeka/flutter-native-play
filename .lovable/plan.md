

# LIVE Badge გაუმჯობესება: ონლაინ მონაწილეების ჩვენება

## მიმოხილვა

გაუმჯობესდება LIVE badge-ის ჩვენების ლოგიკა ოთახის ბარათებზე:

1. **LIVE badge ჩანს როცა**: სხვა მომხმარებელი (გარდა ჩემი) ონლაინ არის ამ ოთახში
2. **LIVE + TV იკონი ჩანს როცა**: ზემოთ აღწერილი პირობა + TV რეჟიმი ჩართულია
3. **სორტირება**: ოთახები დალაგდება ბოლო აქტივობის მიხედვით

---

## ტექნიკური გადაწყვეტა

### 1. useMyRooms.ts - ონლაინ მომხმარებლების მონაცემების დამატება

მოხდება room-ების fetch-ის დროს `user_presence` ცხრილთან cross-reference, რომ დადგინდეს ოთახის მონაწილეებიდან ვინ არის ონლაინ:

```text
+------------------+       +------------------+       +------------------+
| game_rooms       |       | room_participants|       | user_presence    |
+------------------+       +------------------+       +------------------+
| id               |<----->| room_id          |       | user_id          |
| room_name        |       | user_id          |<----->| status           |
| status           |       | nickname         |       | last_seen        |
| tv_session_id    |       | avatar_url       |       | current_page     |
+------------------+       +------------------+       +------------------+
```

**MyRoom interface-ში დაემატება:**
- `online_participants: { user_id, nickname, avatar_url }[]` - ონლაინ მონაწილეების სია
- `has_others_online: boolean` - არის თუ არა სხვა ონლაინ მომხმარებელი

### 2. MyRoomsSection.tsx - LIVE Badge ლოგიკის განახლება

**ამჟამინდელი ლოგიკა:**
```typescript
{(isPlaying || hasTVSession) ? (
  <LiveBadge />
) : ...}
```

**ახალი ლოგიკა:**
```typescript
{(isPlaying || hasTVSession || hasOthersOnline) ? (
  <div className="flex items-center gap-1">
    <LiveBadge />
    {hasTVSession && <TvIcon className="w-4 h-4 text-white" />}
  </div>
) : ...}
```

### 3. LiveBadge.tsx - TV იკონის მხარდაჭერა (optional prop)

`LiveBadge` კომპონენტს შეიძლება დაემატოს `showTVIcon` prop ან TV იკონი გარედან დაემატება.

---

## ფაილების ცვლილებები

| ფაილი | ცვლილება |
|-------|----------|
| `src/hooks/useMyRooms.ts` | `user_presence`-თან join, ონლაინ მომხმარებლების დათვლა |
| `src/components/team/MyRoomsSection.tsx` | LIVE badge ლოგიკის განახლება, TV იკონის დამატება |
| `src/components/team/widgets/ActiveRoomsWidget.tsx` | იგივე ლოგიკა widget-ისთვის |

---

## მონაცემთა ბაზის Query

```sql
-- ონლაინ მონაწილეების მოძიება (last_seen ბოლო 2 წუთში)
SELECT 
  rp.room_id,
  rp.user_id,
  rp.nickname,
  rp.avatar_url,
  up.status,
  up.last_seen
FROM room_participants rp
JOIN user_presence up ON rp.user_id::text = up.user_id::text
WHERE rp.room_id IN (...)
  AND up.status = 'online'
  AND up.last_seen > NOW() - INTERVAL '2 minutes'
```

---

## შედეგი

| სცენარი | მანამდე | შემდეგ |
|---------|---------|--------|
| სხვა ონლაინ არის ოთახში | ბეჯი არ ჩანს | LIVE ბეჯი ჩანს |
| სხვა ონლაინ + TV ჩართული | LIVE ბეჯი | LIVE ბეჯი + TV იკონი |
| მხოლოდ TV ჩართული | LIVE ბეჯი | LIVE ბეჯი + TV იკონი |
| მხოლოდ მე ვარ ოთახში | ბეჯი არ ჩანს | ბეჯი არ ჩანს |
| თამაში მიმდინარეობს | LIVE ბეჯი | LIVE ბეჯი |

---

## რეალტაიმ განახლება

`useMyRooms` უკვე უსმენს:
- `game_rooms` ცვლილებებს
- `room_participants` ცვლილებებს
- `tv_sessions` ცვლილებებს
- `tv_players` ცვლილებებს

**დაემატება:**
- `user_presence` ცვლილებების subscription - ოთახის მონაწილეების ონლაინ სტატუსის განახლება

