import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Settings } from "lucide-react";
import { LevelCircle } from "./LevelCircle";
import { PowerUpsBar } from "./PowerUpsBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function VideoAdventureMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("total_points")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          setTotalPoints(data.total_points || 0);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleAddPowerUp = () => {
    // Navigate to shop or open power-up purchase modal
    console.log("Open power-up shop");
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 0 }}
      >
        <source src="/videos/map-background.mp4" type="video/mp4" />
      </video>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between px-4 pt-12 pb-4"
        >
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(10px)",
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#7C3AED" }} />
          </button>

          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Settings className="w-5 h-5" style={{ color: "#7C3AED" }} />
          </button>
        </motion.div>

        {/* Center content - Level Circle */}
        <div className="flex-1 flex items-start justify-center pt-2">
          {!loading && <LevelCircle totalPoints={totalPoints} />}
        </div>

        {/* Bottom content - Power-ups bar */}
        <div className="pb-28">
          <PowerUpsBar onAddClick={handleAddPowerUp} />
        </div>
      </div>
    </div>
  );
}
