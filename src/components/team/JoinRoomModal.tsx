import { useState } from "react";
import { motion } from "framer-motion";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { KeyRound, Delete } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const { enterRoom, loading } = useMultiplayerV2();
  const { t } = useLanguage();
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
      title={t("extra.joinRoomTitle")}
      subtitle={t("extra.enterCodeSubtitle")}
      showSparkles
    >
      <div className="space-y-4 mt-2">
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
          primaryLabel={loading ? t("extra.joiningBtn") : t("extra.joinBtn")}
          onPrimary={handleJoin}
          primaryIcon={<KeyRound className="w-5 h-5" />}
          isLoading={loading || code.length < 6}
          secondaryLabel={t("common.cancel")}
          onSecondary={onClose}
        />
      </div>
    </GameModal>
  );
}
