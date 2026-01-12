import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Users, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useNearbyConnections } from "@/hooks/useNearbyConnections";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NearbyGamesSectionProps {
  onJoinRoom?: (roomCode: string) => void;
  className?: string;
}

export function NearbyGamesSection({ onJoinRoom, className }: NearbyGamesSectionProps) {
  const navigate = useNavigate();
  const {
    isSupported,
    isBrowsing,
    nearbyRooms,
    startBrowsing,
    stopBrowsing,
    requestToJoin,
  } = useNearbyConnections();
  
  const { joinRoom } = useGameRoom();
  const [joiningPeerId, setJoiningPeerId] = useState<string | null>(null);

  // Auto-start browsing when component mounts (on supported devices)
  useEffect(() => {
    if (isSupported) {
      startBrowsing();
    }
    
    return () => {
      if (isSupported) {
        stopBrowsing();
      }
    };
  }, [isSupported, startBrowsing, stopBrowsing]);

  // Handle joining a nearby room
  const handleJoinNearbyRoom = async (peerId: string, roomName: string) => {
    if (joiningPeerId) return;
    
    setJoiningPeerId(peerId);
    
    try {
      // Request the room code via Multipeer connection
      const roomCode = await requestToJoin(peerId);
      
      if (roomCode) {
        toast.success(`შეუერთდი: ${roomName}`, {
          icon: "🎮",
        });
        
        // Join the room via the normal flow
        if (onJoinRoom) {
          onJoinRoom(roomCode);
        } else {
          const room = await joinRoom(roomCode);
          if (room) {
            navigate(`/team?room=${roomCode}`);
          }
        }
      } else {
        toast.error("ვერ მოხერხდა ოთახთან დაკავშირება");
      }
    } catch (error) {
      console.error("Error joining nearby room:", error);
      toast.error("შეცდომა დაკავშირებისას");
    } finally {
      setJoiningPeerId(null);
    }
  };

  // Debug: Always show section with status indicator
  console.log('[NearbyGamesSection] isSupported:', isSupported, 'isBrowsing:', isBrowsing, 'rooms:', nearbyRooms.length);
  
  // Show a message on unsupported platforms instead of hiding completely
  if (!isSupported) {
    return (
      <div className={cn("space-y-3 px-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wifi className="w-5 h-5" />
          <span className="text-sm">ახლომდებარე თამაშები (მხოლოდ iOS აპლიკაციაში)</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Wifi className="w-5 h-5 text-primary" />
            {isBrowsing && (
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <h3 className="font-semibold text-foreground">ახლომდებარე თამაშები</h3>
        </div>
        
        {isBrowsing && nearbyRooms.length === 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            ძიება...
          </span>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="popLayout">
        {nearbyRooms.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {nearbyRooms.map((room, index) => (
              <motion.button
                key={room.peerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleJoinNearbyRoom(room.peerId, room.roomName)}
                disabled={joiningPeerId !== null}
                className={cn(
                  "w-full p-3 rounded-xl border transition-all",
                  "bg-gradient-to-r from-primary/5 to-primary/10",
                  "border-primary/20 hover:border-primary/40",
                  "hover:shadow-lg hover:shadow-primary/10",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "group"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Host Avatar or Icon */}
                  <div className="relative">
                    {room.hostAvatar ? (
                      <img
                        src={room.hostAvatar}
                        alt={room.hostNickname}
                        className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    
                    {/* Pulsing indicator for nearby */}
                    <motion.div
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Wifi className="w-2 h-2 text-white" />
                    </motion.div>
                  </div>

                  {/* Room Info */}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-foreground line-clamp-1">
                      {room.roomName}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{room.hostNickname}</span>
                      {room.category && (
                        <>
                          <span>•</span>
                          <span>{room.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Player Count & Join */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{room.playerCount}/{room.maxPlayers}</span>
                    </div>
                    
                    {joiningPeerId === room.peerId ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : isBrowsing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3"
            >
              <Wifi className="w-8 h-8 text-primary" />
            </motion.div>
            <p className="text-muted-foreground text-sm">
              ეძებს ახლომდებარე თამაშებს...
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              დარწმუნდი რომ მეგობრის აპლიკაცია ღიაა
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-6 text-center"
          >
            <WifiOff className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              ახლომდებარე თამაშები არ მოიძებნა
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
