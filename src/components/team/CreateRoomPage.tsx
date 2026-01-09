import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, ArrowLeft, Shuffle, Tv, Library, Sparkles, UserPlus, X, Play, Dices } from "lucide-react";
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
import { CategorySelectorModal } from "@/components/team/CategorySelectorModal";
import { CreateTriviaTypeModal } from "@/components/social/CreateTriviaTypeModal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useNavigate } from "react-router-dom";

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon_slug: string | null;
  color?: string;
  image_url?: string | null;
  total_levels?: number;
}

type SelectionMode = "random" | "library" | "create" | null;

interface CreateRoomPageProps {
  onClose: () => void;
}

export function CreateRoomPage({ onClose }: CreateRoomPageProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { createRoom, loading } = useMultiplayerV2();
  const { friends } = useFriends();
  const { sendInvitation, addInvitedParticipant } = useGameInvitations();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [roomName, setRoomName] = useState(() => generateRoomName());
  const [showTVModal, setShowTVModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showCreateTriviaModal, setShowCreateTriviaModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  
  // Track friends to invite with a ref so it's available when room is created
  const friendsToInviteRef = useRef<Set<string>>(new Set());

  // Only accepted friends
  const acceptedFriends = friends.filter(f => f.status === "accepted");

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, category_id, name, icon_slug, color, image_url, total_levels")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
      } else if (data) {
        setCategories(data);
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
      setSelectionMode("random");
    }
  };

  const handleLibraryCategorySelect = (category: { id: string; name: string; icon?: string; color: string; image_url?: string | null; total_levels: number }) => {
    // Find the full category from our local state
    const fullCategory = categories.find(c => c.id === category.id);
    if (fullCategory) {
      setSelectedCategory(fullCategory);
      setSelectionMode("library");
    }
  };

  const handleOptionClick = (mode: SelectionMode) => {
    if (mode === "random") {
      selectRandomCategory();
    } else if (mode === "library") {
      setShowCategoriesModal(true);
    } else if (mode === "create") {
      setShowCreateTriviaModal(true);
    }
  };

  const clearSelection = () => {
    setSelectedCategory(null);
    setSelectionMode(null);
  };

  const hasValidSelection = selectionMode !== null && (selectionMode === "random" || selectionMode === "library") && selectedCategory !== null;

  const handleCreate = async () => {
    if (!user) return;
    if (!hasValidSelection) return;
    
    // Store friends to invite before creating room
    friendsToInviteRef.current = new Set(selectedFriends);
    
    setIsCreating(true);
    
    try {
      let room = null;
      
      if (selectedCategory) {
        // Create the room with selected category
        room = await createRoom(selectedCategory.category_id, selectedCategory.name);
      }
      
      // Send invitations immediately after room is created
      if (room && friendsToInviteRef.current.size > 0) {
        for (const friendId of friendsToInviteRef.current) {
          const friend = acceptedFriends.find(f => f.friendId === friendId);
          if (friend) {
            // Add as invited participant first
            await addInvitedParticipant(
              room.id,
              friend.friendId,
              friend.nickname,
              friend.avatarUrl,
              friend.countryCode
            );
          }
          // Then send notification
          await sendInvitation(friendId, room.id);
        }
      }
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setIsCreating(false);
    }
  };


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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Room Name Input - Compact */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground mb-1.5">{t("team.roomName")}</h2>
          <div className="relative">
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t("team.enterRoomName")}
              className="h-10 pr-10 bg-muted/50 border-border/50 text-foreground text-sm"
              maxLength={30}
            />
            <button
              onClick={() => setRoomName(generateRoomName())}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted transition-colors"
              title={t("team.randomName")}
            >
              <Shuffle className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Invite Friends - Simple Button Only */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground mb-1.5">მოწვევა</h2>
          <motion.button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border/40 hover:bg-muted transition-colors"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <UserPlus className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">მოწვევა</span>
            {selectedFriends.size > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {selectedFriends.size}
              </span>
            )}
          </motion.button>
        </div>

        {/* 3 Option Cards - Vertical List with Descriptions */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground mb-2">{t("team.category")}</h2>
          
          <div className="space-y-3">
            {/* Random Option */}
            <motion.button
              onClick={() => handleOptionClick("random")}
              className={`relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                selectionMode === "random"
                  ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25"
                  : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                selectionMode === "random" 
                  ? "bg-white/20" 
                  : "bg-purple-500/10"
              }`}>
                <Dices className={`w-6 h-6 ${selectionMode === "random" ? "text-white" : "text-purple-500"}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-semibold ${selectionMode === "random" ? "text-white" : "text-foreground"}`}>
                  შემთხვევითი
                </p>
                <p className={`text-sm ${selectionMode === "random" ? "text-white/70" : "text-muted-foreground"}`}>
                  რანდომ კატეგორია თამაშისთვის
                </p>
              </div>
            </motion.button>

            {/* Library Option */}
            <motion.button
              onClick={() => handleOptionClick("library")}
              className={`relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                selectionMode === "library"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                  : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                selectionMode === "library" 
                  ? "bg-white/20" 
                  : "bg-blue-500/10"
              }`}>
                <Library className={`w-6 h-6 ${selectionMode === "library" ? "text-white" : "text-blue-500"}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-semibold ${selectionMode === "library" ? "text-white" : "text-foreground"}`}>
                  ბიბლიოთეკა
                </p>
                <p className={`text-sm ${selectionMode === "library" ? "text-white/70" : "text-muted-foreground"}`}>
                  აირჩიე კატეგორია სიიდან
                </p>
              </div>
            </motion.button>

            {/* Create Trivia Option */}
            <motion.button
              onClick={() => handleOptionClick("create")}
              className={`relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                selectionMode === "create"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                selectionMode === "create" 
                  ? "bg-white/20" 
                  : "bg-emerald-500/10"
              }`}>
                <Sparkles className={`w-6 h-6 ${selectionMode === "create" ? "text-white" : "text-emerald-500"}`} />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-semibold ${selectionMode === "create" ? "text-white" : "text-foreground"}`}>
                  შექმენი ტრივია
                </p>
                <p className={`text-sm ${selectionMode === "create" ? "text-white/70" : "text-muted-foreground"}`}>
                  შექმენი შენი საკუთარი კითხვები
                </p>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Selected Category Preview */}
        <AnimatePresence>
          {selectedCategory && (selectionMode === "random" || selectionMode === "library") && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  {/* Category thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative">
                    {CATEGORY_VIDEOS[selectedCategory.category_id] ? (
                      <PingPongVideo
                        src={CATEGORY_VIDEOS[selectedCategory.category_id]}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full"
                        style={{ background: selectedCategory.color || "hsl(var(--primary))" }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedCategory.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectionMode === "random" ? "რანდომ კატეგორია" : "არჩეული კატეგორია"}
                    </p>
                  </div>
                  <button 
                    onClick={clearSelection} 
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Normal Button */}
      <div className="px-4 py-4 border-t border-border/30">
        <ChunkyButton
          onClick={handleCreate}
          disabled={loading || isCreating || !hasValidSelection}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {isCreating || loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          შექმნა
        </ChunkyButton>
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

      {/* Category Selector Modal */}
      <CategorySelectorModal
        open={showCategoriesModal}
        onOpenChange={setShowCategoriesModal}
        onSelect={handleLibraryCategorySelect}
        selectedCategoryId={selectedCategory?.id}
      />

      {/* Create Trivia Type Modal */}
      <CreateTriviaTypeModal
        open={showCreateTriviaModal}
        onOpenChange={setShowCreateTriviaModal}
        onSelectSingle={() => {
          navigate("/social/create");
        }}
        onSelectCollection={() => {
          navigate("/social/create-collection");
        }}
      />
    </motion.div>
  );
}
