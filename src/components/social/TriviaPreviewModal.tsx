import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Globe, Lock, Clock, Users, HelpCircle } from "lucide-react";
import { SamplePost } from "@/data/samplePosts";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";
import purpleHeartIcon from "@/assets/icons/purple-heart.webp";
import bookmarkIcon from "@/assets/icons/bookmark-3d.png";
import { useLanguage } from "@/contexts/LanguageContext";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

interface TriviaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: SamplePost | null;
  onPlay?: (post: SamplePost) => void;
  userLikes?: string[];
  userSaves?: string[];
  onToggleLike?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
}

export function TriviaPreviewModal({
  open,
  onOpenChange,
  post,
  onPlay,
  userLikes = [],
  userSaves = [],
  onToggleLike,
  onToggleSave,
}: TriviaPreviewModalProps) {
  const { t } = useLanguage();
  if (!post) return null;

  const liked = userLikes.includes(post.id);
  const saved = userSaves.includes(post.id);

  // Extract up to 3 random unique icons from questions
  const questionIcons = useMemo(() => {
    const icons = post.questions
      .map(q => q.icon_slug)
      .filter((slug): slug is string => !!slug);
    
    const uniqueIcons = [...new Set(icons)];
    
    const seed = post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const shuffled = [...uniqueIcons].sort((a, b) => {
      const hashA = (seed * a.charCodeAt(0)) % 1000;
      const hashB = (seed * b.charCodeAt(0)) % 1000;
      return hashA - hashB;
    });
    
    return shuffled.slice(0, 3);
  }, [post.questions, post.id]);

  const handlePlay = () => {
    onPlay?.(post);
    onOpenChange(false);
  };

  const handleLike = () => {
    onToggleLike?.(post.id);
  };

  const handleSave = () => {
    onToggleSave?.(post.id);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-4 bottom-4 z-[200] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-card rounded-3xl overflow-hidden w-full max-w-md md:max-w-[500px] max-h-full flex flex-col pointer-events-auto shadow-2xl border border-border mx-auto">
              {/* Header Image/Gradient */}
              <div className="relative h-48 flex-shrink-0">
                {post.coverImage ? (
                  <>
                    <img 
                      src={post.coverImage} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  </>
                ) : (
                  <div 
                    className="w-full h-full"
                    style={{ 
                      background: post.coverGradient || 'linear-gradient(135deg, hsl(270, 70%, 60%), hsl(320, 70%, 50%))' 
                    }}
                  />
                )}

                {/* Close button */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Visibility badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                    post.isPublic !== false 
                      ? 'bg-green-500/90 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {post.isPublic !== false ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                    {post.title}
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 pt-3">
                {/* Author */}
                <div className="flex items-center gap-3 mb-4">
                  <AvatarWithFrame
                    imageUrl={post.avatarUrl}
                    size="sm"
                    showVipBadge={false}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{post.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{post.username}</p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                      <HelpCircle className="w-4 h-4" />
                      <span className="font-bold text-lg">{post.questionCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("extra.questionWordLabel")}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold text-lg">{post.answerFormat === '4_answers' ? '4' : '2'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("extra.answersCount")}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                      <Users className="w-4 h-4" />
                      <span className="font-bold text-lg">{post.playsCount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("extra.playsLabel")}</p>
                  </div>
                </div>

                {/* Question Icons Preview */}
                {questionIcons.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-foreground mb-3">{t("extra.topicsLabel")}</h3>
                    <div className="flex items-center gap-3">
                      {questionIcons.map((slug) => (
                        <div 
                          key={slug} 
                          className="w-14 h-14 rounded-2xl bg-muted/50 p-2 shadow-sm"
                        >
                          <img 
                            src={`${ICON_STORAGE_URL}/${slug}.png`}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map(tag => (
                      <span
                        key={tag}
                        className="text-primary text-sm bg-primary/10 px-2.5 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with Actions */}
              <div className="p-5 border-t border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-3">
                  {/* Like */}
                  <button 
                    onClick={handleLike}
                    className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <img 
                      src={purpleHeartIcon} 
                      alt="Like" 
                      className={`w-7 h-7 object-contain transition-all ${liked ? 'opacity-100' : 'opacity-60 grayscale'}`}
                    />
                  </button>

                  {/* Save */}
                  <button 
                    onClick={handleSave}
                    className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <img 
                      src={bookmarkIcon} 
                      alt="Save" 
                      className={`w-7 h-7 object-contain transition-all ${saved ? 'opacity-100' : 'opacity-60 grayscale'}`}
                    />
                  </button>

                  {/* Play Button */}
                  <ChunkyButton 
                    onClick={handlePlay}
                    className="flex-1"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {t("common.play")}
                  </ChunkyButton>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
