import { useState } from "react";
import { motion } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { KeyRound, Delete } from "lucide-react";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const { joinRoom, loading } = useMultiplayer();
  const [code, setCode] = useState("");

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
      await joinRoom(code);
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
      subtitle="შეიყვანე 6-ნიშნა კოდი"
      showSparkles
    >
      <div className="space-y-4 mt-2">
        {/* Code display */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-colors ${
                code[i] 
                  ? "bg-primary/10 border-primary text-foreground" 
                  : "bg-muted/50 border-border text-muted-foreground"
              }`}
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
                  className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-sm flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                  disabled={code.length >= 6}
                >
                  {key}
                </motion.button>
              ))}
              {rowIndex === keys.length - 1 && (
                <motion.button
                  onClick={handleDelete}
                  className="w-10 h-10 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold text-sm flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
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
