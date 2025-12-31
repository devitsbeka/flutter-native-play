import { motion } from "framer-motion";
import { PowerUpBadge, PowerUpType } from "@/components/game/PowerUpBadge";
import { useUserPowerUps, PowerUpType as UserPowerUpType } from "@/hooks/useUserPowerUps";

interface PowerUpsBarProps {
  onAddClick?: () => void;
}

// Map from our internal IDs to PowerUpBadge types
const typeMap: Record<UserPowerUpType, PowerUpType> = {
  "5050": "fifty-fifty",
  "freeze": "freeze",
  "replace": "replace",
  "time-drain": "time-drain",
};

const powerUpOrder: UserPowerUpType[] = ["5050", "freeze", "replace", "time-drain"];

export function PowerUpsBar({ onAddClick }: PowerUpsBarProps) {
  const { powerUps, isLoading } = useUserPowerUps();

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
        style={{ marginTop: "30px" }}
      >
        {powerUpOrder.map((id, index) => (
          <PowerUpBadge
            key={id}
            type={typeMap[id]}
            size="sm"
            index={index}
            count={isLoading ? 0 : powerUps[id]}
            disabled={powerUps[id] === 0}
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
