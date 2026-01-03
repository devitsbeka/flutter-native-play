import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { Gamepad2, Loader2, ArrowLeft, Check, Users, Shuffle, ChevronDown } from "lucide-react";
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
  const { createRoom, loading, room } = useMultiplayer();
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

  // Display categories - show first 4 or all
  const displayedCategories = showAllCategories ? categories : categories.slice(0, 4);

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
      if (room && selectedFriends.size > 0 && isCreating === false) {
        for (const friendId of selectedFriends) {
          await sendInvitation(friendId, room.id);
        }
      }
    };
    
    sendInvitations();
  }, [room?.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-display text-foreground">ახალი ოთახი</h1>
          <p className="text-sm text-muted-foreground">აირჩიე კატეგორია და მოიწვიე მეგობრები</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-primary" />
        </div>
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
              {/* Random Button - 2x size */}
              <motion.button
                onClick={selectRandomCategory}
                className="w-full p-4 rounded-xl text-left transition-all"
                style={{
                  background: isRandom
                    ? "linear-gradient(180deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.25) 100%)"
                    : "linear-gradient(180deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.8) 100%)",
                  border: isRandom
                    ? "2px solid hsl(var(--primary))"
                    : "2px solid hsl(var(--border))",
                  boxShadow: isRandom
                    ? "0 4px 0 hsl(var(--primary) / 0.3)"
                    : "0 3px 0 hsl(var(--border))",
                }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98, y: 2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Shuffle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-base font-semibold text-foreground">🎲 შემთხვევითი</span>
                    <p className="text-xs text-muted-foreground">ნებისმიერი კატეგორია</p>
                  </div>
                </div>
              </motion.button>

              {/* Category Grid - 2x height with video background */}
              <div className="grid grid-cols-2 gap-2">
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
                      
                      {/* White mask overlay */}
                      <div className="absolute inset-0 bg-white/70" />
                      
                      {/* Category Name - centered, two lines if needed */}
                      <div className="absolute inset-0 flex items-center justify-center p-3">
                        <span className="text-sm font-bold text-foreground text-center leading-tight line-clamp-2">
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
              {categories.length > 4 && (
                <motion.button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="w-full p-3 rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="text-sm font-medium">
                    {showAllCategories ? "ნაკლების ჩვენება" : `მეტის ჩვენება (${categories.length - 4})`}
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

      {/* Footer - Central 3D Purple Checkmark Button */}
      <div className="px-4 py-6 flex justify-center">
        <motion.button
          onClick={handleCreate}
          disabled={!selectedCategory || loading || isCreating}
          className="relative w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-50"
          style={{
            background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)",
            boxShadow: "0 8px 0 hsl(var(--primary) / 0.4), 0 12px 20px hsl(var(--primary) / 0.3)",
          }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95, y: 4, boxShadow: "0 2px 0 hsl(var(--primary) / 0.4)" }}
        >
          {loading || isCreating ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
          ) : (
            <Check className="w-10 h-10 text-primary-foreground stroke-[3]" />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
