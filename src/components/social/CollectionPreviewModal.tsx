import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Heart, Bookmark, Layers, Globe, Lock, Users, Clock } from "lucide-react";
import { SamplePost } from "@/data/samplePosts";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";
import purpleHeartIcon from "@/assets/icons/purple-heart.webp";
import bookmarkIcon from "@/assets/icons/bookmark-3d.png";

interface CollectionPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posts: SamplePost[];
  collectionTitle?: string;
  onPlay?: (post: SamplePost, collectionPosts?: SamplePost[]) => void;
  userLikes?: string[];
  userSaves?: string[];
  onToggleLike?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
}

export function CollectionPreviewModal({
  open,
  onOpenChange,
  posts,
  collectionTitle,
  onPlay,
  userLikes = [],
  userSaves = [],
  onToggleLike,
  onToggleSave,
}: CollectionPreviewModalProps) {
  if (!posts || posts.length === 0) return null;

  const firstPost = posts[0];
  const liked = posts.some(p => userLikes.includes(p.id));
  const saved = posts.some(p => userSaves.includes(p.id));
  const totalQuestions = posts.reduce((sum, p) => sum + p.questionCount, 0);
  const totalLikes = posts.reduce((sum, p) => sum + p.likesCount, 0);
  const totalPlays = posts.reduce((sum, p) => sum + p.playsCount, 0);

  const handlePlay = () => {
    onPlay?.(firstPost, posts);
    onOpenChange(false);
  };

  const handleLike = () => {
    onToggleLike?.(firstPost.id);
  };

  const handleSave = () => {
    onToggleSave?.(firstPost.id);
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
            <div className="bg-card rounded-3xl overflow-hidden w-full max-w-md max-h-full flex flex-col pointer-events-auto shadow-2xl border border-border">
              {/* Header Image/Gradient */}
              <div className="relative h-48 flex-shrink-0">
                {firstPost.coverImage ? (
                  <>
                    <img 
                      src={firstPost.coverImage} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  </>
                ) : (
                  <div 
                    className="w-full h-full"
                    style={{ 
                      background: firstPost.coverGradient || 'linear-gradient(135deg, hsl(270, 70%, 60%), hsl(320, 70%, 50%))' 
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

                {/* Collection badge with visibility */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-purple-600/90 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                    <Layers className="w-4 h-4" />
                    <span>კოლექცია</span>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                    firstPost.isPublic !== false 
                      ? 'bg-green-500/90 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {firstPost.isPublic !== false ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                    {collectionTitle || firstPost.title}
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 pt-3">
                {/* Author */}
                <div className="flex items-center gap-3 mb-4">
                  <AvatarWithFrame
                    imageUrl={firstPost.avatarUrl}
                    size="sm"
                    showVipBadge={false}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{firstPost.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{firstPost.username}</p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                      <Layers className="w-4 h-4" />
                      <span className="font-bold text-lg">{posts.length}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">რაუნდი</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold text-lg">{totalQuestions}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">კითხვა</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                      <Users className="w-4 h-4" />
                      <span className="font-bold text-lg">{totalPlays}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">ნათამაშები</p>
                  </div>
                </div>

                {/* Rounds List */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground mb-3">რაუნდები</h3>
                  {posts.map((post, index) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl"
                    >
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ 
                          background: post.coverImage 
                            ? `url(${post.coverImage}) center/cover` 
                            : (post.coverGradient || 'linear-gradient(135deg, hsl(270, 70%, 60%), hsl(320, 70%, 50%))') 
                        }}
                      >
                        {!post.coverImage && (
                          <span className="text-white text-sm font-bold">R{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground">{post.questionCount} კითხვა</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                    ითამაშე
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
