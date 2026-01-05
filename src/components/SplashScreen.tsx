import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import splashBackground from '@/assets/splash-background.png';
import logoImage from '@/assets/logo-worldquizzes.png';
import { 
  onVideosLoaded, 
  areVideosLoaded, 
  onVideoLoadProgress, 
  offVideoLoadProgress,
  getVideoLoadProgress,
  VideoLoadProgress 
} from '@/components/game/VideoPreloader';
import { preloadCategoryIcons } from '@/hooks/useCategoryIconResolver';
import { CATEGORY_ICON_KEYWORDS } from '@/data/categoryIconKeywords';

interface SplashScreenProps {
  children: ReactNode;
}

export function SplashScreen({ children }: SplashScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [videosReady, setVideosReady] = useState(areVideosLoaded());
  const [videoProgress, setVideoProgress] = useState<VideoLoadProgress>(getVideoLoadProgress());

  // Preload splash images before starting the loading animation
  useEffect(() => {
    const bgImage = new Image();
    const logoImg = new Image();
    let loadedCount = 0;

    const onLoad = () => {
      loadedCount++;
      if (loadedCount === 2) {
        setImagesLoaded(true);
      }
    };

    bgImage.onload = onLoad;
    logoImg.onload = onLoad;
    bgImage.src = splashBackground;
    logoImg.src = logoImage;
  }, []);

  // Preload all category icons using the resolver (searches 9k library)
  useEffect(() => {
    const categoryIds = Object.keys(CATEGORY_ICON_KEYWORDS);
    
    preloadCategoryIcons(categoryIds)
      .then(() => {
        setIconsLoaded(true);
      })
      .catch(() => {
        setIconsLoaded(true); // Don't block on errors
      });

    // Fallback timeout
    const timeout = setTimeout(() => {
      setIconsLoaded(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  // Listen for video preloading progress and completion
  useEffect(() => {
    if (areVideosLoaded()) {
      setVideosReady(true);
      setVideoProgress({ loaded: 1, total: 1, percentage: 100, currentVideo: '' });
      return;
    }
    
    const handleProgress = (progress: VideoLoadProgress) => {
      setVideoProgress(progress);
    };
    
    onVideoLoadProgress(handleProgress);
    onVideosLoaded(() => {
      setVideosReady(true);
    });

    return () => {
      offVideoLoadProgress(handleProgress);
    };
  }, []);

  // Complete loading when all assets are ready
  useEffect(() => {
    if (imagesLoaded && iconsLoaded && videosReady) {
      // Small delay for smooth transition
      setTimeout(() => setIsLoading(false), 400);
    }
  }, [imagesLoaded, iconsLoaded, videosReady]);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[SplashScreen] Fallback timeout triggered');
        setIsLoading(false);
      }
    }, 30000); // 30 second maximum

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Calculate combined progress (icons + videos)
  const combinedProgress = videosReady 
    ? 100 
    : Math.min(99, videoProgress.percentage);

  return (
    <>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${splashBackground})` }}
            />
            
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 bg-black/40" />
            
            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center px-8 w-full max-w-lg">
              {/* Logo with fade-in and float animation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                }}
                transition={{ 
                  delay: 0.3, 
                  duration: 0.6, 
                  ease: [0.34, 1.56, 0.64, 1] // Spring-like bounce
                }}
                className="mb-16"
              >
                <motion.img
                  src={logoImage}
                  alt="MyTrivia"
                  className="w-64 md:w-80 h-auto drop-shadow-2xl"
                  animate={{ 
                    y: [0, -8, 0],
                  }}
                  transition={{
                    delay: 1,
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              </motion.div>

              {/* Loading Bar Container */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="w-full"
              >
                {/* Chunky 3D Loading Bar */}
                <div className="relative">
                  {/* Bar background with 3D depth */}
                  <div 
                    className="relative h-8 rounded-xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(180deg, hsl(220 15% 15%) 0%, hsl(220 15% 25%) 100%)',
                      boxShadow: `
                        inset 0 4px 8px rgba(0,0,0,0.5),
                        inset 0 -2px 4px rgba(255,255,255,0.05),
                        0 4px 12px rgba(0,0,0,0.4),
                        0 8px 24px rgba(0,0,0,0.3)
                      `,
                      border: '3px solid hsl(220 15% 30%)',
                    }}
                  >
                    {/* Progress fill */}
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-lg"
                      initial={{ width: '0%' }}
                      animate={{ width: `${combinedProgress}%` }}
                      transition={{ duration: 0.2, ease: 'linear' }}
                      style={{
                        background: 'linear-gradient(180deg, hsl(45 100% 60%) 0%, hsl(40 100% 50%) 50%, hsl(35 100% 45%) 100%)',
                        boxShadow: `
                          inset 0 3px 6px rgba(255,255,255,0.4),
                          inset 0 -2px 4px rgba(0,0,0,0.2),
                          0 0 20px rgba(255,180,50,0.3)
                        `,
                      }}
                    >
                      {/* Shine sweep effect */}
                      <motion.div
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                        }}
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          repeatDelay: 0.5
                        }}
                      />
                      
                      {/* Top highlight for 3D effect */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-2 rounded-t-lg"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
                        }}
                      />
                    </motion.div>

                    {/* Bar end caps for extra 3D feel */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                      style={{ background: 'rgba(0,0,0,0.2)' }}
                    />
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-1 rounded-r-lg"
                      style={{ background: 'rgba(0,0,0,0.2)' }}
                    />
                  </div>

                  {/* Progress display with video count */}
                  <motion.div
                    className="mt-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <span 
                      className="text-3xl font-bold tracking-wider"
                      style={{
                        fontFamily: "'TASolivare', sans-serif",
                        color: 'hsl(45 100% 70%)',
                        textShadow: `
                          0 2px 4px rgba(0,0,0,0.5),
                          0 0 20px rgba(255,200,100,0.3)
                        `,
                      }}
                    >
                      {combinedProgress}%
                    </span>
                    
                    {/* Video count indicator */}
                    {videoProgress.total > 0 && !videosReady && (
                      <div 
                        className="mt-1 text-sm font-medium"
                        style={{
                          color: 'hsl(0 0% 80%)',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}
                      >
                        {videoProgress.loaded}/{videoProgress.total} ვიდეო
                      </div>
                    )}
                  </motion.div>

                  {/* Loading text */}
                  <motion.p
                    className="mt-3 text-center text-lg font-medium tracking-wide"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ 
                      delay: 0.7, 
                      duration: 1.5, 
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    style={{
                      color: 'hsl(0 0% 90%)',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    იტვირთება...
                  </motion.p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main app content - always rendered for smooth transition */}
      <div className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
        {children}
      </div>
    </>
  );
}
