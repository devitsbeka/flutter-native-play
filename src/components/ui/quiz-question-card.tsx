import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Snowflake } from "lucide-react";
import { AudioPlayer } from "./audio-player";

export type QuizQuestionCardState = "default" | "loading" | "frozen";

interface QuizQuestionCardProps {
  questionText?: string;
  questionNumber?: number;
  totalQuestions?: number;
  progressPercent?: number;
  state?: QuizQuestionCardState;
  className?: string;
  difficultyLabel?: string;
  difficultyColor?: string;
  timerSeconds?: number;
  timerMaxSeconds?: number;
  freezeTimeLeft?: number;
  /**
   * Optional image URL for image-based trivia questions
   */
  imageUrl?: string | null;
  /**
   * Optional video URL for video-based trivia questions
   */
  videoUrl?: string | null;
  /**
   * Optional audio URL for sound-based trivia questions
   */
  audioUrl?: string | null;
  /**
   * When a large icon is rendered overlapping the top-center of the card
   * (outside this component), enable this to reserve extra whitespace so the
   * icon never covers the question text.
   */
  reserveTopSpace?: boolean;
  /**
   * Hide question text - useful for image-only trivia where image speaks for itself
   */
  hideQuestionText?: boolean;
}

// Dynamic font sizing based on question length
// Questions are now max 65 chars, so we can use larger fonts
function getQuestionStyles(text: string) {
  const length = text.length;
  if (length > 60) return { fontSize: "18px" };
  if (length > 50) return { fontSize: "19px" };
  if (length > 40) return { fontSize: "20px" };
  return { fontSize: "20px" };  // Default 20px for short questions
}

