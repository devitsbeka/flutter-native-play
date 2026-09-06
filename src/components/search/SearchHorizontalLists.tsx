import React from "react";
import { Users, Gamepad2, Sparkles, Folder, Crown } from "lucide-react";
import { AddMiniCard, FriendMiniCard, RoomMiniCard, TriviaMiniCard, CollectionMiniCard } from "./SearchMiniCards";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Friend } from "@/hooks/useFriends";
import type { MyRoom } from "@/hooks/useMyRooms";

interface HorizontalSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isEmpty?: boolean;
  /** Space between the tiles: the stroked room containers want more. */
  gap?: "tight" | "loose";
}

function HorizontalSection({ title, icon: Icon, children, isEmpty, gap = "tight" }: HorizontalSectionProps) {
  if (isEmpty) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      </div>
      <div className={`flex overflow-x-auto pb-2 scrollbar-hide ${gap === "loose" ? "gap-2 px-4" : "gap-1 px-2"}`}>
        {children}
      </div>
    </div>
  );
}

interface SearchHorizontalListsProps {
  friends: Friend[];
  rooms: MyRoom[];
  trivias: {
    id: string;
    title: string;
    cover_image?: string | null;
    cover_gradient?: string | null;
    question_count: number;
  }[];
  collections: {
    id: string;
    title: string;
    cover_image?: string | null;
    cover_gradient?: string | null;
    rounds?: { count: number }[];
  }[];
  onSelectFriend: (id: string) => void;
  onSelectRoom: (code: string) => void;
  onSelectTrivia: (id: string) => void;
  onSelectCollection: (id: string) => void;
  /** The + at the head of the friends row. */
  onAddFriend: () => void;
  /** The + at the head of the rooms row. */
  onCreateRoom: () => void;
}

export function SearchHorizontalLists({
  friends,
  rooms,
  trivias,
  collections,
  onSelectFriend,
  onSelectRoom,
  onSelectTrivia,
  onSelectCollection,
  onAddFriend,
  onCreateRoom,
}: SearchHorizontalListsProps) {
  const { t } = useLanguage();
  // Filter host rooms for "My Trivia Parties"
  const myParties = rooms.filter(r => r.is_host);
  const allRooms = rooms;

  return (
    <div className="space-y-4 py-4">
      {/* Friends Section — the + leads the row and the row is always
          there: a player with no friends yet is exactly who needs the way
          to add one. */}
      <HorizontalSection 
        title={t("extra.ssFriends")} 
        icon={Users}
      >
        <AddMiniCard variant="friend" label={t("extra.ssAddFriend")} onClick={onAddFriend} />
        {friends.map((friend) => (
          <FriendMiniCard 
            key={friend.id} 
            friend={friend} 
            onClick={() => onSelectFriend(friend.friendId)} 
          />
        ))}
      </HorizontalSection>

      {/* Rooms Section — same shape: the + first, the row always shown,
          every room in its own stroked container. */}
      <HorizontalSection 
        title={t("extra.shRooms")} 
        icon={Gamepad2}
        gap="loose"
      >
        <AddMiniCard variant="room" label={t("extra.ssAddRoom")} onClick={onCreateRoom} />
        {allRooms.map((room) => (
          <RoomMiniCard 
            key={room.id} 
            room={room} 
            onClick={() => onSelectRoom(room.room_code)} 
          />
        ))}
      </HorizontalSection>

      {/* Trivias Section */}
      <HorizontalSection 
        title={t("extra.shTrivias")} 
        icon={Sparkles}
        isEmpty={trivias.length === 0}
      >
        {trivias.map((trivia) => (
          <TriviaMiniCard 
            key={trivia.id} 
            trivia={trivia} 
            onClick={() => onSelectTrivia(trivia.id)} 
          />
        ))}
      </HorizontalSection>

      {/* Collections Section */}
      <HorizontalSection 
        title={t("extra.shCollections")} 
        icon={Folder}
        isEmpty={collections.length === 0}
      >
        {collections.map((collection) => (
          <CollectionMiniCard 
            key={collection.id} 
            collection={collection} 
            onClick={() => onSelectCollection(collection.id)} 
          />
        ))}
      </HorizontalSection>
    </div>
  );
}
