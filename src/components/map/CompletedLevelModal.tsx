import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle, X, Target, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface CompletedLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: number;
  stats: {
    questionsAnswered: number;
    correctAnswers: number;
    pointsEarned: number;
    starsEarned: number;
    completedAt?: string;
  };
  onReplay?: () => void;
}

export function CompletedLevelModal({ 
  isOpen, 
  onClose, 
  levelId, 
  stats,
  onReplay 
}: CompletedLevelModalProps) {
  const accuracy = stats.questionsAnswered > 0 
    ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) 
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[85%] max-w-xs"
            initial={{ opacity: 0, scale: 0.8, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.8, x: "-50%", y: "-50%" }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div className="relative bg-gradient-to-b from-green-100 to-emerald-50 rounded-3xl border-4 border-green-400 shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-green-200 hover:bg-green-300 transition-colors z-10"
              >
                <X className="w-4 h-4 text-green-700" />
              </button>
              
              {/* Header decoration */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 via-emerald-300 to-green-400" />
              
              {/* Content */}
              <div className="pt-8 pb-6 px-6 flex flex-col items-center">
                {/* Trophy icon with glow */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-green-400/30 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-green-400 to-green-500 flex items-center justify-center border-4 border-green-600 shadow-lg">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                </div>
                
                {/* Level title */}
                <h2 className="text-2xl font-bold text-green-800 mb-1">
                  Level {levelId}
                </h2>
                <p className="text-green-600 font-medium mb-4">Completed!</p>
                
                {/* Stars display */}
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3].map((star) => (
                    <Star 
                      key={star}
                      className={`w-8 h-8 ${
                        star <= stats.starsEarned 
                          ? "text-yellow-400 fill-yellow-400" 
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                
                {/* Stats grid */}
                <div className="w-full bg-white/80 rounded-2xl p-4 border-2 border-green-200 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700">
                      <Target className="w-5 h-5" />
                      <span className="text-sm">Best Score</span>
                    </div>
                    <span className="font-bold text-green-800">
                      {stats.correctAnswers}/{stats.questionsAnswered}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">Accuracy</span>
                    </div>
                    <span className="font-bold text-green-800">{accuracy}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700">
                      <Zap className="w-5 h-5" />
                      <span className="text-sm">Points Earned</span>
                    </div>
                    <span className="font-bold text-green-800">{stats.pointsEarned}</span>
                  </div>
                  
                  {stats.completedAt && (
                    <div className="flex items-center justify-between pt-2 border-t border-green-200">
                      <div className="flex items-center gap-2 text-green-700">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm">Completed</span>
                      </div>
                      <span className="font-bold text-green-800 text-sm">
                        {format(new Date(stats.completedAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="w-full flex gap-2">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 border-2 border-green-300 text-green-700 hover:bg-green-100"
                  >
                    Close
                  </Button>
                  {onReplay && (
                    <Button
                      onClick={onReplay}
                      className="flex-1 bg-gradient-to-b from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold rounded-xl border-2 border-green-600 shadow-lg"
                    >
                      Play Again
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Bottom decoration */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-300 to-green-400" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}