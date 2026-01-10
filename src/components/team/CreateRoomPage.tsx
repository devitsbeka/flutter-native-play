import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, ArrowLeft, HelpCircle, Library, Sparkles, UserPlus, X, Dices, Share2, RefreshCw, Play, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFriends } from "@/hooks/useFriends";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
// Room names are AI-generated via edge function during room creation
import { TVPlayModal } from "@/components/team/TVPlayModal";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { HowItWorksModal } from "@/components/team/HowItWorksModal";
import { CategorySelectorModal } from "@/components/team/CategorySelectorModal";
import { CreateBlindTriviaModal } from "@/components/team/CreateBlindTriviaModal";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string;
}

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
  const { toast } = useToast();
  const { createRoom, loading } = useMultiplayerV2();
  const { friends } = useFriends();
  const { sendInvitation, addInvitedParticipant } = useGameInvitations();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  
  // Room name & icon state - AI-generated via edge function
  const [roomName, setRoomName] = useState<string>("იტვირთება...");
  const [roomIcon, setRoomIcon] = useState<string | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  
  const [showTVModal, setShowTVModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showCreateTriviaModal, setShowCreateTriviaModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [isSearchingRandom, setIsSearchingRandom] = useState(false);
  
  // Track friends to invite with a ref so it's available when room is created
  const friendsToInviteRef = useRef<Set<string>>(new Set());

  // Only accepted friends
  const acceptedFriends = friends.filter(f => f.status === "accepted");

  // Generate room name via edge function
  const generateRoomName = async () => {
    setIsGeneratingName(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-room-name');
      if (!error && data) {
        setRoomName(data.name || "სახალისო გუნდი");
        setRoomIcon(data.icon_url || null);
      } else {
        console.error('Error generating room name:', error);
        setRoomName("სახალისო გუნდი");
      }
    } catch (e) {
      console.error('Failed to generate room name:', e);
      setRoomName("სახალისო გუნდი");
    } finally {
      setIsGeneratingName(false);
    }
  };

  // Fetch categories from database & generate room name on mount
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
    generateRoomName();
  }, []);

  // Select random category with animation
  const selectRandomCategory = async () => {
    if (categories.length === 0) return;
    
    setIsSearchingRandom(true);
    setSelectionMode("random");
    
    // Animate through random categories
    const animationDuration = 1500;
    const intervalTime = 100;
    const iterations = animationDuration / intervalTime;
    
    for (let i = 0; i < iterations; i++) {
      const randomIndex = Math.floor(Math.random() * categories.length);
      setSelectedCategory(categories[randomIndex]);
      await new Promise(resolve => setTimeout(resolve, intervalTime));
    }
    
    // Final selection
    const finalIndex = Math.floor(Math.random() * categories.length);
    setSelectedCategory(categories[finalIndex]);
    setIsSearchingRandom(false);
  };

  const handleLibraryCategorySelect = (category: { id: string; category_id: string; name: string; icon?: string; color: string; image_url?: string | null; total_levels: number }) => {
    // Use the category directly from the modal - it already has category_id
    setSelectedCategory({
      id: category.id,
      category_id: category.category_id,
      name: category.name,
      icon_slug: category.icon || null,
      color: category.color,
      image_url: category.image_url,
      total_levels: category.total_levels,
    });
    setSelectionMode("library");
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

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Generate and share invite link
  const handleShareInviteLink = async () => {
    const baseUrl = window.location.origin;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const categoryName = selectedCategory?.name || "ტრივია";
    const inviteLink = `${baseUrl}/join?invite=${inviteCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "შემოგვიერთდი ტრივიაში! 🎮",
          text: `${categoryName} - მოდი ითამაშე ჩვენთან ერთად!`,
          url: inviteLink,
        });
      } catch (err) {
        copyToClipboard(inviteLink);
      }
    } else {
      copyToClipboard(inviteLink);
    }
  };

  const hasValidSelection = selectionMode !== null && (selectionMode === "random" || selectionMode === "library" || selectionMode === "create") && (selectedCategory !== null || selectionMode === "create");

  // State for custom trivia questions
  const [customTriviaQuestions, setCustomTriviaQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [customTriviaTitle, setCustomTriviaTitle] = useState("");
  const [customTriviaSubject, setCustomTriviaSubject] = useState("");

  // Handle blind trivia creation - questions are hidden from creator
  const handleBlindTriviaReady = async (questions: GeneratedQuestion[], title: string, subject: string) => {
    setCustomTriviaQuestions(questions);
    setCustomTriviaTitle(title);
    setCustomTriviaSubject(subject);
    setSelectionMode("create");
    
    toast({
      title: "✨ ტრივია მზადაა!",
      description: `${questions.length} კითხვა შეიქმნა - "${title}"`,
    });
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!hasValidSelection) return;
    
    // Store friends to invite before creating room
    friendsToInviteRef.current = new Set(selectedFriends);
    
    setIsCreating(true);
    
    try {
      let room = null;
      
      if (selectionMode === "create" && customTriviaQuestions) {
        // Create room with custom trivia questions
        room = await createRoom(
          "custom", 
          customTriviaTitle || "Custom Trivia",
          customTriviaQuestions
        );
      } else if (selectedCategory) {
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
        
        {/* Help Button */}
        <button
          onClick={() => setShowHowItWorksModal(true)}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Room Name with Icon - AI generated */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground mb-2">ოთახის სახელი</h2>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            {/* Icon from 9k library */}
            <div className="w-12 h-12 rounded-xl bg-background shadow-md flex items-center justify-center overflow-hidden shrink-0">
              {isGeneratingName ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : roomIcon ? (
                <img src={roomIcon} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <Sparkles className="w-5 h-5 text-primary" />
              )}
            </div>
            
            {/* Editable name */}
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={() => {
                    if (editedName.trim()) {
                      setRoomName(editedName.trim());
                    }
                    setIsEditingName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editedName.trim()) {
                        setRoomName(editedName.trim());
                      }
                      setIsEditingName(false);
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  className="w-full bg-background border border-primary/30 rounded-lg px-2 py-1 text-[16px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="ოთახის სახელი"
                />
              ) : (
                <p className="font-semibold text-foreground text-[16px] break-words leading-tight">
                  {roomName}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">AI გენერირებული</p>
            </div>
            
            {/* Edit button */}
            <button
              onClick={() => {
                setEditedName(roomName);
                setIsEditingName(true);
              }}
              disabled={isGeneratingName || isEditingName}
              className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Pencil className="w-4 h-4 text-primary" />
            </button>
            
            {/* Regenerate button */}
            <button
              onClick={generateRoomName}
              disabled={isGeneratingName}
              className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-primary ${isGeneratingName ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Invite Friends - Horizontal Scroll */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-muted-foreground">მოიწვიე მეგობრები</h2>
            {acceptedFriends.length > 5 && (
              <button 
                onClick={() => setShowInviteModal(true)}
                className="text-xs text-primary font-medium hover:underline"
              >
                ყველა
              </button>
            )}
          </div>
          
          {acceptedFriends.length > 0 ? (
            <div className="flex items-center gap-2">
              {/* Horizontal scrolling friends */}
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 pb-1">
                  {acceptedFriends.slice(0, 10).map((friend) => {
                    const isSelected = selectedFriends.has(friend.friendId);
                    return (
                      <motion.button
                        key={friend.friendId}
                        onClick={() => {
                          const newSelected = new Set(selectedFriends);
                          if (isSelected) {
                            newSelected.delete(friend.friendId);
                          } else {
                            newSelected.add(friend.friendId);
                          }
                          setSelectedFriends(newSelected);
                        }}
                        className={`relative shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                          isSelected 
                            ? "bg-primary/10 ring-2 ring-primary" 
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="relative">
                          <img 
                            src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friendId}`} 
                            alt={friend.nickname}
                            className="w-[52px] h-[52px] rounded-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground">✓</span>
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-foreground font-medium max-w-[60px] truncate">
                          {friend.nickname}
                        </span>
                      </motion.button>
                    );
                  })}
                  
                  {/* Show more button */}
                  {acceptedFriends.length > 10 && (
                    <motion.button
                      onClick={() => setShowInviteModal(true)}
                      className="shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors min-w-[68px]"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-[52px] h-[52px] rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-base text-primary font-bold">+{acceptedFriends.length - 10}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">მეტი</span>
                    </motion.button>
                  )}
                  
                  {/* Invite via link button */}
                  <motion.button
                    onClick={handleShareInviteLink}
                    className="shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-colors min-w-[68px] border border-dashed border-primary/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-[52px] h-[52px] rounded-full bg-primary/20 flex items-center justify-center">
                      <Share2 className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm text-primary font-medium">მოწვევა</span>
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <motion.button
                onClick={() => setShowInviteModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border/40 hover:bg-muted transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <UserPlus className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">აპში მეგობრები</span>
              </motion.button>
              <motion.button
                onClick={handleShareInviteLink}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 hover:from-primary/20 hover:to-accent/20 transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Share2 className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary font-medium">გაზიარება</span>
              </motion.button>
            </div>
          )}
          
          {selectedFriends.size > 0 && (
            <p className="text-xs text-primary mt-1.5">
              {selectedFriends.size} მეგობარი მოწვეული
            </p>
          )}
        </div>

        {/* 3 Option Cards - Vertical List with Descriptions */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground mb-2">{t("team.category")}</h2>
          
          <div className="space-y-3">
            {/* Random Option */}
            {selectionMode === "random" && selectedCategory && !isSearchingRandom ? (
              // Show selected random category
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25"
              >
                {/* Category video thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                  {CATEGORY_VIDEOS[selectedCategory.category_id] ? (
                    <PingPongVideo
                      src={CATEGORY_VIDEOS[selectedCategory.category_id]}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                      <Dices className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-white">{selectedCategory.name}</p>
                  <p className="text-sm text-white/70">რანდომ კატეგორია</p>
                </div>
                {/* Re-roll button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    selectRandomCategory();
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="სხვა კატეგორია"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </button>
                {/* Clear button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection();
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </motion.div>
            ) : (
              // Show random selection button
              <motion.button
                onClick={() => !isSearchingRandom && handleOptionClick("random")}
                disabled={isSearchingRandom}
                className={`relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all overflow-hidden ${
                  isSearchingRandom
                    ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
                }`}
                whileHover={{ scale: isSearchingRandom ? 1 : 1.01 }}
                whileTap={{ scale: isSearchingRandom ? 1 : 0.99 }}
              >
                {/* Searching animation overlay */}
                {isSearchingRandom && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-violet-500/40 to-purple-500/20"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                )}
                
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  isSearchingRandom
                    ? "bg-white/20" 
                    : "bg-purple-500/10"
                }`}>
                  <motion.div
                    animate={isSearchingRandom ? { rotate: 360 } : { rotate: 0 }}
                    transition={isSearchingRandom ? { duration: 0.5, repeat: Infinity, ease: "linear" } : {}}
                  >
                    <Dices className={`w-6 h-6 ${isSearchingRandom ? "text-white" : "text-purple-500"}`} />
                  </motion.div>
                </div>
                <div className="flex-1 text-left relative z-10">
                  <p className={`font-semibold ${isSearchingRandom ? "text-white" : "text-foreground"}`}>
                    {isSearchingRandom ? "ვეძებთ..." : "შემთხვევითი"}
                  </p>
                  <p className={`text-sm ${isSearchingRandom ? "text-white/70" : "text-muted-foreground"}`}>
                    {isSearchingRandom 
                      ? (selectedCategory?.name || "კატეგორიის არჩევა...") 
                      : "რანდომ კატეგორია თამაშისთვის"
                    }
                  </p>
                </div>
              </motion.button>
            )}

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

        {/* Selected Category Preview - only show for library selection (not random since it shows inline) */}
        <AnimatePresence>
          {selectedCategory && selectionMode === "library" && (
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
                    <p className="text-xs text-muted-foreground">არჩეული კატეგორია</p>
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
          
          {/* Custom Trivia Preview */}
          {selectionMode === "create" && customTriviaQuestions && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{customTriviaTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {customTriviaQuestions.length} კითხვა • 🔒 პასუხები დამალულია
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setCustomTriviaQuestions(null);
                      setCustomTriviaTitle("");
                      setCustomTriviaSubject("");
                      setSelectionMode(null);
                    }} 
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

      {/* Create Blind Trivia Modal - Hides answers from creator */}
      <CreateBlindTriviaModal
        open={showCreateTriviaModal}
        onOpenChange={setShowCreateTriviaModal}
        onTriviaReady={handleBlindTriviaReady}
      />

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
      />
    </motion.div>
  );
}
