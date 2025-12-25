import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import { ChunkyButton } from "@/components/ui/chunky-button";

// Power-up assets
import fiftyFiftyImg from "@/assets/powers/5050.png";
import freezeImg from "@/assets/powers/freeze.png";
import replaceImg from "@/assets/powers/replace.png";
import timeDrainImg from "@/assets/powers/time-drain.png";
import addPowerImg from "@/assets/powers/add-power.png";

export type PowerUpType = "fifty-fifty" | "freeze" | "replace" | "time-drain" | "add-power";

interface PowerUpDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: PowerUpType;
}

const powerUpAssets: Record<PowerUpType, string> = {
  "fifty-fifty": fiftyFiftyImg,
  "freeze": freezeImg,
  "replace": replaceImg,
  "time-drain": timeDrainImg,
  "add-power": addPowerImg,
};

const powerUpGradients: Record<PowerUpType, { from: string; to: string; glow: string }> = {
  "fifty-fifty": { from: "#E85C3A", to: "#FFB347", glow: "rgba(232,92,58,0.4)" },
  "freeze": { from: "#1C8CA8", to: "#95EBE9", glow: "rgba(28,140,168,0.4)" },
  "replace": { from: "#1CA88C", to: "#95EBD4", glow: "rgba(28,168,140,0.4)" },
  "time-drain": { from: "#7B4BBF", to: "#C9A8E9", glow: "rgba(123,75,191,0.4)" },
  "add-power": { from: "#5BA81C", to: "#B5EB95", glow: "rgba(91,168,28,0.4)" },
};

const powerUpTranslationKeys: Record<PowerUpType, string> = {
  "fifty-fifty": "fiftyFifty",
  "freeze": "freeze",
  "replace": "replace",
  "time-drain": "timeDrain",
  "add-power": "addPower",
};

// Sparkle particle inside the badge
const BadgeSparkle = ({ index, gradient }: { index: number; gradient: { from: string; to: string } }) => {
  const angle = Math.random() * 360;
  const radius = 20 + Math.random() * 40;
  const duration = 1.5 + Math.random() * 1.5;
  const delay = Math.random() * 2;
  const size = 3 + Math.random() * 4;
  
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        marginLeft: -size / 2,
        marginTop: -size / 2,
        background: `radial-gradient(circle, ${gradient.to} 0%, transparent 70%)`,
        boxShadow: `0 0 ${size * 2}px ${gradient.from}`,
      }}
      animate={{
        x: [
          Math.cos((angle * Math.PI) / 180) * (radius * 0.5),
          Math.cos(((angle + 180) * Math.PI) / 180) * radius,
          Math.cos((angle * Math.PI) / 180) * (radius * 0.5),
        ],
        y: [
          Math.sin((angle * Math.PI) / 180) * (radius * 0.5),
          Math.sin(((angle + 180) * Math.PI) / 180) * radius,
          Math.sin((angle * Math.PI) / 180) * (radius * 0.5),
        ],
        opacity: [0, 1, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

export function PowerUpDetailModal({ isOpen, onClose, type }: PowerUpDetailModalProps) {
  const imageSrc = powerUpAssets[type];
  const gradient = powerUpGradients[type];
  const translationKey = powerUpTranslationKeys[type];
  
  const sparkles = Array.from({ length: 12 }, (_, i) => i);
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xs overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,255,0.98) 100%)",
            boxShadow: `0 25px 50px -12px rgba(0,0,0,0.25), 0 0 60px ${gradient.glow}`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Content */}
          <div className="p-8 flex flex-col items-center">
            {/* Large badge with sparkles */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            >
              {/* Outer glow */}
              <motion.div
                className="absolute inset-[-20px] rounded-full"
                style={{
                  background: `radial-gradient(circle, ${gradient.glow} 0%, transparent 70%)`,
                }}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              {/* Badge container with gradient ring */}
              <div
                className="relative w-32 h-32 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
                  padding: 6,
                }}
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,248,255,0.95) 100%)",
                  }}
                >
                  <motion.img
                    src={imageSrc}
                    alt={type}
                    className="w-20 h-20 object-contain drop-shadow-lg"
                    animate={{
                      y: [0, -3, 0],
                      rotate: [0, 2, -2, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
              
              {/* Sparkle particles */}
              {sparkles.map((i) => (
                <BadgeSparkle key={i} index={i} gradient={gradient} />
              ))}
            </motion.div>
            
            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-2xl font-bold text-foreground mb-3"
              style={{
                background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {t(`powerups.${translationKey}.name`)}
            </motion.h2>
            
            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center text-muted-foreground mb-2"
            >
              {t(`powerups.${translationKey}.description`)}
            </motion.p>
            
            {/* Hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-sm text-muted-foreground/70 italic mb-6"
            >
              💡 {t(`powerups.${translationKey}.hint`)}
            </motion.p>
            
            {/* Got it button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full"
            >
              <ChunkyButton
                variant="primary"
                size="lg"
                onClick={onClose}
                className="w-full"
              >
                {t("common.gotIt")}
              </ChunkyButton>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
