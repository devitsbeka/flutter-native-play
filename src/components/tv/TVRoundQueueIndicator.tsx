import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface TVRoundQueueIndicatorProps {
  currentRound: number;
  totalRounds: number;
  className?: string;
}

/**
 * Mini queue indicator showing remaining rounds as dots/pills
 * Displayed on the side of the screen during TV gameplay
 */
export const TVRoundQueueIndicator: React.FC<TVRoundQueueIndicatorProps> = ({
  currentRound,
  totalRounds,
  className = '',
}) => {
  const { t } = useLanguage();
  // Only show if there are multiple rounds
  if (totalRounds <= 1) return null;

  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className={`flex flex-col items-center gap-1.5 ${className}`}
    >
      {rounds.map((round) => {
        const isCompleted = round < currentRound;
        const isCurrent = round === currentRound;
        const isUpcoming = round > currentRound;

        return (
          <motion.div
            key={round}
            className={`
              relative flex items-center justify-center
              transition-all duration-300
              ${isCurrent 
                ? 'w-8 h-8 rounded-lg bg-white/30 border-2 border-white shadow-lg' 
                : 'w-3 h-3 rounded-full'
              }
              ${isCompleted ? 'bg-green-400/80' : ''}
              ${isUpcoming ? 'bg-white/20 border border-white/30' : ''}
            `}
            initial={isCurrent ? { scale: 0.8 } : {}}
            animate={isCurrent ? { 
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 10px rgba(255,255,255,0.3)',
                '0 0 20px rgba(255,255,255,0.5)',
                '0 0 10px rgba(255,255,255,0.3)',
              ]
            } : {}}
            transition={isCurrent ? { duration: 2, repeat: Infinity } : {}}
          >
            {isCurrent && (
              <span className="text-white font-bold text-xs">
                {round}
              </span>
            )}
            {isCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* Label at bottom */}
      <span className="text-white/60 text-[10px] font-medium mt-1 writing-vertical">
        {t("extra.tvRoundVertical")}
      </span>
    </motion.div>
  );
};
