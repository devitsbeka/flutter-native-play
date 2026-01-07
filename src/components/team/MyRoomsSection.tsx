import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Gamepad2, Tv, Airplay, Cast } from "lucide-react";
import { useMyRooms, MyRoom } from "@/hooks/useMyRooms";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { supabase } from "@/integrations/supabase/client";
import { TVMirrorModal } from "@/components/tv/TVMirrorModal";
import { Capacitor } from "@capacitor/core";

interface MyRoomsSectionProps {
  hideTV?: boolean;
  onCreateRoom?: () => void;
  onViewAllRooms?: () => void;
}

export function MyRoomsSection({ hideTV = false, onCreateRoom, onViewAllRooms }: MyRoomsSectionProps) {
  const { rooms, loading } = useMyRooms();
  const { enterRoom } = useMultiplayerV2();
  const { t } = useLanguage();
  const [showTVModal, setShowTVModal] = useState(false);
  
  const platform = Capacitor.getPlatform();
  const TVIcon = platform === 'ios' ? Airplay : platform === 'android' ? Cast : Tv;

  // Clear unread activity when joining a room
  const handleJoin = async (room: MyRoom) => {
    // Clear the unread flag
    if (room.has_unread_activity) {
      await supabase
        .from("game_rooms")
        .update({ has_unread_activity: false })
        .eq("id", room.id);
    }
    
    // If room is completed, reset it to waiting for rematch
    if (room.status === "completed") {
      await supabase
        .from("game_rooms")
        .update({ 
          status: "waiting",
          started_at: null,
          completed_at: null 
        })
        .eq("id", room.id);
      
      // Clear room questions for new game
      await supabase
        .from("room_questions")
        .delete()
        .eq("room_id", room.id);
      
      // Clear player answers
      await supabase
        .from("player_answers")
        .delete()
        .eq("room_id", room.id);
      
      // Reset all participants to joined status
      await supabase
        .from("room_participants")
        .update({ 
          status: "joined",
          score: 0,
          current_question: 0
        })
        .eq("room_id", room.id);
    }
    
    enterRoom(room.room_code);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 tracking-wide">{t('team.yourRooms')}</span>
          <button className="text-sm font-medium text-purple-600">ყველა</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex-shrink-0 w-64 h-44 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with optional TV button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 tracking-wide">{t('team.yourRooms')}</span>
        
        {/* TV Button or "ყველა" link */}
        {!hideTV ? (
          <button
            onClick={() => setShowTVModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <TVIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{t('tv.playOnTV')}</span>
          </button>
        ) : (
          <button 
            onClick={onViewAllRooms}
            className="text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            ყველა
          </button>
        )}
      </div>
      
      {/* TV Mirror Modal */}
      <TVMirrorModal open={showTVModal} onOpenChange={setShowTVModal} />

      {/* Rooms List */}
      <div className="overflow-x-auto -mx-4 px-4 pb-4 scrollbar-hide">
        <div className="flex gap-3 pr-4">
          {/* Add New Room Button - dotted style */}
          <motion.button
            onClick={onCreateRoom}
            className="flex-shrink-0 w-64 h-44 rounded-2xl border-2 border-dashed border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100 flex flex-col items-center justify-center gap-3 hover:border-purple-500 hover:bg-purple-100 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Plus className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-purple-600">ახალი ოთახი</span>
          </motion.button>

          {/* Room cards */}
          {rooms.map((room, index) => (
            <RoomCard
              key={room.id}
              room={room}
              index={index}
              onJoin={() => handleJoin(room)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface RoomCardProps {
  room: MyRoom;
  index: number;
  onJoin: () => void;
}

function RoomCard({ room, index, onJoin }: RoomCardProps) {
  const { t } = useLanguage();
  
  // Gradient backgrounds based on index for variety
  const gradients = [
    "linear-gradient(135deg, #FFFFFF 0%, #F3E8FF 50%, #E9D5FF 100%)",
    "linear-gradient(135deg, #FFFFFF 0%, #FCE7F3 50%, #FBCFE8 100%)",
    "linear-gradient(135deg, #FFFFFF 0%, #E0E7FF 50%, #C7D2FE 100%)",
    "linear-gradient(135deg, #FFFFFF 0%, #CCFBF1 50%, #99F6E4 100%)",
  ];

  // Display name: room_name or fallback to generated name
  const displayName = room.room_name || `${t('team.room')} #${room.room_code.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onJoin}
      className={`flex-shrink-0 w-64 p-4 rounded-2xl shadow-lg relative overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
        room.has_unread_activity 
          ? "border-2 border-emerald-400" 
          : "border border-white/50"
      }`}
      style={{
        background: gradients[index % gradients.length],
        boxShadow: room.has_unread_activity
          ? "0 0 20px rgba(52, 211, 153, 0.35), 0 8px 32px rgba(147, 51, 234, 0.15)"
          : "0 8px 32px rgba(147, 51, 234, 0.15), 0 4px 0 rgba(233, 213, 255, 0.5)",
      }}
    >
      {/* Decorative gradient orbs */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-purple-300/50 to-pink-300/50 rounded-full blur-2xl" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-blue-200/40 to-purple-200/40 rounded-full blur-xl" />
      
      {/* Room name as main headline */}
      <div className="mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800 text-lg leading-tight truncate flex-1">
            {displayName}
          </h3>
          {room.status === "playing" && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          )}
        </div>
        {room.category_name && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {room.category_name}
          </p>
        )}
      </div>

      {/* Participants */}
      <div className="flex items-center gap-2 relative z-10">
        <div className="flex -space-x-2.5">
          {room.participants.slice(0, 4).map((p) => (
            <div 
              key={p.user_id} 
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-white flex-shrink-0 bg-slate-200"
            >
              {p.avatar_url ? (
                <img 
                  src={p.avatar_url} 
                  alt={p.nickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  {p.nickname?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
          ))}
        </div>
        {room.participants.length > 4 && (
          <span className="text-xs text-slate-500">
            +{room.participants.length - 4}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto bg-white/60 px-2 py-1 rounded-full">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">{room.participants.length}</span>
        </div>
      </div>
    </motion.div>
  );
}
