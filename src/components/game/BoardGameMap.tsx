import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Trophy, Flag, Check, X } from "lucide-react";

interface AnswerHistory {
  correct: boolean;
  points: number;
}

interface BoardGameMapProps {
  totalTiles: number;
  userProgress: number;
  opponentProgress: number;
  userAnswerHistory: AnswerHistory[];
  opponentAnswerHistory: AnswerHistory[];
  compact?: boolean;
  animateLastMove?: boolean;
  userAvatar?: string;
  opponentAvatar?: string;
}

export function BoardGameMap({
  totalTiles,
  userProgress,
  opponentProgress,
  userAnswerHistory,
  opponentAnswerHistory,
  compact = false,
  animateLastMove = false,
}: BoardGameMapProps) {
  const tiles = Array.from({ length: totalTiles }, (_, i) => i + 1);

  if (compact) {
    return (
      <div className="w-full px-2">
        <div className="flex items-center justify-between gap-1">
          {/* Start */}
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Flag className="w-4 h-4 text-primary" />
          </div>
          
          {/* Tiles */}
          <div className="flex-1 flex items-center gap-1 relative">
            {tiles.map((tile, index) => {
              const userHere = userProgress === index + 1;
              const opponentHere = opponentProgress === index + 1;
              const userPassed = userProgress > index + 1;
              const opponentPassed = opponentProgress > index + 1;
              const userAnswer = userAnswerHistory[index];
              const opponentAnswer = opponentAnswerHistory[index];

              return (
                <div key={tile} className="flex-1 relative">
                  <div
                    className={cn(
                      "h-8 rounded-lg border-2 transition-all flex items-center justify-center relative",
                      userPassed && userAnswer?.correct && "bg-primary/20 border-primary",
                      userPassed && userAnswer && !userAnswer.correct && "bg-destructive/20 border-destructive",
                      !userPassed && !userHere && "bg-muted/50 border-border",
                      userHere && "bg-primary/30 border-primary ring-2 ring-primary/50"
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">{tile}</span>
                    
                    {/* User token */}
                    {userHere && (
                      <motion.div
                        initial={animateLastMove ? { scale: 0, y: -20 } : false}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary border-2 border-background shadow-lg z-10"
                      />
                    )}
                    
                    {/* Opponent token */}
                    {opponentHere && (
                      <motion.div
                        initial={animateLastMove ? { scale: 0, y: -20 } : false}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-destructive border-2 border-background shadow-lg z-10"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Finish */}
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-yellow-500" />
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-between mt-2 px-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">You</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs text-muted-foreground">Opponent</span>
          </div>
        </div>
      </div>
    );
  }

  // Expanded vertical view for QuestionResultScreen
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex flex-col items-center gap-2">
        {/* Finish tile */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30"
        >
          <Trophy className="w-8 h-8 text-white" />
        </motion.div>
        
        <div className="w-1 h-4 bg-border" />
        
        {/* Question tiles - reversed order for visual (finish at top) */}
        {[...tiles].reverse().map((tile, reversedIndex) => {
          const index = totalTiles - 1 - reversedIndex;
          const userHere = userProgress === index + 1;
          const opponentHere = opponentProgress === index + 1;
          const userPassed = userProgress > index + 1;
          const opponentPassed = opponentProgress > index + 1;
          const userAnswer = userAnswerHistory[index];
          const opponentAnswer = opponentAnswerHistory[index];
          
          const isLastUserMove = animateLastMove && userProgress === index + 1;
          const isLastOpponentMove = animateLastMove && opponentProgress === index + 1;

          return (
            <motion.div
              key={tile}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reversedIndex * 0.05 }}
              className="flex items-center gap-3"
            >
              {/* User side indicator */}
              <div className="w-8 flex justify-end">
                {userHere && (
                  <motion.div
                    initial={isLastUserMove ? { scale: 0, x: -20 } : false}
                    animate={{ scale: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shadow-lg",
                      userAnswer?.correct 
                        ? "bg-primary ring-2 ring-primary/50" 
                        : userAnswer 
                          ? "bg-destructive ring-2 ring-destructive/50"
                          : "bg-primary"
                    )}
                  >
                    <span className="text-xs font-bold text-primary-foreground">YOU</span>
                  </motion.div>
                )}
              </div>
              
              {/* Tile */}
              <div
                className={cn(
                  "w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all shadow-md",
                  userPassed && userAnswer?.correct && "bg-primary/20 border-primary",
                  userPassed && userAnswer && !userAnswer.correct && "bg-destructive/20 border-destructive",
                  !userPassed && !userHere && !opponentHere && "bg-card border-border",
                  (userHere || opponentHere) && "bg-accent border-accent-foreground/20 scale-110"
                )}
              >
                {userPassed && userAnswer && (
                  userAnswer.correct 
                    ? <Check className="w-5 h-5 text-primary" />
                    : <X className="w-5 h-5 text-destructive" />
                )}
                {!userPassed && (
                  <span className="text-lg font-bold text-muted-foreground">{tile}</span>
                )}
              </div>
              
              {/* Opponent side indicator */}
              <div className="w-8">
                {opponentHere && (
                  <motion.div
                    initial={isLastOpponentMove ? { scale: 0, x: 20 } : false}
                    animate={{ scale: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shadow-lg",
                      opponentAnswer?.correct 
                        ? "bg-emerald-500 ring-2 ring-emerald-500/50" 
                        : opponentAnswer 
                          ? "bg-destructive ring-2 ring-destructive/50"
                          : "bg-destructive"
                    )}
                  >
                    <span className="text-xs font-bold text-white">BOT</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
        
        <div className="w-1 h-4 bg-border" />
        
        {/* Start tile */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: totalTiles * 0.05 }}
          className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30"
        >
          <Flag className="w-8 h-8 text-primary-foreground" />
        </motion.div>
      </div>
    </div>
  );
}
