import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Monitor, Loader2 } from 'lucide-react';
import { useTVGame } from '@/contexts/TVGameContext';

/**
 * TVMirrorButton - A button + modal to mirror an existing TV session
 * Used on the TV pairing screen to allow secondary displays to sync with a primary TV
 */
export const TVMirrorButton: React.FC = () => {
  const { mirrorSession } = useTVGame();
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      setCode(['', '', '', '']);
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError(null);

    // Auto-advance to next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (digit && index === 3 && newCode.every(d => d)) {
      handleMirror(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleMirror = async (fullCode: string) => {
    setIsLoading(true);
    setError(null);
    
    const success = await mirrorSession(fullCode);
    
    setIsLoading(false);
    
    if (!success) {
      setError('სესია ვერ მოიძებნა');
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mirror button in top right */}
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-30 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white/80 hover:bg-white/20 hover:text-white transition-all"
      >
        <Monitor className="w-4 h-4" />
        <span className="text-sm font-medium">Mirror</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Monitor className="w-6 h-6 text-purple-300" />
                  <h2 className="text-xl font-bold text-white">Mirror Display</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Description */}
              <p className="text-purple-300 text-sm mb-6">
                შეიყვანე 4-ციფრიანი კოდი სხვა TV-დან ამ ეკრანზე თამაშის სარკისებურად საჩვენებლად.
              </p>

              {/* Code input */}
              <div className="flex justify-center gap-3 mb-6">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className="w-16 h-20 text-4xl font-bold text-center bg-white/10 border-2 border-white/30 rounded-xl text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              {/* Error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-center mb-4"
                >
                  {error}
                </motion.p>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-purple-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>დაკავშირება...</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
