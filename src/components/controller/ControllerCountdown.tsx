import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';

export const ControllerCountdown: React.FC = () => {
  const { categoryName, categoryIcon } = useTVGame();
  const [count, setCount] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const displayValue = count === 0 ? 'GO!' : count;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
      {/* Category info */}
      {categoryName && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <p className="text-purple-300 text-sm">ვთამაშობთ</p>
          <p className="text-white text-lg font-bold">{categoryName}</p>
        </motion.div>
      )}

      {/* Countdown number */}
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-xl ${
            count === 0 
              ? 'bg-gradient-to-br from-green-400 to-green-600' 
              : 'bg-gradient-to-br from-purple-500 to-purple-700'
          }`}
        >
          <span className="text-white text-5xl font-bold font-display">
            {displayValue}
          </span>
        </motion.div>
      </AnimatePresence>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-2xl text-white font-bold"
      >
        {count === 0 ? 'დაიწყო!' : 'მოემზადე!'}
      </motion.p>
      <p className="text-purple-200 mt-2">მოემზადე პასუხებისთვის!</p>
    </div>
  );
};
