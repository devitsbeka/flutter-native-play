import { motion } from 'framer-motion';
import splashBackground from '@/assets/loading-bg.png';

export default function Loading() {
  const progress = 69;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-bottom bg-no-repeat"
        style={{ backgroundImage: `url(${splashBackground})` }}
      />
      
      {/* Gradient overlay for better text visibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 w-full max-w-lg">
        {/* MyTrivia Logo with LIVE badge */}
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
            ease: [0.34, 1.56, 0.64, 1]
          }}
          className="mb-16"
        >
          <motion.div
            className="flex items-center justify-center"
            animate={{ 
              y: [0, -8, 0],
            }}
            transition={{
              delay: 1,
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            {/* MyTrivia Text */}
            <span 
              className="text-4xl md:text-6xl font-slackey text-white tracking-tight"
              style={{
                textShadow: `
                  0 4px 8px rgba(0,0,0,0.4),
                  0 8px 24px rgba(0,0,0,0.3)
                `,
              }}
            >
              MyTrivia
            </span>
            
            {/* Large LIVE Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="ml-3"
            >
              <span 
                className="relative inline-flex items-center px-3 py-1.5 rounded-lg text-base font-bold uppercase tracking-wider text-white"
                style={{
                  background: '#EF4444',
                  boxShadow: '0 4px 0 #B91C1C, 0 6px 12px rgba(0,0,0,0.25)',
                }}
              >
                {/* Blinking dot */}
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-2.5 h-2.5 rounded-full bg-white mr-2"
                />
                LIVE
              </span>
            </motion.span>
          </motion.div>
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
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  background: 'linear-gradient(180deg, hsl(270 80% 65%) 0%, hsl(265 85% 55%) 50%, hsl(260 90% 45%) 100%)',
                  boxShadow: `
                    inset 0 3px 6px rgba(255,255,255,0.4),
                    inset 0 -2px 4px rgba(0,0,0,0.2),
                    0 0 20px rgba(150,100,255,0.3)
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

            {/* Progress display */}
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
                  color: 'hsl(270 100% 80%)',
                  textShadow: `
                    0 2px 4px rgba(0,0,0,0.5),
                    0 0 20px rgba(180,150,255,0.3)
                  `,
                }}
              >
                {progress}%
              </span>
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
    </div>
  );
}