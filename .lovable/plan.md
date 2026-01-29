
# შეტყობინებების ტაბ-სისტემა და Avatar/Icon გაუმჯობესება

## მიმოხილვა

შეტყობინებების გვერდზე დაემატება 3 ტაბი ფილტრაციისთვის და გაუმჯობესდება avatar-ების ჩვენება - ოთახის/ტრივიის იკონების გამოყენებით.

---

## მიმდინარე სტრუქტურა

ახლა Notifications.tsx-ში შეტყობინებები იყოფა სექციებად (მეგობრები, თამაშები, ტრივია და ა.შ.) და ყველა ერთად ჩნდება. CompactNotificationCard-ში avatar-ად ნაჩვენებია `sender_avatar` პროფილიდან.

---

## ახალი ტაბების სტრუქტურა

```text
┌───────────────────────────────────────────────────────────────┐
│ 🎮 თამაშები │ 👥 სოციალური │ 🎯 ტრივია                        │
├───────────────────────────────────────────────────────────────┤
│ თამაშები:                                                     │
│   - room_invite (ოთახის მოწვევა)                              │
│   - game_started (თამაში დაიწყო)                              │
│   - challenge (გამოწვევა)                                      │
│   - game_result (თამაშის შედეგი)                              │
├───────────────────────────────────────────────────────────────┤
│ სოციალური:                                                    │
│   - friend_request (მეგობრობის მოთხოვნა)                      │
│   - friend_accepted (მეგობარი დაემატა)                        │
├───────────────────────────────────────────────────────────────┤
│ ტრივია:                                                        │
│   - trivia_liked (მოიწონა ტრივია)                              │
│   - trivia_saved (შეინახა ტრივია)                              │
│   - trivia_played (ითამაშა ტრივია)                            │
└───────────────────────────────────────────────────────────────┘
```

---

## Avatar/Icon გაუმჯობესებები

### 1. თამაშის შეტყობინებები - ოთახის იკონი

თუ შეტყობინებას აქვს `room_icon` data-ში:
```text
┌─────────────────────────────────┐
│  🏠 [room_icon image]           │
│  ────────────────────           │
│  ოთახის მოწვევა                 │
│  beka გიწვევს თამაშში           │
└─────────────────────────────────┘
```

### 2. ტრივია შეტყობინებები - ტრივიის cover ან icon

თუ შეტყობინებას აქვს `trivia_cover` ან `trivia_icon_slug`:
```text
┌─────────────────────────────────┐
│  ❤️ [trivia_icon/cover]         │  ← ტრივიის cover ან icon_slug
│  ────────────────────           │
│  Test მოიწონა შენი ტრივია       │
│  ქვიზ კინოს სამყაროზე           │
└─────────────────────────────────┘
```

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/pages/Notifications.tsx` | ტაბების დამატება, ფილტრაციის ლოგიკა |
| `src/components/notifications/CompactNotificationCard.tsx` | Avatar/icon ლოგიკის გაუმჯობესება |
| `src/hooks/useSocialFeed.ts` | ტრივიის icon/cover-ის დამატება notification data-ში |
| `src/components/social/QuizPlayModal.tsx` | ტრივიის icon/cover-ის დამატება notification data-ში |

---

## ტექნიკური ცვლილებები

### 1. Notifications.tsx - ტაბების დამატება

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Gamepad2, Users, Sparkles } from "lucide-react";

// ტაბის კატეგორიები
type NotificationTab = 'games' | 'social' | 'trivia';

const TAB_TYPES: Record<NotificationTab, string[]> = {
  games: ['room_invite', 'game_started', 'challenge', 'game_result'],
  social: ['friend_request', 'friend_accepted'],
  trivia: ['trivia_liked', 'trivia_saved', 'trivia_played'],
};

// ფილტრაცია აქტიური ტაბის მიხედვით
const [activeTab, setActiveTab] = useState<NotificationTab>('games');

const filteredNotifications = useMemo(() => {
  return notifications.filter(n => TAB_TYPES[activeTab].includes(n.type));
}, [notifications, activeTab]);

// Unread count per tab
const getUnreadCount = (tab: NotificationTab) => {
  return notifications.filter(n => 
    TAB_TYPES[tab].includes(n.type) && !n.read_at
  ).length;
};
```

### 2. CompactNotificationCard.tsx - Avatar Logic

