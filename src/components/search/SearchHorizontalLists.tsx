import React from "react";
import { Users, Gamepad2, Sparkles, Folder, Crown } from "lucide-react";
import { FriendMiniCard, RoomMiniCard, TriviaMiniCard, CollectionMiniCard } from "./SearchMiniCards";
import type { Friend } from "@/hooks/useFriends";
import type { MyRoom } from "@/hooks/useMyRooms";

interface HorizontalSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isEmpty?: boolean;
}

function HorizontalSection({ title, icon: Icon, children, isEmpty }: HorizontalSectionProps) {
  if (isEmpty) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      </div>
      <div className="flex gap-1 overflow-x-auto px-2 pb-2 scrollbar-hide">
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
}: SearchHorizontalListsProps) {
  // Filter host rooms for "My Trivia Parties"
  const myParties = rooms.filter(r => r.is_host);
  const allRooms = rooms;

  return (
    <div className="space-y-4 py-4">
      {/* Friends Section */}
      <HorizontalSection 
        title="მეგობრები" 
        icon={Users}
        isEmpty={friends.length === 0}
      >
        {friends.map((friend) => (
          <FriendMiniCard 
            key={friend.id} 
            friend={friend} 
            onClick={() => onSelectFriend(friend.friendId)} 
          />
        ))}
      </HorizontalSection>

      {/* Rooms Section */}
      <HorizontalSection 
        title="ოთახები" 
        icon={Gamepad2}
        isEmpty={allRooms.length === 0}
      >
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
        title="ტრივიები" 
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
        title="კოლექციები" 
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

      {/* My Trivia Parties Section */}
      <HorizontalSection 
        title="ჩემი წვეულებები" 
        icon={Crown}
        isEmpty={myParties.length === 0}
      >
        {myParties.map((room) => (
          <RoomMiniCard 
            key={room.id} 
            room={room} 
            onClick={() => onSelectRoom(room.room_code)}
            isParty
          />
        ))}
      </HorizontalSection>
    </div>
  );
}
