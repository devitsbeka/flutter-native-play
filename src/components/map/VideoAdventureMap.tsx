import { useEffect, useState, useRef, useCallback } from "react";
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
  const [videosReady, setVideosReady] = useState({ default: false, b: false, c: false });
  
  // Refs for all three video elements
  const videoDefaultRef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const videoCRef = useRef<HTMLVideoElement>(null);
  const transitioningRef = useRef(false);

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

  // Preload and prepare videos
  useEffect(() => {
    const videoB = videoBRef.current;
    const videoC = videoCRef.current;
    const videoDefault = videoDefaultRef.current;

    const prepareVideo = (video: HTMLVideoElement | null, key: 'default' | 'b' | 'c') => {
      if (!video) return;
      
      const handleCanPlay = () => {
        setVideosReady(prev => ({ ...prev, [key]: true }));
      };
      
      video.addEventListener('canplaythrough', handleCanPlay);
      
      // Pre-seek to start
      video.currentTime = 0;
      video.load();
      
      return () => video.removeEventListener('canplaythrough', handleCanPlay);
    };

    const cleanupDefault = prepareVideo(videoDefault, 'default');
    const cleanupB = prepareVideo(videoB, 'b');
    const cleanupC = prepareVideo(videoC, 'c');

    return () => {
      cleanupDefault?.();
      cleanupB?.();
      cleanupC?.();
    };
  }, []);

  // Seamless video transition using requestAnimationFrame
  const transitionToPhase = useCallback((newPhase: VideoPhase) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;

    const videoDefault = videoDefaultRef.current;
    const videoB = videoBRef.current;
    const videoC = videoCRef.current;

    if (!videoDefault || !videoB || !videoC) {
      transitioningRef.current = false;
      return;
    }

    // Get the target video
    const targetVideo = 
      newPhase === "default" ? videoDefault :
      newPhase === "video-b" ? videoB : videoC;

    // Pre-seek target video to start
    targetVideo.currentTime = 0;

    // Use RAF for frame-perfect switching
    requestAnimationFrame(() => {
      // Start playing target before switching opacity
      targetVideo.play().then(() => {
        // Immediate opacity switch - no transition delay
        setCurrentPhase(newPhase);
        
        // Pause other videos after switch
        requestAnimationFrame(() => {
          if (newPhase !== "default") videoDefault.pause();
          if (newPhase !== "video-b") videoB.pause();
          if (newPhase !== "video-c") videoC.pause();
          transitioningRef.current = false;
        });
      }).catch(() => {
        transitioningRef.current = false;
      });
    });
  }, []);

  // Start default video on mount
  useEffect(() => {
    const videoDefault = videoDefaultRef.current;
    if (videoDefault && videosReady.default) {
      videoDefault.play().catch(() => {});
    }
  }, [videosReady.default]);

  // Pre-buffer next video when approaching end
  const handleTimeUpdate = useCallback((video: HTMLVideoElement, nextVideo: HTMLVideoElement) => {
    if (video.duration && video.currentTime > video.duration - 0.3) {
      // Pre-seek and decode next video
      nextVideo.currentTime = 0;
      nextVideo.play().then(() => nextVideo.pause()).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const videoB = videoBRef.current;
    const videoC = videoCRef.current;

    if (!videoB || !videoC) return;

    const handleBTimeUpdate = () => handleTimeUpdate(videoB, videoC);
    
    videoB.addEventListener('timeupdate', handleBTimeUpdate);
    
    return () => {
      videoB.removeEventListener('timeupdate', handleBTimeUpdate);
    };
  }, [handleTimeUpdate]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleAddPowerUp = () => {
    console.log("Open power-up shop");
  };

  // Trigger video sequence when level circle is clicked
  const handleLevelCircleClick = () => {
    if (currentPhase !== "default" || transitioningRef.current) return;
    transitionToPhase("video-b");
  };

  // Handle video B ended - transition to video C
  const handleVideoBEnded = () => {
    transitionToPhase("video-c");
  };

  // Handle video C ended - transition back to default
  const handleVideoCEnded = () => {
    transitionToPhase("default");
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
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            zIndex: 0,
            opacity: currentPhase === "default" ? 1 : 0,
            visibility: currentPhase === "default" ? "visible" : "hidden",
          }}
        >
          <source src={MAP_VIDEOS.default} type="video/mp4" />
        </video>

        {/* Video B (plays once) */}
        <video
          ref={videoBRef}
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoBEnded}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            zIndex: 0,
            opacity: currentPhase === "video-b" ? 1 : 0,
            visibility: currentPhase === "video-b" ? "visible" : "hidden",
          }}
        >
          <source src={MAP_VIDEOS.videoB} type="video/mp4" />
        </video>

        {/* Video C (plays once) */}
        <video
          ref={videoCRef}
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoCEnded}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            zIndex: 0,
            opacity: currentPhase === "video-c" ? 1 : 0,
            visibility: currentPhase === "video-c" ? "visible" : "hidden",
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
