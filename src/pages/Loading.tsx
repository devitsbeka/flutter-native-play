import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Grid3X3, Users, Trophy, Zap, Globe } from 'lucide-react';
// Same world-landmarks artwork the rating board uses
import splashBackground from '@/assets/bgleader-global.webp';
import { MyTriviaLiveLogo } from '@/components/shared/MyTriviaLiveLogo';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Loading() {
  const { t } = useLanguage();
  const progress = 69;
  const [featureIndex, setFeatureIndex] = useState(0);

  const FEATURES = [
    { icon: Tv, text: t("extra.tvModeFeature") },
    { icon: Grid3X3, text: t("extra.categoriesFeature") },
    { icon: Users, text: t("extra.realtimeFeature") },
    { icon: Trophy, text: t("extra.weeklyFeature") },
    { icon: Zap, text: t("extra.dailyFeature") },
    { icon: Globe, text: t("extra.playersFeature") },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image — centered so phones crop to the trophies in the
          middle of the 16:9 artwork and wide screens show it whole */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${splashBackground})`, backgroundColor: '#bcabee' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Centred scrim so the white logo and progress text stay readable over
          the bright gold trophy in the middle of the artwork */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side at 50% 46%, rgba(35,18,66,0.62) 0%, rgba(35,18,66,0.42) 60%, rgba(35,18,66,0) 100%)',
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-16"
        >
          <motion.div
            className="flex items-center justify-center"
            animate={{ y: [0, -8, 0] }}
            transition={{ delay: 1, duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MyTriviaLiveLogo size="lg" textColor="light" />
          </motion.div>
        </motion.div>

        {/* Loading Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="w-full"
        >
          <div className="relative">
            <div 
              className="relative h-8 rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)',
                border: '3px solid rgba(255,255,255,0.9)',
              }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-lg"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  background: 'linear-gradient(180deg, hsl(270 80% 65%) 0%, hsl(265 85% 55%) 50%, hsl(260 90% 45%) 100%)',
                  boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 20px rgba(150,100,255,0.3)',
                }}
              >
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-white"
                    style={{ left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%`, boxShadow: '0 0 4px 1px rgba(255,255,255,0.8)' }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 0.8 + (i * 0.15), repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                  />
                ))}
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
                />
                <div className="absolute top-0 left-0 right-0 h-2 rounded-t-lg" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)' }} />
              </motion.div>
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: 'rgba(0,0,0,0.2)' }} />
              <div className="absolute right-0 top-0 bottom-0 w-1 rounded-r-lg" style={{ background: 'rgba(0,0,0,0.2)' }} />
            </div>

            <motion.div className="mt-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <span className="text-3xl font-bold tracking-wider" style={{ fontFamily: "'TASolivare', sans-serif", color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.3)' }}>
                {progress}%
              </span>
            </motion.div>

            <motion.p
              className="mt-3 text-center text-lg font-medium tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ delay: 0.7, duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ color: 'hsl(0 0% 90%)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >
              {t("common.loading")}
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Feature Carousel */}
      <motion.div
        className="absolute bottom-8 left-4 right-4 z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div 
          className="mx-auto max-w-md px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(12px)', borderRadius: '22px', border: '1px solid rgba(255, 255, 255, 0.2)' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={featureIndex}
              className="flex items-center gap-3 w-full"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {(() => {
                const Feature = FEATURES[featureIndex];
                const IconComponent = Feature.icon;
                return (
                  <>
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white/90 text-sm font-medium leading-snug">{Feature.text}</p>
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
