import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, ArrowLeft, HelpCircle, UserPlus, X, Share2, RefreshCw, Play, Pencil, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFriends } from "@/hooks/useFriends";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { createNotification } from "@/hooks/useNotifications";
// Room names are AI-generated via edge function during room creation
import { TVPlayModal } from "@/components/team/TVPlayModal";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { HowItWorksModal } from "@/components/team/HowItWorksModal";
import { CategorySelectorModal } from "@/components/team/CategorySelectorModal";
import { CreateBlindTriviaModal } from "@/components/team/CreateBlindTriviaModal";
import { CreateCollectionModal } from "@/components/social/CreateCollectionModal";
import { RoomIconPickerModal } from "@/components/team/RoomIconPickerModal";
import { MyTriviasPickerModal } from "@/components/team/MyTriviasPickerModal";
import { GameStylePersonalTrivia } from "@/components/team/GameStylePersonalTrivia";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIconLibrary } from "@/hooks/useIconLibrary";
import iconCollections from "@/assets/icon-collections.png";
import storyDice from "@/assets/story-dice.png";
import secretBookcase from "@/assets/secret-bookcase.png";
import triviaBuzzer from "@/assets/trivia-buzzer-3.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import stickerAlbum from "@/assets/sticker-album.png";

// Inspirational topics for trivia creation
const INSPIRATIONAL_TOPICS = [
  { categoryId: "movies", label: "კინო" },
  { categoryId: "sports", label: "სპორტი" },
  { categoryId: "music", label: "მუსიკა" },
  { categoryId: "geography", label: "გეოგრაფია" },
  { categoryId: "world_history", label: "ისტორია" },
  { categoryId: "science", label: "მეცნიერება" },
  { categoryId: "art", label: "ხელოვნება" },
  { categoryId: "celebrities", label: "ცნობილები" },
  { categoryId: "video_games", label: "გეიმინგი" },
  { categoryId: "world_cuisine", label: "საჭმელი" },
  { categoryId: "anime_manga", label: "ანიმე" },
  { categoryId: "tv_series", label: "სერიალები" },
  { categoryId: "space", label: "კოსმოსი" },
  { categoryId: "animals", label: "ცხოველები" },
  { categoryId: "technology", label: "ტექნოლოგია" },
];

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

type SelectionMode = "random" | "library" | "create" | "my-trivias" | null;

interface CreateRoomPageProps {
  onClose: () => void;
  challengeUserId?: string | null;
  defaultChallengeType?: "random" | "library" | "my-trivias" | "create" | null;
  autoOpenPersonalTrivia?: boolean;
  preSelectedCategory?: {
    id: string;
    category_id: string;
    name: string;
    color: string;
    image_url?: string | null;
    total_levels: number;
  } | null;
}

