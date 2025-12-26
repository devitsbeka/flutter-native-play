import { motion } from "framer-motion";
import { Plus } from "lucide-react";

// Import power-up images
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import powerTimeDrain from "@/assets/powers/time-drain.png";

interface PowerUp {
  id: string;
  name: string;
  image: string;
  quantity: number;
  ringColor: string;
}

interface PowerUpsBarProps {
  powerUps?: Record<string, number>;
  onAddClick?: () => void;
}

export function PowerUpsBar({ powerUps = {}, onAddClick }: PowerUpsBarProps) {
  const powers: PowerUp[] = [
    {
      id: "5050",
      name: "50/50",
      image: power5050,
      quantity: powerUps["5050"] || 2,
      ringColor: "linear-gradient(135deg, #F97316, #EF4444)",
    },
    {
      id: "freeze",
      name: "გაყინვა",
      image: powerFreeze,
      quantity: powerUps["freeze"] || 1,
      ringColor: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
    },
    {
      id: "replace",
      name: "შეცვლა",
      image: powerReplace,
      quantity: powerUps["replace"] || 3,
      ringColor: "linear-gradient(135deg, #14B8A6, #0D9488)",
    },
    {
      id: "time-drain",
      name: "დრო",
      image: powerTimeDrain,
      quantity: powerUps["time-drain"] || 0,
      ringColor: "linear-gradient(135deg, #6B7280, #4B5563)",
    },
  ];

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="w-full px-6"
    >
      {/* Title */}
      <h3 
        className="text-center font-display text-lg mb-4"
        style={{ color: "#7C3AED" }}
      >
        შენი ძალები
      </h3>
      
      {/* Power-ups row */}
      <div 
        className="flex items-center justify-center gap-4 p-4 rounded-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
        }}
      >
        {powers.map((power, index) => (
          <motion.div
            key={power.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="relative"
          >
            {/* Ring container */}
            <div
              className="w-14 h-14 rounded-full p-0.5 flex items-center justify-center"
              style={{ background: power.ringColor }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
                style={{ background: "rgba(255, 255, 255, 0.95)" }}
              >
                <img
                  src={power.image}
                  alt={power.name}
                  className="w-8 h-8 object-contain"
                />
              </div>
            </div>
            
            {/* Quantity badge */}
            {power.quantity > 0 && (
              <div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "#EF4444" }}
              >
                {power.quantity}
              </div>
            )}
          </motion.div>
        ))}
        
        {/* Add button */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={onAddClick}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #22C55E, #16A34A)",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-7 h-7 text-white" />
        </motion.button>
      </div>
    </motion.div>
  );
}
