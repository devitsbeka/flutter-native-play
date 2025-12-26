import { motion } from "framer-motion";
import { PowerUpBadge, PowerUpType } from "@/components/game/PowerUpBadge";

interface PowerUpsBarProps {
  powerUps?: Record<string, number>;
  onAddClick?: () => void;
}

// Map from our internal IDs to PowerUpBadge types
const typeMap: Record<string, PowerUpType> = {
  "5050": "fifty-fifty",
  "freeze": "freeze",
  "replace": "replace",
  "time-drain": "time-drain",
};

export function PowerUpsBar({ powerUps = {}, onAddClick }: PowerUpsBarProps) {
  const powers = [
    { id: "5050", quantity: powerUps["5050"] || 2 },
    { id: "freeze", quantity: powerUps["freeze"] || 1 },
    { id: "replace", quantity: powerUps["replace"] || 3 },
    { id: "time-drain", quantity: powerUps["time-drain"] || 0 },
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
        className="text-left font-display text-lg mb-4"
        style={{ color: "#7C3AED" }}
      >
        შენი ძალები
      </h3>
      
      {/* Power-ups row */}
      <div 
        className="flex items-center justify-center gap-3"
        style={{ marginTop: "-10px" }}
      >
        {powers.map((power, index) => (
          <PowerUpBadge
            key={power.id}
            type={typeMap[power.id]}
            size="sm"
            index={index}
            count={power.quantity}
            disabled={power.quantity === 0}
          />
        ))}
        
        {/* Add button */}
        <PowerUpBadge
          type="add-power"
          size="sm"
          index={4}
          onClick={onAddClick}
        />
      </div>
    </motion.div>
  );
}