export function CreateRoomPage({ onClose, challengeUserId, defaultChallengeType, autoOpenPersonalTrivia, preSelectedCategory }: CreateRoomPageProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createRoom, loading } = useMultiplayerV2();
  const { friends } = useFriends();
  const { sendInvitation, addInvitedParticipant } = useGameInvitations();
  const { getIconForCategory } = useIconLibrary();
  
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
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showCreateOptionsMenu, setShowCreateOptionsMenu] = useState(false);
  const [showIconPickerModal, setShowIconPickerModal] = useState(false);
  const [showMyTriviasModal, setShowMyTriviasModal] = useState(false);
  const [showPersonalTriviaModal, setShowPersonalTriviaModal] = useState(autoOpenPersonalTrivia || false);
  
  // Challenge mode state
  const [challengeTrivia, setChallengeTrivia] = useState<{ id: string; title: string; type: "trivia" | "collection" } | null>(null);
  
  // Shuffle inspirational topics when menu opens
  const shuffledTopics = useMemo(() => {
    return [...INSPIRATIONAL_TOPICS].sort(() => Math.random() - 0.5);
  }, [showCreateOptionsMenu]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [isSearchingRandom, setIsSearchingRandom] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  
  // Track friends to invite with a ref so it's available when room is created
  const friendsToInviteRef = useRef<Set<string>>(new Set());
  
  // If challenge user provided, auto-add to selected friends
  useEffect(() => {
    if (challengeUserId) {
      setSelectedFriends(new Set([challengeUserId]));
    }
  }, [challengeUserId]);

  // Only accepted friends
  const acceptedFriends = friends.filter(f => f.status === "accepted");

  // Generate room name via edge function
  const generateRoomName = async () => {
    setIsGeneratingName(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-room-name');
      if (!error && data) {
        // Strip emojis from the name - only show the library icon
        const nameWithoutEmoji = (data.name || "სახალისო გუნდი")
          .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA00}-\u{1FAFF}]/gu, '')
          .trim();
        setRoomName(nameWithoutEmoji || "სახალისო გუნდი");
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

  // Handle pre-selected category from parent (library selection)
  useEffect(() => {
    if (preSelectedCategory && categories.length > 0) {
      // Set the category directly without opening the modal
      setSelectedCategory({
        id: preSelectedCategory.id,
        category_id: preSelectedCategory.category_id,
        name: preSelectedCategory.name,
        icon_slug: null,
        color: preSelectedCategory.color,
        image_url: preSelectedCategory.image_url,
        total_levels: preSelectedCategory.total_levels,
      });
      setSelectionMode("library");
    }
  }, [preSelectedCategory, categories]);

  // Auto-trigger based on challenge type
  useEffect(() => {
    if (hasAutoTriggered || loadingCategories || categories.length === 0) return;
    
    // Skip if we have a pre-selected category (already handled above)
    if (preSelectedCategory) {
      setHasAutoTriggered(true);
      return;
    }
    
    if (defaultChallengeType) {
      setHasAutoTriggered(true);
      
      switch (defaultChallengeType) {
        case "random":
          selectRandomCategory();
          break;
        case "library":
          setShowCategoriesModal(true);
          break;
        case "my-trivias":
          setShowMyTriviasModal(true);
          break;
        case "create":
          setShowCreateOptionsMenu(true);
          setSelectionMode("create");
          break;
      }
    }
  }, [defaultChallengeType, hasAutoTriggered, loadingCategories, categories, preSelectedCategory]);

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
    } else if (mode === "my-trivias") {
      setShowMyTriviasModal(true);
    } else if (mode === "create") {
      // Toggle the sub-menu for create options
      setShowCreateOptionsMenu(!showCreateOptionsMenu);
      setSelectionMode("create");
    }
  };

  const handleMyTriviaSelect = (item: { id: string; title: string; type: "trivia" | "collection" }) => {
    setChallengeTrivia(item);
    setSelectionMode("my-trivias");
    // Update room name to trivia/collection title
    setRoomName(item.title);
  };

  const handleCreateOptionSelect = (type: "trivia" | "collection" | "personal") => {
    setShowCreateOptionsMenu(false);
    if (type === "trivia") {
      setShowCreateTriviaModal(true);
    } else if (type === "collection") {
      // Open collection modal instead of navigating
      setShowCreateCollectionModal(true);
    } else if (type === "personal") {
      setShowPersonalTriviaModal(true);
    }
  };

  // Handle personal trivia save
  const handlePersonalTriviaSave = (questions: Array<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    icon_slug?: string | null;
  }>, triviaTitle: string) => {
    setCustomTriviaQuestions(questions as GeneratedQuestion[]);
    setCustomTriviaTitle(triviaTitle);
    setCustomTriviaSubject("personal");
    setSelectionMode("create");
    setRoomName(triviaTitle);
    setIsPersonalTrivia(true);
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

  const hasValidSelection = selectionMode !== null && (selectionMode === "random" || selectionMode === "library" || selectionMode === "create" || selectionMode === "my-trivias") && (selectedCategory !== null || selectionMode === "create" || (selectionMode === "my-trivias" && challengeTrivia !== null));

  // State for custom trivia questions
  const [customTriviaQuestions, setCustomTriviaQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [customTriviaTitle, setCustomTriviaTitle] = useState("");
  const [customTriviaSubject, setCustomTriviaSubject] = useState("");
  const [isPersonalTrivia, setIsPersonalTrivia] = useState(false);

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
      
      if (selectionMode === "my-trivias" && challengeTrivia) {
        // Create room with trivia/collection reference
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("nickname, avatar_url, country_code")
          .eq("user_id", user.id)
          .single();

        const { data: codeData } = await supabase.rpc("generate_room_code");
        const roomCode = codeData || generateRoomCode();
        
        const { data: createdRoom, error } = await supabase
          .from("game_rooms")
          .insert({
            room_code: roomCode,
            host_user_id: user.id,
            room_name: roomName,
            room_icon: roomIcon,
            game_type: "async",
            game_mode: challengeTrivia.type === "collection" ? `collection:${challengeTrivia.id}` : `trivia:${challengeTrivia.id}`,
            status: "waiting",
          })
          .select()
          .single();

        if (error) throw error;

        // Add host as participant
        await supabase.from("room_participants").insert({
          room_id: createdRoom.id,
          user_id: user.id,
          nickname: userProfile?.nickname || "Player",
          avatar_url: userProfile?.avatar_url,
          country_code: userProfile?.country_code || "GE",
          is_host: true,
          status: "joined",
        });

        room = createdRoom;
        
        // Close modal and navigate to room after creation
        onClose();
        navigate(`/team?join=${roomCode}`);
      } else if (selectionMode === "create" && customTriviaQuestions) {
        // Create room with custom trivia questions
        room = await createRoom(
          "custom", 
          customTriviaTitle || "Custom Trivia",
          customTriviaQuestions,
          roomName,
          roomIcon
        );
      } else if (selectedCategory) {
        // Create the room with selected category
        room = await createRoom(selectedCategory.category_id, selectedCategory.name, undefined, roomName, roomIcon);
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
        
        // Small delay to ensure DB writes complete before navigation
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // If this is a challenge, also send a notification to the challenged user
        if (challengeUserId && !acceptedFriends.find(f => f.friendId === challengeUserId)) {
          // The user may not be in friends list, so add them as participant
          const { data: targetProfile } = await supabase
            .from("profiles")
            .select("nickname, avatar_url, country_code")
            .eq("user_id", challengeUserId)
            .single();
          
          if (targetProfile) {
            await addInvitedParticipant(
              room.id,
              challengeUserId,
              targetProfile.nickname,
              targetProfile.avatar_url,
              targetProfile.country_code
            );
          }
          await sendInvitation(challengeUserId, room.id);
          
          // Create challenge notification
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("nickname")
            .eq("user_id", user.id)
            .single();
          
          await createNotification(
            challengeUserId,
            "challenge",
            `${userProfile?.nickname || "მეგობარი"} გიწვევს თამაშში!`,
            roomName,
            {
              room_id: room.id,
              room_code: room.room_code,
              sender_id: user.id,
            }
          );
          
          // Small delay to ensure DB writes complete
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const generateRoomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
          <h2 className="text-xs font-medium text-muted-foreground mb-2">შეარჩიე ოთახის სახელი</h2>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            {/* Icon from 9k library - clickable to open picker */}
            <button
              onClick={() => setShowIconPickerModal(true)}
              disabled={isGeneratingName}
              className="relative w-12 h-12 rounded-xl bg-background shadow-md flex items-center justify-center overflow-hidden shrink-0 transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer group"
            >
              {isGeneratingName ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : roomIcon ? (
                <>
                  <img src={roomIcon} alt="" className="w-8 h-8 object-contain" />
                  <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-4 h-4 text-primary-foreground" />
                  </div>
                </>
              ) : (
                <img src={triviaBuzzer} alt="" className="w-6 h-6 object-contain" />
              )}
            </button>
            
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
                  className="w-full bg-background border border-primary/30 rounded-lg px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="ოთახის სახელი"
                />
              ) : (
                <p className="font-semibold text-foreground text-sm truncate">
                  {roomName}
                </p>
              )}
            </div>
            
            {/* Edit button - opens modal for both name and icon */}
            <button
              onClick={() => setShowIconPickerModal(true)}
              disabled={isGeneratingName}
              className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
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
            <h2 className="text-xs font-medium text-muted-foreground">მოიწვიე მეგობრები სათამაშოდ</h2>
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
                <div className="flex gap-3 pb-1 pt-1 pl-1">
                  {/* Invite via link button - FIRST */}
                  <motion.button
                    onClick={handleShareInviteLink}
                    className="shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-colors min-w-[68px] border border-dashed border-primary/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-[52px] h-[52px] rounded-full bg-primary/20 flex items-center justify-center">
                      <Share2 className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs text-primary font-medium">მოწვევა</span>
                  </motion.button>
                  
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
                        <span className="text-xs text-foreground font-medium max-w-[70px] truncate">
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
                      <span className="text-xs text-muted-foreground">მეტი</span>
                    </motion.button>
                  )}
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
          <h2 className="text-xs font-medium text-muted-foreground mb-2">რას ითამაშებთ?</h2>
          
          <div className="space-y-3">
            {/* Random Option - Container that expands to show preview */}
            <div className="rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                {selectionMode === "random" && selectedCategory && !isSearchingRandom ? (
                  // Expanded state - video preview inside the button area
                  <motion.div
                    key="random-preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full aspect-video"
                  >
                    {/* Video/Gradient Background */}
                    {CATEGORY_VIDEOS[selectedCategory.category_id] ? (
                      <>
                        <PingPongVideo
                          src={CATEGORY_VIDEOS[selectedCategory.category_id]}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-violet-600" />
                    )}
                    
                    {/* Overlaid Info Bar at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                          <img src={storyDice} alt="" className="w-6 h-6 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate drop-shadow-lg">
                            {selectedCategory.name}
                          </p>
                          <p className="text-xs text-white/80">
                            რანდომ კატეგორია თამაშისთვის
                          </p>
                        </div>
                        {/* Re-roll button */}
                        <button 
                          onClick={selectRandomCategory}
                          className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg transition-colors"
                          title="სხვა კატეგორია"
                        >
                          <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                        {/* Clear button */}
                        <button 
                          onClick={clearSelection}
                          className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  // Collapsed state - regular button
                  <motion.button
                    key="random-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => !isSearchingRandom && handleOptionClick("random")}
                    disabled={isSearchingRandom}
                    className={`relative w-full flex items-center gap-4 p-4 transition-all overflow-hidden ${
                      isSearchingRandom
                        ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25"
                        : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
                    }`}
                  >
                    {/* Searching animation overlay */}
                    {isSearchingRandom && (
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-violet-500/40 to-purple-500/20"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <motion.div
                        animate={isSearchingRandom ? { rotate: 360 } : { rotate: 0 }}
                        transition={isSearchingRandom ? { duration: 0.5, repeat: Infinity, ease: "linear" } : {}}
                      >
                        <img src={storyDice} alt="" className="w-8 h-8 object-contain" />
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
              </AnimatePresence>
            </div>

            {/* Library Option - Container that expands to show preview */}
            <div className="rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                {selectionMode === "library" && selectedCategory ? (
                  // Expanded state - video preview inside the button area
                  <motion.div
                    key="library-preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full aspect-video"
                  >
                    {/* Video/Gradient Background */}
                    {CATEGORY_VIDEOS[selectedCategory.category_id] ? (
                      <>
                        <PingPongVideo
                          src={CATEGORY_VIDEOS[selectedCategory.category_id]}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      </>
                    ) : (
                      <div 
                        className="w-full h-full"
                        style={{ background: `linear-gradient(135deg, ${selectedCategory.color || 'hsl(var(--primary))'}, ${selectedCategory.color || 'hsl(var(--primary))'}dd)` }}
                      />
                    )}
                    
                    {/* Overlaid Info Bar at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                          <img src={secretBookcase} alt="" className="w-6 h-6 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate drop-shadow-lg">
                            {selectedCategory.name}
                          </p>
                          <p className="text-xs text-white/80">
                            არჩეული კატეგორია
                          </p>
                        </div>
                        {/* Clear button */}
                        <button 
                          onClick={clearSelection}
                          className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  // Collapsed state - regular button
                  <motion.button
                    key="library-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => handleOptionClick("library")}
                    className={`relative w-full flex items-center gap-4 p-4 transition-all ${
                      selectionMode === "library" && !selectedCategory
                        ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                        : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <img src={secretBookcase} alt="" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${selectionMode === "library" && !selectedCategory ? "text-white" : "text-foreground"}`}>
                        ბიბლიოთეკა
                      </p>
                      <p className={`text-sm ${selectionMode === "library" && !selectedCategory ? "text-white/70" : "text-muted-foreground"}`}>
                        აირჩიე კატეგორია სიიდან
                      </p>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* My Trivias Option - User's created content */}
            <div className="rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                {selectionMode === "my-trivias" && challengeTrivia ? (
                  <motion.div
                    key="my-trivia-selected"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative overflow-hidden rounded-2xl"
                  >
                    <div className="p-4 bg-gradient-to-r from-pink-500 to-rose-600">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                          <img src={stickerAlbum} alt="" className="w-8 h-8 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate drop-shadow-lg">
                            {challengeTrivia.title}
                          </p>
                          <p className="text-xs text-white/80">
                            {challengeTrivia.type === "collection" ? "კოლექცია" : "ტრივია"}
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowMyTriviasModal(true)}
                          className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                        <button 
                          onClick={() => {
                            setChallengeTrivia(null);
                            setSelectionMode(null);
                            setRoomName("");
                          }}
                          className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="my-trivia-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => handleOptionClick("my-trivias")}
                    className={`relative w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      selectionMode === "my-trivias" && !challengeTrivia
                        ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25"
                        : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <img src={stickerAlbum} alt="" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${selectionMode === "my-trivias" && !challengeTrivia ? "text-white" : "text-foreground"}`}>
                        ჩემი შექმნილი ტრივიები
                      </p>
                      <p className={`text-sm ${selectionMode === "my-trivias" && !challengeTrivia ? "text-white/70" : "text-muted-foreground"}`}>
                        აირჩიე შენი შექმნილი ტრივიებიდან
                      </p>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Create Trivia Option - Container that expands to show sub-options */}
            <div className="rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                {showCreateOptionsMenu && selectionMode === "create" && !customTriviaQuestions ? (
                  // Expanded state - show inspirational chips + 2 sub-options
                  <motion.div
                    key="create-options"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-semibold">აირჩიე ტიპი</p>
                      <button 
                        onClick={() => {
                          setShowCreateOptionsMenu(false);
                          setSelectionMode(null);
                        }}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    
                    
                    {/* Trivia Option */}
                    <motion.button
                      onClick={() => handleCreateOptionSelect("trivia")}
                      className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        <img src={triviaBuzzer} alt="" className="w-8 h-8 object-contain" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">ტრივია</p>
                        <p className="text-xs text-white/70">1 რაუნდი, სწრაფი შექმნა</p>
                      </div>
                    </motion.button>
                    
                    {/* Collection Option */}
                    <motion.button
                      onClick={() => handleCreateOptionSelect("collection")}
                      className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        <img src={iconCollections} alt="" className="w-9 h-9 object-contain" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">კოლექცია</p>
                        <p className="text-xs text-white/70">რამდენიმე რაუნდი ერთად</p>
                      </div>
                    </motion.button>
                    
                    {/* MyTrivia Party Option */}
                    <motion.button
                      onClick={() => handleCreateOptionSelect("personal")}
                      className="w-full flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        <img src={iconGroupOfPeople} alt="" className="w-9 h-9 object-contain" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white">MyTrivia Party</p>
                        <p className="text-xs text-white/70">შენი კითხვები, შენი პასუხები</p>
                      </div>
                    </motion.button>
                  </motion.div>
                ) : (
                  // Collapsed state - regular button
                  <motion.button
                    key="create-button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => handleOptionClick("create")}
                    className={`relative w-full flex items-center gap-4 p-4 transition-all ${
                      selectionMode === "create" && customTriviaQuestions
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                        : "bg-muted/50 border border-border/50 text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <img src={triviaBuzzer} alt="" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${selectionMode === "create" && customTriviaQuestions ? "text-white" : "text-foreground"}`}>
                        შექმენი ტრივია
                      </p>
                      <p className={`text-sm ${selectionMode === "create" && customTriviaQuestions ? "text-white/70" : "text-muted-foreground"}`}>
                        შექმენი შენი საკუთარი კითხვები
                      </p>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Custom Trivia Preview */}
        <AnimatePresence>
          {selectionMode === "create" && customTriviaQuestions && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="overflow-hidden"
            >
              <div 
                className={cn(
                  "p-3 rounded-xl border",
                  isPersonalTrivia 
                    ? "bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/20 cursor-pointer hover:border-pink-500/40 transition-colors"
                    : "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
                )}
                onClick={isPersonalTrivia ? () => setShowPersonalTriviaModal(true) : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
                    isPersonalTrivia 
                      ? "bg-gradient-to-br from-pink-500 to-rose-600"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  )}>
                    {isPersonalTrivia ? (
                      <img src={iconGroupOfPeople} alt="" className="w-8 h-8 object-contain" />
                    ) : (
                      <img src={triviaBuzzer} alt="" className="w-8 h-8 object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{customTriviaTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {customTriviaQuestions.length} კითხვა • {isPersonalTrivia ? "✏️ დააჭირე რედაქტირებისთვის" : "🔒 პასუხები დამალულია"}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomTriviaQuestions(null);
                      setCustomTriviaTitle("");
                      setCustomTriviaSubject("");
                      setSelectionMode(null);
                      setIsPersonalTrivia(false);
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

      {/* Create Collection Modal */}
      <CreateCollectionModal
        open={showCreateCollectionModal}
        onOpenChange={setShowCreateCollectionModal}
        onCollectionCreated={() => {
          // After collection is created, could auto-select it for the room
          toast({
            title: "✨ კოლექცია შეიქმნა!",
            description: "ახლა შეგიძლია გამოიყენო მეგობრებთან ერთად",
          });
        }}
      />

      {/* Room Icon Picker Modal */}
      <RoomIconPickerModal
        isOpen={showIconPickerModal}
        onClose={() => setShowIconPickerModal(false)}
        currentIconUrl={roomIcon}
        roomName={roomName}
        onConfirm={(iconUrl, newName) => {
          setRoomIcon(iconUrl);
          setRoomName(newName);
        }}
      />

      {/* My Trivias Picker Modal */}
      <MyTriviasPickerModal
        open={showMyTriviasModal}
        onOpenChange={setShowMyTriviasModal}
        onSelect={handleMyTriviaSelect}
      />

      {/* Personal Trivia Modal - Game UI Style */}
      <GameStylePersonalTrivia
        isOpen={showPersonalTriviaModal}
        onClose={() => setShowPersonalTriviaModal(false)}
        onSave={handlePersonalTriviaSave}
        initialData={isPersonalTrivia && customTriviaQuestions ? {
          title: customTriviaTitle,
          questions: customTriviaQuestions.map(q => ({
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            incorrect_answers: q.incorrect_answers,
            icon_slug: q.icon_slug
          }))
        } : null}
      />
    </motion.div>
  );
}
