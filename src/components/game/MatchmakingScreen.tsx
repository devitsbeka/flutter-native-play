import { motion } from "framer-motion";

export function MatchmakingScreen() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f23]">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Central hourglass animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Outer glow rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              style={{
                width: 200 + i * 40,
                height: 200 + i * 40,
                left: -(i * 20),
                top: -(i * 20),
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Hourglass container */}
          <motion.div
            className="relative w-[200px] h-[200px] flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Hourglass shape */}
            <div className="relative w-24 h-32">
              {/* Top triangle */}
              <div 
                className="absolute top-0 left-0 right-0 h-16 overflow-hidden"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/40"
                  animate={{
                    y: [0, 64],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <div className="absolute inset-0 border-2 border-primary/60" 
                  style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} 
                />
              </div>

              {/* Bottom triangle */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden"
                style={{
                  clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-primary/80 to-primary/40"
                  initial={{ y: 64 }}
                  animate={{
                    y: [64, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <div className="absolute inset-0 border-2 border-primary/60" 
                  style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }} 
                />
              </div>

              {/* Sand particles falling */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-primary rounded-full"
                    animate={{
                      y: [-8, 8],
                      opacity: [1, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "linear",
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Orbiting dots */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/50"
              style={{
                top: "50%",
                left: "50%",
              }}
              animate={{
                x: [
                  Math.cos((i * Math.PI) / 2) * 120,
                  Math.cos((i * Math.PI) / 2 + Math.PI * 2) * 120,
                ],
                y: [
                  Math.sin((i * Math.PI) / 2) * 120,
                  Math.sin((i * Math.PI) / 2 + Math.PI * 2) * 120,
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      </div>

      {/* Text overlay */}
      <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-4">
        <motion.h2
          className="text-2xl font-bold text-white"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Finding Opponent
        </motion.h2>
        
        {/* Bouncing dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}