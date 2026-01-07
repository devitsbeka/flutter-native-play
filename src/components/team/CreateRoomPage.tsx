import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { Gamepad2, Loader2, ArrowLeft, Check, Users, Shuffle, ChevronDown, Play, Pencil, Tv, Library, Sparkles, UserPlus } from "lucide-react";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useFriends } from "@/hooks/useFriends";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { generateRoomName } from "@/utils/roomNameGenerator";
import { Input } from "@/components/ui/input";
import { TVPlayModal } from "@/components/team/TVPlayModal";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
interface Category {
  id: string;
  category_id: string;
  name: string;
  icon_slug: string | null;
}

interface CreateRoomPageProps {
  onClose: () => void;
}

export function CreateRoomPage({ onClose }: CreateRoomPageProps) {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { createRoom, loading, currentRoom } = useMultiplayerV2();
  const { friends } = useFriends();
  const { sendInvitation } = useGameInvitations();
  const { data: myTrivias = [], isLoading: loadingMyTrivias } = useMyQuizPosts();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isRandom, setIsRandom] = useState(true); // Default to random
  const [isCreating, setIsCreating] = useState(false);
  const [roomName, setRoomName] = useState(() => generateRoomName());
  const [showTVModal, setShowTVModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [categoryTab, setCategoryTab] = useState<"library" | "myTrivia">("library");
  const [selectedMyTrivia, setSelectedMyTrivia] = useState<string | null>(null);

  // Only accepted friends
  const acceptedFriends = friends.filter(f => f.status === "accepted");

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, category_id, name, icon_slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
      } else if (data) {
        setCategories(data);
        // Select random category by default
        if (data.length > 0 && !selectedCategory) {
          const randomIndex = Math.floor(Math.random() * data.length);
          setSelectedCategory(data[randomIndex]);
        }
      }
      setLoadingCategories(false);
    };

    fetchCategories();
  }, []);

  // Select random category
  const selectRandomCategory = () => {
    if (categories.length > 0) {
      const randomIndex = Math.floor(Math.random() * categories.length);
      setSelectedCategory(categories[randomIndex]);
      setIsRandom(true);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setIsRandom(false);
  };

  // Display categories - show first 5 or all (5 because Random takes 1 slot)
  const displayedCategories = showAllCategories ? categories : categories.slice(0, 5);

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user) return;
    
    // Check if we have a valid selection
    if (categoryTab === "library" && !selectedCategory && !isRandom) return;
    if (categoryTab === "myTrivia" && !selectedMyTrivia) return;
    
    setIsCreating(true);
    
    try {
      if (categoryTab === "myTrivia" && selectedMyTrivia) {
        // Create room with custom trivia
        const selectedTrivia = myTrivias?.find(t => t.id === selectedMyTrivia);
        if (selectedTrivia) {
          // TODO: Implement custom trivia room creation
          await createRoom("custom", selectedTrivia.title);
        }
      } else if (selectedCategory) {
        // Create the room with library category
        await createRoom(selectedCategory.category_id, selectedCategory.name);
      }
      
      // Note: We need to wait for room to be created before sending invitations
      // The room will be available after createRoom completes
      // Invitations will be sent after redirect to lobby
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Send invitations once room is created
  useEffect(() => {
    const sendInvitations = async () => {
      if (currentRoom && selectedFriends.size > 0 && isCreating === false) {
        for (const friendId of selectedFriends) {
          await sendInvitation(friendId, currentRoom.id);
        }
      }
    };
    
    sendInvitations();
  }, [currentRoom?.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header - simplified */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-display text-foreground flex-1">{t("team.newRoom")}</h1>
        
        {/* TV Play Button */}
        <button
          onClick={() => setShowTVModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
        >
          <Tv className="w-5 h-5" />
          <span className="hidden sm:inline">TV</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Room Name Input - Compact */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground mb-1">{t("team.roomName")}</h2>
          <div className="relative">
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t("team.enterRoomName")}
              className="h-9 pr-9 bg-muted/50 border-border/50 text-foreground text-sm"
              maxLength={30}
            />
            <button
              onClick={() => setRoomName(generateRoomName())}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
              title={t("team.randomName")}
            >
              <Shuffle className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Category Selection */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground mb-1">{t("team.category")}</h2>
          
          {/* Category Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => {
                setCategoryTab("library");
                setSelectedMyTrivia(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                categoryTab === "library"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Library className="w-4 h-4" />
              ბიბლიოთეკა
            </button>
            <button
              onClick={() => {
                setCategoryTab("myTrivia");
                setSelectedCategory(null);
                setIsRandom(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                categoryTab === "myTrivia"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              ჩემი ტრივია
            </button>
          </div>
          
          {categoryTab === "library" ? (
            <>
              {loadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Category Grid - including Random as first option */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Random Category Card - always first */}
                    <motion.button
                      onClick={selectRandomCategory}
                      className="relative h-24 rounded-xl overflow-hidden transition-all"
                      style={{
                        background: "linear-gradient(135deg, #E9D5FF 0%, #C4B5FD 50%, #A78BFA 100%)",
                        border: isRandom
                          ? "3px solid hsl(var(--primary))"
                          : "2px solid hsl(var(--border))",
                        boxShadow: isRandom
                          ? "0 4px 0 hsl(var(--primary) / 0.3)"
                          : "0 2px 0 hsl(var(--border))",
                      }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98, y: 1 }}
                    >
                      {/* Dice icon centered - positioned higher */}
                      <div className="absolute inset-0 flex items-center justify-center pb-5">
                        <span className="text-4xl">🎲</span>
                      </div>
                      
                      {/* Category Name - bottom left, no emoji */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="text-sm font-bold text-foreground leading-tight drop-shadow-sm">
                          {t("team.random")}
                        </span>
                      </div>
                      
                      {isRandom && (
                        <motion.div
                          layoutId="category-selected-page"
                          className="absolute inset-0 rounded-xl border-3 border-primary pointer-events-none"
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                    </motion.button>

                    {/* Regular Categories */}
                    {displayedCategories.map((category) => {
                      const videoUrl = CATEGORY_VIDEOS[category.category_id] || "/videos/floating-blob.mp4";
                      const isSelected = selectedCategory?.id === category.id && !isRandom;
                      
                      return (
                        <motion.button
                          key={category.id}
                          onClick={() => handleCategorySelect(category)}
                          className="relative h-24 rounded-xl overflow-hidden transition-all"
                          style={{
                            border: isSelected
                              ? "3px solid hsl(var(--primary))"
                              : "2px solid hsl(var(--border))",
                            boxShadow: isSelected
                              ? "0 4px 0 hsl(var(--primary) / 0.3)"
                              : "0 2px 0 hsl(var(--border))",
                          }}
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98, y: 1 }}
                        >
                          {/* Video Background */}
                          <div className="absolute inset-0">
                            <PingPongVideo
                              src={videoUrl}
                              className="w-full h-full object-cover scale-125"
                            />
                          </div>
                          
                          {/* Subtle Netflix-style gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/25 to-transparent" />
                          <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-transparent" />
                          
                          {/* Category Name - bottom left, Netflix style */}
                          <div className="absolute bottom-3 left-3 right-3">
                            <span className="text-sm font-bold text-foreground leading-tight line-clamp-2 drop-shadow-sm">
                              {category.name}
                            </span>
                          </div>
                          
                          {isSelected && (
                            <motion.div
                              layoutId="category-selected-page"
                              className="absolute inset-0 rounded-xl border-3 border-primary pointer-events-none"
                              initial={false}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Show More Button - Compact */}
                  {categories.length > 5 && (
                    <motion.button
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="w-full py-2 rounded-lg bg-muted/30 border border-dashed border-border/50 flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <span className="text-xs font-medium">
                        {showAllCategories ? t("team.showLess") : t("team.showMore")}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllCategories ? "rotate-180" : ""}`} />
                    </motion.button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* My Trivia Tab Content */
            <div>
              {loadingMyTrivias ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : myTrivias.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {myTrivias.map((trivia) => {
                    const isSelected = selectedMyTrivia === trivia.id;
                    
                    return (
                      <motion.button
                        key={trivia.id}
                        onClick={() => setSelectedMyTrivia(trivia.id)}
                        className="relative h-24 rounded-xl overflow-hidden transition-all"
                        style={{
                          background: trivia.cover_gradient,
                          border: isSelected
                            ? "3px solid hsl(var(--primary))"
                            : "2px solid hsl(var(--border))",
                          boxShadow: isSelected
                            ? "0 4px 0 hsl(var(--primary) / 0.3)"
                            : "0 2px 0 hsl(var(--border))",
                        }}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98, y: 1 }}
                      >
                        <div className="absolute inset-0 bg-black/30" />
                        
                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col justify-end p-3">
                          <span className="text-sm font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                            {trivia.title}
                          </span>
                          <span className="text-xs text-white/80 mt-1">
                            {trivia.question_count} კითხვა
                          </span>
                        </div>
                        
                        {isSelected && (
                          <motion.div
                            layoutId="trivia-selected"
                            className="absolute inset-0 rounded-xl border-3 border-primary pointer-events-none"
                            initial={false}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm">ჯერ არ გაქვს შექმნილი ტრივია</p>
                  <p className="text-muted-foreground/70 text-xs mt-1">შექმენი ტრივია სოციალური ფიდიდან</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Friend Invitation Section - Avatar Circles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-xs font-medium text-muted-foreground">
                {t("team.inviteFriends").replace("{count}", String(selectedFriends.size))}
              </h2>
            </div>
            <motion.button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              მოწვევა
            </motion.button>
          </div>
          
          {acceptedFriends.length > 0 ? (
            <TooltipProvider delayDuration={0}>
              <div className="flex flex-wrap gap-2">
                {/* Invite New Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => setShowInviteModal(true)}
                      className="relative w-10 h-10 rounded-full bg-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center hover:bg-muted hover:border-primary/30 transition-colors"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <UserPlus className="w-4 h-4 text-muted-foreground" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    მეგობრის მოწვევა
                  </TooltipContent>
                </Tooltip>
                
                {acceptedFriends.map((friend) => {
                  const isSelected = selectedFriends.has(friend.friendId);
                  return (
                    <Tooltip key={friend.id}>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => toggleFriendSelection(friend.friendId)}
                          className="relative"
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div 
                            className="relative rounded-full p-0.5 transition-all"
                            style={{
                              background: isSelected 
                                ? "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)"
                                : "transparent",
                            }}
                          >
                            <SmartAvatar
                              avatarUrl={friend.avatarUrl}
                              animatedAvatarUrl={friend.animatedAvatarUrl}
                              fallback={friend.nickname?.slice(0, 2)}
                              size="md"
                              className={isSelected ? "ring-0" : "ring-2 ring-border/30"}
                            />
                          </div>
                          {friend.isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                          )}
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </div>
                          )}
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {friend.nickname}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <motion.button
                onClick={() => setShowInviteModal(true)}
                className="w-16 h-16 mx-auto mb-2 rounded-full bg-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center hover:bg-muted hover:border-primary/30 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <UserPlus className="w-6 h-6 text-muted-foreground" />
              </motion.button>
              <p className="text-sm">{t("team.noFriendsYet")}</p>
              <p className="text-xs">{t("team.addFriendsHint")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Central 3D Purple Button (same as bottom nav but purple with check icon) */}
      <div className="px-4 py-6 flex justify-center">
        <Hex3DCreateButton 
          onClick={handleCreate}
          disabled={
            loading || 
            isCreating || 
            (categoryTab === "library" && !selectedCategory && !isRandom) ||
            (categoryTab === "myTrivia" && !selectedMyTrivia)
          }
          isLoading={loading || isCreating}
        />
      </div>

      {/* TV Play Modal */}
      <TVPlayModal
        isOpen={showTVModal}
        onClose={() => setShowTVModal(false)}
        categoryId={selectedCategory?.id}
        categoryName={selectedCategory?.name}
      />
      
      {/* Invite Friends Modal */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </motion.div>
  );
}

// Reusing the exact same 3D button style from UniversalBottomNav but with purple variant and check icon
function Hex3DCreateButton({ 
  onClick, 
  disabled = false,
  isLoading = false,
}: { 
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  const colors = {
    depth: "linear-gradient(180deg, #6B21A8 0%, #581C87 50%, #4C1D95 100%)",
    bevel: "linear-gradient(180deg, #A855F7 0%, #9333EA 100%)",
    face: "radial-gradient(circle at 40% 35%, #C084FC 0%, #A855F7 25%, #9333EA 50%, #7C3AED 75%, #6D28D9 100%)",
    sparkle: "rgba(220,180,255,0.95)",
    sparkleShadow: "0 0 6px rgba(200,150,255,0.9), 0 0 10px rgba(160,100,230,0.6)",
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="relative disabled:opacity-50"
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.92, y: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      style={{ width: 90, height: 90 }}
    >
      {/* Bottom 3D depth layer */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 0,
          top: 6,
          background: colors.depth,
        }}
      />
      
      {/* Middle bevel layer */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 3,
          top: 4,
          bottom: 8,
          background: colors.bevel,
        }}
      />
      
      {/* Main face - radial gradient */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          inset: 4,
          top: 0,
          bottom: 12,
          background: colors.face,
        }}
      >
        {/* Sparkle particles */}
        {!isLoading && [...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 2 === 0 ? 4 : 3,
              height: i % 2 === 0 ? 4 : 3,
              background: colors.sparkle,
              boxShadow: colors.sparkleShadow,
              left: `${20 + (i * 12)}%`,
              top: `${25 + ((i % 3) * 18)}%`,
            }}
            animate={{
              y: [-5, 5, -5],
              x: [i % 2 === 0 ? -3 : 3, i % 2 === 0 ? 3 : -3, i % 2 === 0 ? -3 : 3],
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 1.5 + (i * 0.25),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
        
        {/* Icon */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}
        >
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          ) : (
            <Check 
              className="w-8 h-8" 
              color="#ffffff"
              strokeWidth={3}
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}
