import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { KeyRound, Delete, Wifi, WifiOff, Loader2, Users, ChevronRight } from "lucide-react";
import { useNearbyConnections } from "@/hooks/useNearbyConnections";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const { enterRoom, loading } = useMultiplayerV2();
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [joiningPeerId, setJoiningPeerId] = useState<string | null>(null);
  
  const {
    isSupported,
    isBrowsing,
    nearbyRooms,
    startBrowsing,
    stopBrowsing,
    requestToJoin,
  } = useNearbyConnections();

  // Start/stop browsing when scanning mode changes
  useEffect(() => {
    if (isScanning && isSupported) {
      startBrowsing();
    } else if (!isScanning && isBrowsing) {
      stopBrowsing();
    }
  }, [isScanning, isSupported, startBrowsing, stopBrowsing, isBrowsing]);

  // Stop browsing when modal closes
  useEffect(() => {
    if (!isOpen && isBrowsing) {
      stopBrowsing();
      setIsScanning(false);
    }
  }, [isOpen, isBrowsing, stopBrowsing]);

  const handleToggleScan = () => {
    if (!isSupported) {
      toast.error("Nearby Connections მხოლოდ iOS-ზე მუშაობს");
      return;
    }
    setIsScanning(!isScanning);
  };

  const handleJoinNearbyRoom = async (peerId: string) => {
    setJoiningPeerId(peerId);
    try {
      const roomCode = await requestToJoin(peerId);
      if (roomCode) {
        await enterRoom(roomCode);
        onClose();
      } else {
        toast.error("ვერ მოხერხდა ოთახთან დაკავშირება");
      }
    } catch {
      toast.error("შეცდომა დაკავშირებისას");
    } finally {
      setJoiningPeerId(null);
    }
  };

  const handleKeyPress = (key: string) => {
    if (code.length < 6) {
      setCode(prev => prev + key);
    }
  };

  const handleDelete = () => {
    setCode(prev => prev.slice(0, -1));
  };

  const handleJoin = async () => {
    if (code.length === 6) {
      await enterRoom(code);
    }
  };

  const keys = [
    ["A", "B", "C", "D", "E"],
    ["F", "G", "H", "J", "K"],
    ["L", "M", "N", "P", "Q"],
    ["R", "S", "T", "U", "V"],
    ["W", "X", "Y", "Z", "2"],
    ["3", "4", "5", "6", "7"],
    ["8", "9"],
  ];

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      variant="info"
      icon={<KeyRound className="w-10 h-10" />}
      title="შეუერთდი ოთახს"
      subtitle="შეიყვანე კოდი ან მოძებნე ახლომდებარე ოთახები"
      showSparkles
    >
      <div className="space-y-4 mt-2">
        {/* Nearby Scan Button - Only on iOS */}
        {isSupported && (
          <motion.button
            onClick={handleToggleScan}
            className={`w-full py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${
              isScanning 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg" 
                : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                ძებნა... ({nearbyRooms.length} ოთახი)
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5" />
                მოძებნე ახლომდებარე ოთახები
              </>
            )}
          </motion.button>
        )}

        {/* Nearby Rooms List */}
        <AnimatePresence>
          {isScanning && nearbyRooms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {nearbyRooms.map((room) => (
                <motion.button
                  key={room.peerId}
                  onClick={() => handleJoinNearbyRoom(room.peerId)}
                  disabled={joiningPeerId === room.peerId}
                  className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 flex items-center gap-3 hover:shadow-md transition-all disabled:opacity-50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Avatar className="w-10 h-10 border-2 border-purple-300">
                    {room.hostAvatar ? (
                      <AvatarImage src={room.hostAvatar} alt={room.hostNickname} />
                    ) : (
                      <AvatarFallback className="bg-purple-200 text-purple-700 font-bold">
                        {room.hostNickname.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-foreground">{room.roomName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {room.hostNickname} • {room.playerCount}/{room.maxPlayers}
                    </div>
                  </div>
                  {joiningPeerId === room.peerId ? (
                    <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-500" />
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when scanning */}
        {isScanning && nearbyRooms.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4 text-muted-foreground text-sm"
          >
            <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            ოთახები ვერ მოიძებნა ახლოს
          </motion.div>
        )}

        {/* Divider */}
        {isSupported && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ან კოდით</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* Code display */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{
                background: code[i] 
                  ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)"
                  : "#F9FAFB",
                border: code[i] 
                  ? "2px solid #A78BFA"
                  : "2px solid #E5E7EB",
                boxShadow: code[i]
                  ? "0 3px 0 #C4B5FD"
                  : "0 2px 0 #E5E7EB",
                color: code[i] ? "#5B21B6" : "#9CA3AF",
              }}
              animate={code.length === i ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3, repeat: code.length === i ? Infinity : 0 }}
            >
              {code[i] || "·"}
            </motion.div>
          ))}
        </div>

        {/* Keyboard */}
        <div className="space-y-1.5">
          {keys.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1.5">
              {row.map((key) => (
                <motion.button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center text-gray-800"
                  style={{
                    background: "#F3F4F6",
                    boxShadow: "0 3px 0 #D1D5DB",
                  }}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95, y: 2, boxShadow: "0 1px 0 #D1D5DB" }}
                  disabled={code.length >= 6}
                >
                  {key}
                </motion.button>
              ))}
              {rowIndex === keys.length - 1 && (
                <motion.button
                  onClick={handleDelete}
                  className="w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center text-red-600"
                  style={{
                    background: "linear-gradient(180deg, #FEE2E2 0%, #FECACA 100%)",
                    boxShadow: "0 3px 0 #F87171",
                  }}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95, y: 2, boxShadow: "0 1px 0 #F87171" }}
                >
                  <Delete className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <GameModalFooter
          primaryLabel={loading ? "შესვლა..." : "შესვლა"}
          onPrimary={handleJoin}
          primaryIcon={<KeyRound className="w-5 h-5" />}
          isLoading={loading || code.length < 6}
          secondaryLabel="გაუქმება"
          onSecondary={onClose}
        />
      </div>
    </GameModal>
  );
}