const QuizQuestionCard = React.forwardRef<HTMLDivElement, QuizQuestionCardProps>(
  (
    {
      questionText = "Loading question...",
      questionNumber,
      totalQuestions,
      progressPercent = 0,
      state = "default",
      className,
      difficultyLabel,
      difficultyColor,
      timerSeconds,
      timerMaxSeconds = 20,
      freezeTimeLeft = 0,
      imageUrl,
      videoUrl,
      audioUrl,
      reserveTopSpace = false,
      hideQuestionText = false,
    },
    ref
  ) => {
    const isLoading = state === "loading";
    const isFrozen = state === "frozen" && freezeTimeLeft > 0;
    const questionStyles = getQuestionStyles(questionText);
    const isLowTime = timerSeconds !== undefined && timerSeconds <= 5 && !isFrozen;
    const hasTopBadges = timerSeconds !== undefined || !!difficultyLabel;

    // Image questions hide the question text, so a failed image load MUST
    // fall back to showing the text - otherwise the card is completely blank
    // and the question is unanswerable. Track the load lifecycle per URL.
    const [imageStatus, setImageStatus] = React.useState<"loading" | "loaded" | "error">("loading");
    React.useEffect(() => {
      setImageStatus("loading");
    }, [imageUrl]);

    const imageFailed = !!imageUrl && imageStatus === "error";
    const hasImage = !!imageUrl && !imageFailed;
    const hasVideo = !!videoUrl;
    const hasAudio = !!audioUrl;
    const hasMedia = hasImage || hasVideo || hasAudio;
    // Show the text whenever the image can't (or might never) speak for itself
    const effectiveHideText = hideQuestionText && !imageFailed;

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative w-full rounded-2xl overflow-hidden flex flex-col",
          isFrozen && "ring-4 ring-cyan-400/50",
          className
        )}
        style={{
          backgroundColor: isFrozen ? "#E0F7FA" : "#FFFFFF",
          boxShadow: isFrozen ? "0 4px 0 #0097A7, 0 0 20px rgba(0,188,212,0.4)" : "0 4px 0 #CBD5E1",
        }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {/* Image for Image Trivia questions */}
        {hasImage && !hasVideo && !hasAudio && (
          <div className="w-full h-36 overflow-hidden bg-gray-100 relative flex items-start justify-center">
            {/* Skeleton while the image downloads - a silently empty card
                looks broken on slow connections */}
            {imageStatus === "loading" && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <img
              src={imageUrl!}
              alt="Question"
              className={cn(
                "w-full h-full object-contain object-top relative",
                imageStatus !== "loaded" && "opacity-0"
              )}
              loading="eager"
              decoding="async"
              onLoad={() => setImageStatus("loaded")}
              onError={() => setImageStatus("error")}
            />
          </div>
        )}
        
        {/* Video for Video Trivia questions */}
        {hasVideo && (
          <div className="w-full h-36 overflow-hidden bg-black rounded-t-2xl">
            <video 
              src={videoUrl!}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Audio for Sound Trivia questions */}
        {hasAudio && !hasVideo && (
          <AudioPlayer src={audioUrl!} autoPlay={true} />
        )}
        {/* Freeze overlay effect */}
        {isFrozen && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-200/30 to-transparent" />
            {/* Floating snowflakes */}
            <motion.div
              className="absolute top-2 left-1/4"
              animate={{ y: [0, 5, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Snowflake className="w-4 h-4 text-cyan-500" />
            </motion.div>
            <motion.div
              className="absolute top-4 right-1/3"
              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            >
              <Snowflake className="w-3 h-3 text-cyan-400" />
            </motion.div>
          </div>
        )}
        
        {/* Timer badge - top left corner */}
        {timerSeconds !== undefined && (
          <div className="absolute top-3 left-3 z-10">
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold relative",
                isFrozen ? "bg-cyan-500" : isLowTime ? "bg-destructive animate-pulse" : "bg-primary"
              )}
              style={{
                boxShadow: isFrozen ? "0 0 10px rgba(0,188,212,0.6)" : "0 2px 4px rgba(0,0,0,0.2)"
              }}
            >
              {isFrozen && (
                <motion.div 
                  className="absolute inset-0 rounded-full bg-cyan-300/50"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {isFrozen ? (
                <Snowflake className="w-4 h-4" />
              ) : (
                timerSeconds
              )}
            </div>
            {/* Freeze countdown */}
            {isFrozen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap font-bold"
              >
                {freezeTimeLeft}წ
              </motion.div>
            )}
          </div>
        )}

        {/* Difficulty badge - top right corner */}
        {difficultyLabel && (
          <div className="absolute top-3 right-3 z-10">
            <span 
              className={cn(
                "px-2 py-0.5 rounded-full text-white text-[10px] font-bold",
                difficultyColor
              )}
            >
              {difficultyLabel}
            </span>
          </div>
        )}
        {/* Question counter (optional) */}
        {questionNumber && totalQuestions && (
          <div className="flex justify-center pt-4">
            <span className="text-[#7E6AAE] text-sm font-medium">
              {questionNumber}/{totalQuestions}
            </span>
          </div>
        )}


        {/* Question Text - hidden for image-only mode, but ALWAYS shown when
            the image failed to load (the text is the only usable fallback) */}
        {!effectiveHideText && (
          <div className={cn(
            "px-5 py-2 [@media(max-height:700px)]:py-1.5 [@media(max-height:600px)]:py-1 min-h-[80px] [@media(max-height:600px)]:min-h-[60px] flex items-center justify-center",
            // Reserve headroom for top badges (timer/difficulty) and/or an external overlapping icon
            // Reduce top padding if we have media (no need for icon space)
            hasMedia && "pt-4",
            !hasMedia && hasTopBadges && !reserveTopSpace && "pt-16 [@media(max-height:700px)]:pt-14 [@media(max-height:600px)]:pt-12",
            !hasMedia && hasTopBadges && reserveTopSpace && "pt-[90px] [@media(max-height:700px)]:pt-[74px] [@media(max-height:600px)]:pt-[66px]",
            !hasMedia && !hasTopBadges && reserveTopSpace && "pt-[66px] [@media(max-height:700px)]:pt-[50px] [@media(max-height:600px)]:pt-[50px]"
          )}>
            {isLoading ? (
              <div className="space-y-2 w-full">
                <div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
            ) : (
              <p
                className="text-center font-semibold leading-snug text-[#2A2550]"
                style={{
                  fontSize: questionStyles.fontSize,
                }}
              >
                {questionText}
              </p>
            )}
          </div>
        )}

        {/* Spacer to push progress bar to bottom */}
        <div className="flex-1" />

        {/* Progress bar at bottom */}
        <div className="h-2 bg-gray-200 w-full">
          <motion.div
            className="h-full rounded-r-full"
            style={{
              background: isFrozen 
                ? "linear-gradient(90deg, #00BCD4 0%, #4DD0E1 100%)" 
                : "linear-gradient(90deg, #F5A623 0%, #F7C948 100%)",
              width: `${progressPercent}%`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>
    );
  }
);

QuizQuestionCard.displayName = "QuizQuestionCard";

export { QuizQuestionCard };