```typescript
// Determine what to show as the main avatar
const getAvatarContent = () => {
  const data = notification.data as Record<string, unknown>;
  
  // 1. Trivia notifications - show trivia cover or icon
  if (['trivia_liked', 'trivia_saved', 'trivia_played'].includes(notification.type)) {
    const triviaCover = data.trivia_cover as string | undefined;
    const triviaIconSlug = data.trivia_icon_slug as string | undefined;
    
    if (triviaCover) {
      return { type: 'image', src: triviaCover };
    }
    if (triviaIconSlug) {
      return { type: 'icon_slug', slug: triviaIconSlug };
    }
  }
  
  // 2. Game notifications - show room icon if available
  if (['room_invite', 'game_started', 'challenge'].includes(notification.type)) {
    const roomIcon = data.room_icon as string | undefined;
    if (roomIcon) {
      return { type: 'image', src: roomIcon };
    }
  }
  
  // 3. Default - sender avatar
  return { type: 'avatar', src: avatarUrl };
};
```

### 3. useSocialFeed.ts - Notification Data Enhancement

Like mutation:
```typescript
// Get trivia cover and icon for notification
const { data: postData } = await supabase
  .from("user_quiz_posts")
  .select("user_id, title, cover_image, icon_slug")
  .eq("id", postId)
  .single();

await createNotification(
  postData.user_id,
  "trivia_liked",
  `${senderProfile?.nickname || "ვიღაცამ"} მოიწონა შენი ტრივია`,
  postData.title || undefined,
  { 
    post_id: postId, 
    sender_id: user.id,
    sender_nickname: senderProfile?.nickname,
    sender_avatar: senderProfile?.avatar_url,
    trivia_title: postData.title,
    trivia_cover: postData.cover_image,
    trivia_icon_slug: postData.icon_slug,
  }
);
```

### 4. DB Trigger Enhancement (notify_room_invite)

ოთახის იკონის დამატება room_invite შეტყობინებაში:

```sql
-- Update trigger to include room_icon
jsonb_build_object(
  'room_id', NEW.room_id,
  'room_code', room_record.room_code,
  'room_name', room_record.room_name,
  'room_icon', room_record.room_icon,  -- NEW
  'category_name', room_record.category_name,
  ...
)
```

---

## UI დიზაინი

### ტაბების სტილი

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList className="grid grid-cols-3 w-full bg-card/60 backdrop-blur-sm rounded-xl p-1">
    <TabsTrigger value="games" className="flex items-center gap-1.5 text-xs">
      <Gamepad2 className="w-3.5 h-3.5" />
      თამაშები
      {getUnreadCount('games') > 0 && (
        <span className="ml-1 w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center">
          {getUnreadCount('games')}
        </span>
      )}
    </TabsTrigger>
    <TabsTrigger value="social" className="flex items-center gap-1.5 text-xs">
      <Users className="w-3.5 h-3.5" />
      მეგობრები
      {getUnreadCount('social') > 0 && ...}
    </TabsTrigger>
    <TabsTrigger value="trivia" className="flex items-center gap-1.5 text-xs">
      <Sparkles className="w-3.5 h-3.5" />
      ტრივია
      {getUnreadCount('trivia') > 0 && ...}
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### Avatar რენდერინგი

```tsx
{avatarContent.type === 'icon_slug' ? (
  <QuizCategoryIcon 
    iconSlug={avatarContent.slug} 
    size={44} 
    className="rounded-full"
  />
) : avatarContent.type === 'image' ? (
  <Avatar className="w-11 h-11">
    <AvatarImage src={avatarContent.src} />
    <AvatarFallback>
      <Icon className="w-5 h-5" />
    </AvatarFallback>
  </Avatar>
) : (
  <Avatar className="w-11 h-11">
    <AvatarImage src={avatarUrl} />
    <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
  </Avatar>
)}
```

---

## მოსალოდნელი შედეგი

| ფუნქცია | აღწერა |
|---------|--------|
| 3 ტაბი | თამაშები / მეგობრები / ტრივია - მარტივი ნავიგაცია |
| Unread badges | თითოეულ ტაბზე წაუკითხავების რაოდენობა |
| Room icon | თამაშის მოწვევაზე ოთახის იკონი (თუ არსებობს) |
| Trivia icon | ტრივია like/save/play-ზე ტრივიის cover ან icon |
| Sender overlay | პატარა badge sender-ის ავატარით overlay-ად |

---

## მინიმალური Screenshot რეფერენსის მიხედვით

```text
┌───────────────────────────────────────┐
│  🔔 აქტივობა                     ✕    │
├───────────────────────────────────────┤
│ [თამაშები] [მეგობრები] [ტრივია•3]    │
├───────────────────────────────────────┤
│  ❤️ 💜                                │
│  ├──○ Test მოიწონა შენი ტრივია       │
│  │    ქვიზ კინოს სამყაროზე    2 დღე  │
│  │    [ნახვა]                         │
│                                       │
│  📑 💜                                │
│  ├──○ Test შეინახა შენი ტრივია       │
│  │    ქვიზ კინოს სამყაროზე    2 დღე  │
│  │    [ნახვა]                         │
└───────────────────────────────────────┘
```
