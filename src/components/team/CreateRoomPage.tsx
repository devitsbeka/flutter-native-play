import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { Gamepad2, Loader2, ArrowLeft, Check, Users, Shuffle, ChevronDown, Play } from "lucide-react";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useFriends } from "@/hooks/useFriends";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";
import { PingPongVideo } from "@/components/shared/PingPongVideo";

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
  const { user } = useAuth();
  const { createRoom, loading, currentRoom } = useMultiplayerV2();
  const { friends } = useFriends();
  const { sendInvitation } = useGameInvitations();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isRandom, setIsRandom] = useState(true); // Default to random
  const [isCreating, setIsCreating] = useState(false);

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
    if (!selectedCategory || !user) return;
    
    setIsCreating(true);
    
    try {
      // Create the room
      await createRoom(selectedCategory.category_id, selectedCategory.name);
      
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
        <h1 className="text-xl font-display text-foreground">ახალი ოთახი</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Category Selection */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">კატეგორია</h2>
          
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
                  className="relative h-28 rounded-xl overflow-hidden transition-all"
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
                      შემთხვევითი
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
                      className="relative h-28 rounded-xl overflow-hidden transition-all"
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

              {/* Show More Button */}
              {categories.length > 5 && (
                <motion.button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="w-full p-3 rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="text-sm font-medium">
                    {showAllCategories ? "ნაკლების ჩვენება" : "მეტის ჩვენება"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAllCategories ? "rotate-180" : ""}`} />
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Friend Invitation Section */}
        {acceptedFriends.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-muted-foreground">
                მოიწვიე მეგობრები ({selectedFriends.size} არჩეული)
              </h2>
            </div>
            
            <div className="space-y-2">
              {acceptedFriends.map((friend) => (
                <motion.button
                  key={friend.id}
                  onClick={() => toggleFriendSelection(friend.friendId)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: selectedFriends.has(friend.friendId)
                      ? "linear-gradient(180deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.15) 100%)"
                      : "hsl(var(--muted))",
                    border: selectedFriends.has(friend.friendId)
                      ? "2px solid hsl(var(--primary))"
                      : "2px solid transparent",
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="relative">
                    <SmartAvatar
                      avatarUrl={friend.avatarUrl}
                      animatedAvatarUrl={friend.animatedAvatarUrl}
                      fallback={friend.nickname?.slice(0, 2)}
                      size="md"
                    />
                    {friend.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{friend.nickname}</p>
                    <p className="text-xs text-muted-foreground">
                      {friend.isOnline ? "ონლაინ" : "ოფლაინ"}
                    </p>
                  </div>
                  
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      selectedFriends.has(friend.friendId)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted-foreground/20"
                    }`}
                  >
                    {selectedFriends.has(friend.friendId) && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Empty friends state */}
        {acceptedFriends.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">მეგობრები ჯერ არ გყავს</p>
            <p className="text-xs">დაამატე მეგობრები თამაშის შემდეგ მოსაწვევად</p>
          </div>
        )}
      </div>

      {/* Footer - Central 3D Purple Button (same as bottom nav but purple with check icon) */}
      <div className="px-4 py-6 flex justify-center">
        <Hex3DCreateButton 
          onClick={handleCreate}
          disabled={!selectedCategory || loading || isCreating}
          isLoading={loading || isCreating}
        />
      </div>
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
