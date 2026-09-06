/**
 * Home Shot — a dev-server render target for the phone home's hero chrome
 * (Figma 1076:1881), like /dev/lobby for the lobby: the reward tabs and the
 * profile card only mount for a signed-in player, which a screenshot pass
 * cannot be, so this page feeds them sample values over a still scene at
 * the frame's own 69px header height.
 *
 *   /dev/home?scene=<image url>   — the hero chrome over a scene still
 *   /dev/home?view=rooms          — the rooms rail's cards (Figma 1076:2132)
 */
import { useSearchParams } from "react-router-dom";
import { MobileHeroWidgets, MobileProfileCard } from "@/components/home/MobileHome";
import { RoomCard } from "@/components/team/MyRoomsSection";
import { AirbnbCategoryCard } from "@/components/discover/AirbnbCategoryCard";
import type { MyRoom } from "@/hooks/useMyRooms";
import homeScene from "@/assets/figma-home/home-scene.webp";
import iconBattleLounge from "@/assets/play-chooser/icon-crate.png";

// SmartAvatar maps local paths to the bot avatars only; a real profile
// picture is a URL, so the sample is one too (as on /dev/lobby).
const FACE = "https://api.dicebear.com/9.x/thumbs/png?seed=beka&size=96";

const FACE2 = "https://api.dicebear.com/9.x/thumbs/png?seed=nino&size=96";

// Only what RoomCard reads; the rest of a MyRoom is bookkeeping for the
// rooms page, so the sample is cast rather than filled in field by field.
function sampleRoom(over: Partial<MyRoom>): MyRoom {
  return {
    id: over.room_name ?? "room",
    room_code: "ABCD",
    room_name: "გუნდური ბრძოლა",
    room_icon: iconBattleLounge,
    max_players: 10,
    category_name: null,
    status: "waiting",
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    is_host: true,
    game_type: "classic",
    game_type_key: null,
    game_mode: null,
    has_unread_activity: false,
    tv_session_id: null,
    tv_status: null,
    tv_active_players: 0,
    tv_players: [],
    participants: [
      { user_id: "1", nickname: "Beka", avatar_url: FACE, is_host: true },
      { user_id: "2", nickname: "Nino", avatar_url: FACE2, is_host: false },
    ],
    online_participants: [],
    has_players_in_room: false,
    ...over,
  } as unknown as MyRoom;
}

export default function HomeShot() {
  const [params] = useSearchParams();
  const scene = params.get("scene") ?? homeScene;
  const noop = () => undefined;
  if (params.get("view") === "categories") {
    // The home rail's own width and gap, with the two shapes that used to
    // disagree: a name that wraps and one that does not, and a card whose
    // art is a bundled render beside ones drawn by DynamicIcon.
    const cats = [
      { id: "guess_city", categoryId: "guess_city", name: "Erraten die Stadt", slug: null, levels: 19 },
      { id: "physik", categoryId: "physik", name: "Physik", slug: "atom", levels: 18 },
      { id: "kultur", categoryId: "kultur", name: "Deutsche Kultur", slug: "castle", levels: 19 },
      { id: "guess_flag", categoryId: "guess_flag", name: "Erraten die Flagge", slug: null, levels: 12 },
    ];
    return (
      <div className="min-h-[100dvh] w-full bg-[#faf6ff] pt-6">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 pt-1 scrollbar-hide">
          {cats.map((c) => (
            <div key={c.id} className="w-[min(52vw,208px)] shrink-0 snap-start">
              <AirbnbCategoryCard
                id={c.id}
                categoryId={c.categoryId}
                iconSlug={c.slug}
                name={c.name}
                icon="🎯"
                color="#a78bfa"
                totalLevels={c.levels}
                onClick={noop}
                variant="compact"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (params.get("view") === "rooms") {
    const rooms = [
      sampleRoom({}),
      sampleRoom({ room_name: "სამსინგ ელსე", room_icon: null, game_type_key: "team_battle" }),
      sampleRoom({ room_name: "ლეგენდის კვალი", has_players_in_room: true }),
    ];
    return (
      <div className="min-h-[100dvh] w-full bg-[#faf6ff] pt-6">
        <div className="overflow-x-auto pb-4 scrollbar-hide">
          <div className="flex gap-3 px-4">
            {rooms.map((room, index) => (
              <RoomCard key={room.id} room={room} index={index} onJoin={noop} onDelete={noop} onLeave={noop} homeRail />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-[#faf6ff]"
      style={{ "--home-header-h": "69px" } as React.CSSProperties}
    >
      <img src={scene} alt="" className="absolute inset-x-0 top-0 w-full" draggable={false} />
      <MobileHeroWidgets giftLabel="3h 21m" onGiftClick={noop} onStreakClick={noop} onQuestClick={noop} />
      <MobileProfileCard
        nickname="Beka"
        avatarUrl={FACE}
        coins={61400}
        gems={129}
        onAvatarClick={noop}
        onNameClick={noop}
        onCoinsClick={noop}
        onGemsClick={noop}
      />
    </div>
  );
}
