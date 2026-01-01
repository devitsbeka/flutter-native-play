import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { PowerUpsBar } from "./PowerUpsBar";
import { AdventureQuickActions } from "./AdventureQuickActions";
import { AdventureHelpModal } from "./AdventureHelpModal";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { MAP_VIDEOS } from "@/components/game/VideoPreloader";
import { DailyRewardsModal } from "@/components/home/DailyRewardsModal";
import { MissionsModal } from "@/components/home/MissionsModal";
import { ChestRewardModal } from "@/components/home/ChestRewardModal";
import { LevelInfoModal } from "@/components/home/LevelInfoModal";
import { calculateLevel } from "@/utils/levelCalculation";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
type VideoPhase = "default" | "video-b" | "video-c";

export function VideoAdventureMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<VideoPhase>("default");
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [showChestModal, setShowChestModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [videosReady, setVideosReady] = useState({ default: false, b: false, c: false });
  const { coins, gems } = useCurrency();
  
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

  // Unlock videos on first user interaction (iOS requirement)
  useEffect(() => {
    const unlockVideos = () => {
      [videoDefaultRef, videoBRef, videoCRef].forEach(ref => {
        const video = ref.current;
        if (video) {
          video.play().then(() => {
            if (ref !== videoDefaultRef) video.pause();
          }).catch(() => {});
        }
      });
    };
    
    document.addEventListener('touchstart', unlockVideos, { once: true });
    document.addEventListener('click', unlockVideos, { once: true });
    
    return () => {
      document.removeEventListener('touchstart', unlockVideos);
      document.removeEventListener('click', unlockVideos);
    };
  }, []);

  // Resume video when app comes back to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentVideo = 
          currentPhase === "default" ? videoDefaultRef.current :
          currentPhase === "video-b" ? videoBRef.current :
          videoCRef.current;
        
        if (currentVideo && currentVideo.paused) {
          currentVideo.currentTime = currentVideo.currentTime; // Force re-sync
          currentVideo.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle page focus for additional coverage
    const handleFocus = () => {
      const currentVideo = 
        currentPhase === "default" ? videoDefaultRef.current :
        currentPhase === "video-b" ? videoBRef.current :
        videoCRef.current;
      
      if (currentVideo && currentVideo.paused) {
        currentVideo.play().catch(() => {});
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentPhase]);

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
        // Fallback: switch anyway if play fails
        setCurrentPhase(newPhase);
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

  // Pre-buffer Video C when Video B reaches 50% - and use timeupdate for transition
  useEffect(() => {
    const videoB = videoBRef.current;
    const videoC = videoCRef.current;

    if (!videoB || !videoC) return;

    let preBuffered = false;

    const handleBTimeUpdate = () => {
      if (!videoB.duration) return;
      
      // Pre-buffer Video C when B is at 50%
      if (videoB.currentTime > videoB.duration * 0.5 && !preBuffered) {
        preBuffered = true;
        videoC.currentTime = 0;
        videoC.load();
        // Pre-warm by playing briefly
        videoC.play().then(() => videoC.pause()).catch(() => {});
      }
      
      // Transition 100ms before end (more buffer than 50ms)
      if (videoB.currentTime >= videoB.duration - 0.1 && !transitioningRef.current) {
        if (videoC.readyState >= 3) { // HAVE_FUTURE_DATA
          transitionToPhase("video-c");
        }
      }
    };
    
    videoB.addEventListener('timeupdate', handleBTimeUpdate);
    
    return () => {
      videoB.removeEventListener('timeupdate', handleBTimeUpdate);
    };
  }, [transitionToPhase]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleAddPowerUp = () => {
    navigate("/power-ups");
  };

  // Trigger video sequence when level circle is clicked
  const handleLevelCircleClick = () => {
    if (currentPhase !== "default" || transitioningRef.current) return;
    transitionToPhase("video-b");
  };

  // Fallback: Handle video B ended - transition to video C
  const handleVideoBEnded = () => {
    if (!transitioningRef.current) {
      transitionToPhase("video-c");
    }
  };

  // Handle video C ended - transition back to default
  const handleVideoCEnded = () => {
    transitionToPhase("default");
  };

  // Common video attributes for iOS/Safari/mobile compatibility
  const videoAttributes = {
    muted: true,
    playsInline: true,
    preload: "auto" as const,
    disablePictureInPicture: true,
    disableRemotePlayback: true,
    controls: false,
    // iOS specific attributes
    "webkit-playsinline": "true",
    "x5-playsinline": "true",
    "x5-video-player-type": "h5",
    "x5-video-player-fullscreen": "false",
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
          {...videoAttributes}
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
          {...videoAttributes}
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
          {...videoAttributes}
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
        {/* Header with currency display */}
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

          {/* Currency Display */}
          <div className="flex items-center gap-2">
            {/* Coins */}
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <img src={coinIcon} alt="Coins" className="w-5 h-5" />
              <span className="text-sm font-bold" style={{ color: "#b45309" }}>
                {coins.toLocaleString()}
              </span>
            </div>
            
            {/* Gems */}
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <img src={gemIcon} alt="Gems" className="w-5 h-5" />
              <span className="text-sm font-bold" style={{ color: "#7c3aed" }}>
                {gems.toLocaleString()}
              </span>
            </div>
            
            {/* XP */}
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <span className="text-sm font-bold" style={{ color: "#7c3aed" }}>
                {totalPoints.toLocaleString()} XP
              </span>
            </div>
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <HelpCircle className="w-5 h-5" style={{ color: "#7C3AED" }} />
          </button>
        </motion.div>

        {/* Quick Actions - Below Header */}
        <div className="px-4 py-2">
          <AdventureQuickActions
            onGiftsClick={() => setShowGiftsModal(true)}
            onMissionsClick={() => setShowMissionsModal(true)}
            onChestClick={() => setShowChestModal(true)}
            onXPClick={() => setShowLevelModal(true)}
            onLevelClick={() => setShowLevelModal(true)}
            totalXP={totalPoints}
            level={calculateLevel(totalPoints).level}
          />
        </div>

        {/* Center content - Empty spacer */}
        <div className="flex-1" />

        {/* Bottom content - Power-ups bar */}
        <div className="pb-[155px]">
          {/* Power-ups Bar */}
          <PowerUpsBar onAddClick={handleAddPowerUp} />
        </div>
      </div>

      {/* Modals */}
      <DailyRewardsModal
        isOpen={showGiftsModal}
        onClose={() => setShowGiftsModal(false)}
        currentStreak={1}
      />
      
      <MissionsModal
        isOpen={showMissionsModal}
        onClose={() => setShowMissionsModal(false)}
      />
      
      <ChestRewardModal
        isOpen={showChestModal}
        onClose={() => setShowChestModal(false)}
        onClaim={() => setShowChestModal(false)}
      />
      
      <LevelInfoModal
        isOpen={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        levelInfo={calculateLevel(totalPoints)}
        onContinue={() => {
          setShowLevelModal(false);
          navigate("/game");
        }}
      />

      <AdventureHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
