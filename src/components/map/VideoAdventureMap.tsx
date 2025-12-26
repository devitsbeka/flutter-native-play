import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Settings } from "lucide-react";
import { LevelCircle } from "./LevelCircle";
import { PowerUpsBar } from "./PowerUpsBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MAP_VIDEOS } from "@/components/game/VideoPreloader";

type VideoPhase = "default" | "video-b" | "video-c";

export function VideoAdventureMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<VideoPhase>("default");
  
  // Refs for all three video elements
  const videoDefaultRef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const videoCRef = useRef<HTMLVideoElement>(null);

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

  // Video playback control based on phase
  useEffect(() => {
    const videoDefault = videoDefaultRef.current;
    const videoB = videoBRef.current;
    const videoC = videoCRef.current;

    if (!videoDefault || !videoB || !videoC) return;

    // Pause all videos first
    videoDefault.pause();
    videoB.pause();
    videoC.pause();

    // Play the active video
    switch (currentPhase) {
      case "default":
        videoDefault.currentTime = 0;
        videoDefault.play().catch(() => {});
        break;
      case "video-b":
        videoB.currentTime = 0;
        videoB.play().catch(() => {});
        break;
      case "video-c":
        videoC.currentTime = 0;
        videoC.play().catch(() => {});
        break;
    }
  }, [currentPhase]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleAddPowerUp = () => {
    console.log("Open power-up shop");
  };

  // Trigger video sequence when level circle is clicked
  const handleLevelCircleClick = () => {
    if (currentPhase !== "default") return; // Prevent triggering during sequence
    setCurrentPhase("video-b");
  };

  // Handle video B ended - transition to video C
  const handleVideoBEnded = () => {
    setCurrentPhase("video-c");
  };

  // Handle video C ended - transition back to default
  const handleVideoCEnded = () => {
    setCurrentPhase("default");
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      {/* Video Background Container - All 3 videos always mounted */}
      <div className="absolute inset-0 w-full h-full">
        {/* Default Video (looping) */}
        <video
          ref={videoDefaultRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            zIndex: 0,
            opacity: currentPhase === "default" ? 1 : 0,
            transition: "opacity 300ms linear",
          }}
        >
          <source src={MAP_VIDEOS.default} type="video/mp4" />
        </video>

        {/* Video B (plays once) */}
        <video
          ref={videoBRef}
          muted
          playsInline
          onEnded={handleVideoBEnded}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            zIndex: 0,
            opacity: currentPhase === "video-b" ? 1 : 0,
            transition: "opacity 300ms linear",
          }}
        >
          <source src={MAP_VIDEOS.videoB} type="video/mp4" />
        </video>

        {/* Video C (plays once) */}
        <video
          ref={videoCRef}
          muted
          playsInline
          onEnded={handleVideoCEnded}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            zIndex: 0,
            opacity: currentPhase === "video-c" ? 1 : 0,
            transition: "opacity 300ms linear",
          }}
        >
          <source src={MAP_VIDEOS.videoC} type="video/mp4" />
        </video>
      </div>

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
        <div className="flex-1 flex items-start justify-center -mt-4">
          {!loading && (
            <LevelCircle 
              totalPoints={totalPoints} 
              onClick={handleLevelCircleClick}
            />
          )}
        </div>

        {/* Bottom content - Power-ups bar */}
        <div className="pb-[155px]">
          <PowerUpsBar onAddClick={handleAddPowerUp} />
        </div>
      </div>
    </div>
  );
}
