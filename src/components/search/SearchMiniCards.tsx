import React from "react";
import { motion } from "framer-motion";
import { Gamepad2, Users, Crown, Sparkles, Folder, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import type { Friend } from "@/hooks/useFriends";
import type { MyRoom } from "@/hooks/useMyRooms";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRoomIconPool } from "@/hooks/useRoomIconPool";
import { dealtRoomIcon } from "@/utils/roomCrests";

// Add Mini Card — the way to make the row longer, drawn in the shape of
// the row it leads: a dashed circle among the friends' faces, a dashed
// tile in a stroked container among the rooms. It goes FIRST, so the way to
// add is where a thumb lands before it scrolls, and it is there whether the
// row has anything in it yet or not — an empty row used to vanish, and with
// it the only hint that the feature existed.
interface AddMiniCardProps {
  variant: "friend" | "room";
  label: string;
  onClick: () => void;
}

export function AddMiniCard({ variant, label, onClick }: AddMiniCardProps) {
  const isFriend = variant === "friend";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
      className={
        isFriend
          ? "flex flex-col items-center gap-2 min-w-[72px] p-2"
          : ROOM_TILE_CLASS
      }
    >
      <div
        className={`flex items-center justify-center border-2 border-dashed border-primary/40 bg-primary/5 text-primary ${
          isFriend ? "w-14 h-14 rounded-full" : "w-16 h-16 rounded-2xl"
        }`}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </div>
      <span className={`text-xs font-medium text-foreground truncate ${isFriend ? "max-w-[64px]" : "max-w-[90px]"}`}>
        {label}
      </span>
    </motion.button>
  );
}

/**
 * A room tile sits in its own container with a light stroke (owner's ask),
 * so each room reads as a card on the strip rather than a loose icon.
 */
export const ROOM_TILE_CLASS =
  "flex flex-col items-center gap-2 min-w-[104px] rounded-[18px] border border-[#e7def6] bg-white/70 px-3 py-2.5";

// Friend Mini Card
interface FriendMiniCardProps {
  friend: Friend;
  onClick: () => void;
}

export function FriendMiniCard({ friend, onClick }: FriendMiniCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-2 min-w-[72px] p-2"
    >
      <div className="relative">
        <Avatar className="w-14 h-14 border-2 border-border">
          <ResolvedAvatarImage src={friend.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {friend.nickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {friend.isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
      <span className="text-xs font-medium text-foreground truncate max-w-[64px]">
        {friend.nickname}
      </span>
    </motion.button>
  );
}

// Room Mini Card
interface RoomMiniCardProps {
  room: MyRoom;
  onClick: () => void;
  isParty?: boolean;
}

export function RoomMiniCard({ room, onClick, isParty }: RoomMiniCardProps) {
  const participantCount = room.participants?.length || 0;
  // Every room wears a face: the host's icon, else a random one dealt from
  // the shared pool by room id (owner's rule) — never a blank gamepad.
  const pool = useRoomIconPool();
  const iconUrl = room.room_icon || room.cover_image || dealtRoomIcon(room.id, pool);

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={ROOM_TILE_CLASS}
    >
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{ 
          background: room.background_gradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
        }}
      >
        {iconUrl ? (
          <img 
            src={iconUrl} 
            alt={room.room_name || ""} 
            className="w-full h-full rounded-2xl object-cover"
          />
        ) : isParty ? (
          <Crown className="w-7 h-7 text-white" />
        ) : (
          <Gamepad2 className="w-7 h-7 text-white" />
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-foreground truncate max-w-[90px]">
          {room.room_name || room.room_code}
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Users className="w-3 h-3" />
          {participantCount}
        </span>
      </div>
    </motion.button>
  );
}

// Trivia Mini Card
interface TriviaMiniCardProps {
  trivia: {
    id: string;
    title: string;
    cover_image?: string | null;
    cover_gradient?: string | null;
    question_count: number;
  };
  onClick: () => void;
}

export function TriviaMiniCard({ trivia, onClick }: TriviaMiniCardProps) {
  const { t } = useLanguage();
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-2 min-w-[100px] p-2"
    >
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{ 
          background: trivia.cover_gradient || "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" 
        }}
      >
        {trivia.cover_image ? (
          <img 
            src={trivia.cover_image} 
            alt={trivia.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <Sparkles className="w-7 h-7 text-white" />
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-foreground truncate max-w-[90px]">
          {trivia.title}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {t("extra.questionsLabel", { count: trivia.question_count })}
        </span>
      </div>
    </motion.button>
  );
}

// Collection Mini Card
interface CollectionMiniCardProps {
  collection: {
    id: string;
    title: string;
    cover_image?: string | null;
    cover_gradient?: string | null;
    rounds?: { count: number }[];
  };
  onClick: () => void;
}

export function CollectionMiniCard({ collection, onClick }: CollectionMiniCardProps) {
  const { t } = useLanguage();
  const roundCount = collection.rounds?.[0]?.count || 0;
  
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-2 min-w-[100px] p-2"
    >
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
        style={{ 
          background: collection.cover_gradient || "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" 
        }}
      >
        {collection.cover_image ? (
          <img 
            src={collection.cover_image} 
            alt={collection.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <Folder className="w-7 h-7 text-white" />
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-foreground truncate max-w-[90px]">
          {collection.title}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {t("extra.roundsBadge", { count: roundCount })}
        </span>
      </div>
    </motion.button>
  );
}
