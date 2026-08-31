import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { anyBlockedText, containsBlockedText } from "@/utils/contentFilter";
import { Loader2, ArrowLeft, HelpCircle, UserPlus, X, Share2, RefreshCw, Play, Pencil, Gamepad2, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { localizeCategoryNames } from "@/utils/localizeCategories";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { readAppLanguage } from "@/utils/appLanguage";
import { useFriends } from "@/hooks/useFriends";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { categoryGradient } from "@/utils/categoryGradient";
import { useResponsiveVideo } from "@/hooks/useResponsiveVideo";
import { createNotification } from "@/hooks/useNotifications";
// Room names are AI-generated via edge function during room creation
import { TVPlayModal } from "@/components/team/TVPlayModal";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { HowItWorksModal } from "@/components/team/HowItWorksModal";
import { CategorySelectorModal } from "@/components/team/CategorySelectorModal";
import { CategoryPickerModal } from "@/components/team/CategoryPickerModal";
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
import iconDiceCard from "@/assets/play-chooser/icon-dice.webp";
import iconKingCard from "@/assets/play-chooser/icon-king.webp";
import iconCrateCard from "@/assets/play-chooser/icon-crate.png";
import iconFriendsCard from "@/assets/play-chooser/icon-friends.webp";
import { useMyRooms } from "@/hooks/useMyRooms";
import { PreRoomQueuePreview } from "@/components/team/PreRoomQueuePreview";
import { getRandomGradient } from "@/config/roomGradients";
import { siteUrl } from "@/config/site";
import { inviteLinkPath } from "@/utils/inviteLink";

/**
 * A room code, six characters of an alphabet with no O/0/I/1 in it.
 *
 * Hoisted out of the component because the code is now decided BEFORE the
 * room is created — see plannedRoomCode.
 */
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
import { useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";
import { resolveAvatarUrl, fallbackAvatarFor } from "@/utils/avatarUtils";
import { shareOrCopy } from "@/utils/shareLink";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

// Inspirational topics for trivia creation
const INSPIRATIONAL_TOPIC_KEYS = [
  { categoryId: "movies", labelKey: "extra.inspirationalMovies" },
  { categoryId: "sports", labelKey: "extra.inspirationalSports" },
  { categoryId: "music", labelKey: "extra.inspirationalMusic" },
  { categoryId: "geography", labelKey: "extra.inspirationalGeography" },
  { categoryId: "world_history", labelKey: "extra.inspirationalHistory" },
  { categoryId: "science", labelKey: "extra.inspirationalScience" },
  { categoryId: "art", labelKey: "extra.inspirationalArt" },
  { categoryId: "celebrities", labelKey: "extra.inspirationalCelebrities" },
  { categoryId: "video_games", labelKey: "extra.inspirationalGaming" },
  { categoryId: "world_cuisine", labelKey: "extra.inspirationalFood" },
  { categoryId: "anime_manga", labelKey: "extra.inspirationalAnime" },
  { categoryId: "tv_series", labelKey: "extra.inspirationalTVSeries" },
  { categoryId: "space", labelKey: "extra.inspirationalSpace" },
  { categoryId: "animals", labelKey: "extra.inspirationalAnimals" },
  { categoryId: "technology", labelKey: "extra.inspirationalTechnology" },
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

/**
 * The four game cards of the redesigned screen (Figma 926-10187): Random
 * first, then the two new lounges, then the classic friends room last —
 * "classic" reveals the sources the room game has always had (random /
 * library / my trivia) below the card reel.
 */
type GameChoice = "random" | "king" | "battle" | "classic";

/** A person to seat as "invited" — a friend, or a member of a picked room. */
type InvitePerson = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  countryCode?: string | null;
};

// The team-circle gradients from the design, dealt to rooms by id hash so a
// room keeps its color between opens.
const ROOM_GRADS = [
  "linear-gradient(to bottom, rgba(9,85,219,0.56), rgba(103,180,253,0.56))",
  "linear-gradient(to bottom, rgba(253,183,5,0.56), rgba(103,180,253,0.56))",
  "linear-gradient(to bottom, rgba(113,37,213,0.56), rgba(103,180,253,0.56))",
];
function roomGradIndex(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % ROOM_GRADS.length;
}

type PreRoomQueueItem = {
  tmpId: string;
  source_type: "category" | "random" | "user_trivia";
  category_id?: string | null;
  category_name?: string | null;
  user_trivia_id?: string | null;
  icon_slug?: string | null;
};

type PreRoomQueueItemInput = Omit<PreRoomQueueItem, "tmpId">;

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
  const bubbleVideo = useResponsiveVideo("/videos/floating-blob.mp4");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createRoom, loading } = useMultiplayerV2();

  /**
   * The code the room WILL have, decided before the room exists.
   *
   * Sharing from this screen used to be impossible to get right. There was no
   * room to point at, so the link pointed at nothing and the far end guessed a
   * room from what the host was in — which found the lobby they opened two
   * hours ago. Removing the guess fixed that and broke this: the link became a
   * friend request, and sending one to somebody who is already your friend
   * offers them nothing at all.
   *
   * A room code is six random characters generated on this device, so it can
   * be decided now and used when the room is actually created. The link names
   * it, like every other room invite, and resolves the moment the room exists.
   * If the host never presses Create, the link finds no room and falls back to
   * the friendship — which is the correct answer for a room that was never
   * made, and the only case where a link from here is a friend request.
   */
  const [plannedRoomCode] = useState(generateRoomCode);
  const { friends } = useFriends();
  const { sendInvitation, addInvitedParticipant } = useGameInvitations();
  const { getIconForCategory } = useIconLibrary();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // Which game the room is for. A pre-selected category or a classic
  // challenge lands on the classic card; everything else starts on Random.
  const [gameChoice, setGameChoice] = useState<GameChoice>(() =>
    preSelectedCategory || (defaultChallengeType && defaultChallengeType !== "random")
      ? "classic"
      : "random",
  );
  // Whole rooms picked in the invite reel — creating invites all their players.
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const { rooms: myRooms } = useMyRooms({ limit: 12 });
  const inviteRooms = useMemo(
    () =>
      myRooms
        .filter((r) => r.participants.some((p) => p.user_id !== user?.id))
        .slice(0, 6),
    [myRooms, user?.id],
  );
  
  // Room name & icon state - AI-generated via edge function
  const [roomName, setRoomName] = useState<string>(t("extra.loadingState"));
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
  const [collectionInitialSubject, setCollectionInitialSubject] = useState<string>("");
  const [showCreateOptionsMenu, setShowCreateOptionsMenu] = useState(false);
  const [showIconPickerModal, setShowIconPickerModal] = useState(false);
  const [showMyTriviasModal, setShowMyTriviasModal] = useState(false);
  const [showPersonalTriviaModal, setShowPersonalTriviaModal] = useState(autoOpenPersonalTrivia || false);

  // Pre-room queue builder (extra rounds before entering lobby)
  const [queuedRounds, setQueuedRounds] = useState<PreRoomQueueItem[]>([]);
  const [showQueuePicker, setShowQueuePicker] = useState(false);
  
  // Challenge mode state
  const [challengeTrivia, setChallengeTrivia] = useState<{ id: string; title: string; type: "trivia" | "collection" } | null>(null);
  
  // Shuffle inspirational topics when menu opens
  const shuffledTopics = useMemo(() => {
    return [...INSPIRATIONAL_TOPIC_KEYS].sort(() => Math.random() - 0.5);
  }, [showCreateOptionsMenu]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [isSearchingRandom, setIsSearchingRandom] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  
  // Friends invited from the "see all" modal (or via a challenge) float to the
  // front of the reel so they're visible as selected without scrolling. Kept
  // separate from selectedFriends so tapping inside the reel doesn't reshuffle
  // the avatars under the user's finger.
  const [pinnedFriendIds, setPinnedFriendIds] = useState<string[]>([]);

  // If challenge user provided, auto-add to selected friends
  useEffect(() => {
    if (challengeUserId) {
      setSelectedFriends(new Set([challengeUserId]));
      setPinnedFriendIds([challengeUserId]);
    }
  }, [challengeUserId]);

  // Only accepted friends
  const acceptedFriends = useMemo(
    () => friends.filter(f => f.status === "accepted"),
    [friends]
  );

  // Reel order: invited friends first (in the order they were picked), the rest
  // keep their original order — Array.prototype.sort is stable.
  const reelFriends = useMemo(() => {
    if (pinnedFriendIds.length === 0) return acceptedFriends;
    const rank = new Map(pinnedFriendIds.map((id, index) => [id, index]));
    return [...acceptedFriends].sort(
      (a, b) =>
        (rank.get(a.friendId) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.friendId) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [acceptedFriends, pinnedFriendIds]);

  // Everyone the Create press will seat as invited: picked friends plus
  // every player of every picked room, minus self, deduplicated.
  const collectInvitees = (): InvitePerson[] => {
    const seen = new Set<string>();
    const out: InvitePerson[] = [];
    selectedFriends.forEach((id) => {
      const friend = acceptedFriends.find((f) => f.friendId === id);
      if (friend && !seen.has(id)) {
        seen.add(id);
        out.push({
          id,
          nickname: friend.nickname,
          avatarUrl: friend.avatarUrl,
          countryCode: friend.countryCode,
        });
      }
    });
    selectedRooms.forEach((roomId) => {
      const picked = inviteRooms.find((r) => r.id === roomId);
      picked?.participants.forEach((p) => {
        if (p.user_id !== user?.id && !seen.has(p.user_id)) {
          seen.add(p.user_id);
          out.push({ id: p.user_id, nickname: p.nickname, avatarUrl: p.avatar_url });
        }
      });
    });
    return out;
  };

  // Get current language for room name generation
  const currentLanguage = readAppLanguage();
  const defaultFallback = currentLanguage === 'ka' ? 'სახალისო გუნდი' : 'Fun Squad';

  // Generate room name via edge function
  const generateRoomName = async () => {
    setIsGeneratingName(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-room-name', {
        body: { language: currentLanguage }
      });
      if (!error && data) {
        // Strip emojis from the name - only show the library icon
        const nameWithoutEmoji = (data.name || defaultFallback)
          .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA00}-\u{1FAFF}]/gu, '')
          .trim();
        setRoomName(nameWithoutEmoji || defaultFallback);
        setRoomIcon(data.icon_url || null);
      } else {
        console.error('Error generating room name:', error);
        setRoomName(defaultFallback);
        toast({
          title: t("common.error"),
          description: t("extra.nameGenerationError"),
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error('Failed to generate room name:', e);
      setRoomName(defaultFallback);
      toast({
        title: t("common.error"),
        description: t("extra.nameGenerationError"),
        variant: "destructive",
      });
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
        .select("id, category_id, name, icon_slug, color, image_url, total_levels, is_language_specific, language")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
      } else if (data) {
        // categories.name is Georgian; overlay the reader's language so the
        // random pick and its slot animation aren't Georgian under an
        // English UI.
        setCategories(await localizeCategoryNames(filterCategoriesForLanguage(data)));
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

  // The Random card is the default: the moment categories arrive (or the
  // card is re-picked after a clear) the dice roll runs, so Create is one
  // tap away without an extra choice.
  useEffect(() => {
    if (gameChoice !== "random" || loadingCategories || categories.length === 0) return;
    if (selectedCategory || isSearchingRandom) return;
    void selectRandomCategory();
  }, [gameChoice, loadingCategories, categories, selectedCategory, isSearchingRandom]);

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

  const hasAnyCreatedTriviasOrCollections = async () => {
    if (!user?.id) return false;

    const [{ data: trivia }, { data: collection }] = await Promise.all([
      supabase
        .from("user_quiz_posts")
        .select("id")
        .eq("user_id", user.id)
        .neq("subject", "personal")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("quiz_collections")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);

    return !!(trivia?.id || collection?.id);
  };

  const handleOptionClick = async (mode: SelectionMode) => {
    if (mode === "random") {
      selectRandomCategory();
      return;
    }
    if (mode === "library") {
      setShowCategoriesModal(true);
      return;
    }
    if (mode === "my-trivias") {
      const hasAny = await hasAnyCreatedTriviasOrCollections();
      if (!hasAny) {
        // No content yet → take user directly to Create Trivia (screen #2)
        onClose();
        navigate("/team", { state: { openTrivia: true } });
        return;
      }
      setShowMyTriviasModal(true);
      return;
    }
    if (mode === "create") {
      // Toggle the sub-menu for create options
      setShowCreateOptionsMenu(!showCreateOptionsMenu);
      setSelectionMode("create");
    }
  };

  const handleMyTriviaSelect = (item: { id: string; title: string; type: "trivia" | "collection" }) => {
    setChallengeTrivia(item);
    setSelectionMode("my-trivias");
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
    setQueuedRounds([]);
  };

  const handleAddPreRoomQueueItem = (item: PreRoomQueueItemInput) => {
    const tmpId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setQueuedRounds((prev) => [...prev, { ...item, tmpId }]);
    toast({
      title: t("extra.addedToQueue"),
      description: `${item.category_name || t("extra.randomOption")}`,
    });
  };

  const removeQueuedRound = (tmpId: string) => {
    setQueuedRounds((prev) => prev.filter((x) => x.tmpId !== tmpId));
  };

  const persistQueuedRounds = async (roomId: string) => {
    if (!queuedRounds.length) return;
    await supabase.from("room_category_queue").insert(
      queuedRounds.map((item, idx) => ({
        room_id: roomId,
        position: idx,
        source_type: item.source_type,
        category_id: item.category_id || null,
        category_name: item.category_name || null,
        user_trivia_id: item.user_trivia_id || null,
        icon_slug: item.icon_slug || null,
      }))
    );

    // Reliability: ensure the lobby sees the queue immediately after navigation/context switch.
    // (Prevents a perceived "lost progress" if the next screen renders before the first fetch.)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('room_category_queue')
        .select('id')
        .eq('room_id', roomId)
        .limit(1);
      if (!error && data) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  // Share a link to the team page. The room doesn't exist yet at this
  // point, so there is no room code to embed — the previous version shared
  // a random made-up code that nothing could ever redeem. siteUrl keeps the
  // link on the production domain even from the native app.
  const handleShareInviteLink = async () => {
    const categoryName = selectedCategory?.name || "Trivia";
    // Was a bare /team, which told whoever opened it nothing: not who sent
    // it, not what they were playing. The sender's own invite link says both,
    // and makes them friends when it is accepted.
    // Names the room this screen is about to create — see plannedRoomCode.
    const { data: inviteCode } = await supabase.rpc("get_or_create_invite_code");
    const inviteLink = inviteCode
      ? siteUrl(inviteLinkPath(inviteCode, { kind: "room", roomCode: plannedRoomCode }))
      : siteUrl("/team");

    const outcome = await shareOrCopy({
      title: t("extra.joinTriviaShare"),
      text: t("extra.joinTriviaShareText", { category: categoryName }),
      url: inviteLink,
    });
    if (outcome === "copied") toast({ description: t("team.linkCopied") });
    if (outcome === "failed") toast({ description: t("team.shareFailed"), variant: "destructive" });
  };

  // State for custom trivia questions
  const [customTriviaQuestions, setCustomTriviaQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [customTriviaTitle, setCustomTriviaTitle] = useState("");
  const [customTriviaSubject, setCustomTriviaSubject] = useState("");
  const [isPersonalTrivia, setIsPersonalTrivia] = useState(false);
  const [createdTriviaId, setCreatedTriviaId] = useState<string | null>(null);

  // Simplified validation logic using switch/case (moved after state declarations)
  const hasValidSelection = useMemo(() => {
    switch (selectionMode) {
      case "random":
        return true; // Random always valid
      case "library":
        return selectedCategory !== null;
      case "create":
        return customTriviaQuestions !== null && customTriviaQuestions.length > 0;
      case "my-trivias":
        return challengeTrivia !== null;
      default:
        return false;
    }
  }, [selectionMode, selectedCategory, customTriviaQuestions, challengeTrivia]);

  // The lounges are always ready to enter; Random needs a settled roll;
  // classic keeps its per-source validity.
  const createEnabled =
    gameChoice === "king" || gameChoice === "battle"
      ? true
      : gameChoice === "random"
        ? selectionMode === "random" && !!selectedCategory && !isSearchingRandom
        : hasValidSelection;

  // Handle blind trivia creation - questions are hidden from creator
  // IMPORTANT: This now persists the trivia to user_quiz_posts so it appears in "My Trivia"
  const handleBlindTriviaReady = async (questions: GeneratedQuestion[], title: string, subject: string) => {
    if (!user) return;

    // Played with (and shareable to) other people — same screen as every
    // other publish path.
    if (anyBlockedText([title, subject, ...questions.flatMap((q) => [q.question_text, q.correct_answer, ...(q.incorrect_answers || [])])])) {
      toast({ title: t("extra.textNotAllowed"), variant: "destructive" });
      return;
    }

    // 1. Generate hashtags from subject
    const hashtags = subject
      .split(/[\s,]+/)
      .filter(word => word.length > 2)
      .slice(0, 5)
      .map(word => `#${word.replace(/[^a-zA-Zა-ჰ0-9]/g, "")}`);

    // 2. Format questions for storage
    const questionsToSave = questions.map(q => ({
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers,
      difficulty: q.difficulty || "medium",
      iconSlug: q.icon_slug || null,
    }));

    // 3. Get random gradient for cover
    const gradientId = getRandomGradient();

    // 4. Insert into user_quiz_posts to persist the trivia
    const { data: newTrivia, error } = await supabase
      .from("user_quiz_posts")
      .insert([{
        user_id: user.id,
        title,
        subject,
        hashtags,
        cover_gradient: `gradient:${gradientId}`,
        question_count: questions.length,
        answer_format: questions[0]?.incorrect_answers?.length === 1 ? 'true_false' : 'multiple',
        questions: structuredClone(questionsToSave) as unknown as Json,
        icon_slug: questions[0]?.icon_slug || null,
        is_public: false,
        is_blind: true, // Creator never saw answers (play mode)
      }])
      .select()
      .single();

    if (error) {
      console.error("Error saving trivia:", error);
      toast({
        title: t("extra.savingError"),
        description: t("extra.savingFailed"),
        variant: "destructive",
      });
      return;
    }

    // 5. Invalidate queries to refresh lists
    queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
    queryClient.invalidateQueries({ queryKey: ["my-trivias-for-room"] });
    queryClient.invalidateQueries({ queryKey: ["my-recent-trivias-widget"] });

    // 6. Store the new trivia ID for room creation & set state
    setChallengeTrivia({ id: newTrivia.id, title, type: "trivia" });
    setSelectionMode("my-trivias");
    
    toast({
      title: t("extra.triviaReady"),
      description: t("extra.triviaReadyDesc", { count: questions.length, title }),
    });
  };

  const handleCreate = async () => {
    if (!user) return;
    if (isCreating) return;

    // The lounges create their own room the moment they open; the people
    // picked here ride along in router state and get seated as invited
    // once that room exists.
    if (gameChoice === "king" || gameChoice === "battle") {
      const invite = collectInvitees();
      onClose();
      navigate(gameChoice === "king" ? "/king" : "/team-battle", { state: { invite } });
      return;
    }

    if (!createEnabled) return;

    // NOTE: no waiting for the AI room name - performCreate falls back to the
    // default name if generation hasn't finished. The name is cosmetic and
    // must never delay the game.

    // Lock before creating - a double-tap would otherwise create two rooms
    // (performCreate re-sets and clears it)
    setIsCreating(true);
    try {
      await performCreate();
    } catch (error) {
      console.error("Room create error:", error);
      setIsCreating(false);
    }
  };

  const performCreate = async () => {
    if (!user) return;

    // Resolve everyone to invite before creating the room
    const invitees = collectInvitees();

    // If the AI name hasn't arrived yet, create with the fallback name
    // immediately - never make the user wait on a cosmetic edge function
    const effectiveRoomName =
      roomName === t("extra.loadingState") || isGeneratingName ? defaultFallback : roomName;

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

        // Local code generation - the uniqueness RPC cost a round-trip for a
        // collision chance of ~1 in a billion
        const roomCode = plannedRoomCode;

        const { data: createdRoom, error } = await supabase
          .from("game_rooms")
          .insert({
            room_code: roomCode,
            host_user_id: user.id,
            room_name: effectiveRoomName,
            room_icon: roomIcon,
            // Ensure lobby can render the initial selection (otherwise it appears empty)
            category_name: challengeTrivia.title,
            game_type: "async",
            game_mode: challengeTrivia.type === "collection" ? `collection:${challengeTrivia.id}` : `trivia:${challengeTrivia.id}`,
            // CRITICAL: Set user_trivia_id for trivia type so TVSetupInline can find it
            user_trivia_id: challengeTrivia.type === "trivia" ? challengeTrivia.id : null,
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

        // Persist any queued rounds before navigating to lobby
        await persistQueuedRounds(createdRoom.id);
        
        // Close modal and navigate to room after creation
        onClose();
        navigate(`/team?join=${roomCode}`);
      } else if (selectionMode === "create" && customTriviaQuestions) {
        // Create room with custom trivia questions
        // If we have a createdTriviaId, link the room to the persisted trivia
        if (createdTriviaId) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("nickname, avatar_url, country_code")
            .eq("user_id", user.id)
            .single();

          const roomCode = plannedRoomCode;

          const { data: createdRoom, error } = await supabase
            .from("game_rooms")
            .insert({
              room_code: roomCode,
              host_user_id: user.id,
              room_name: effectiveRoomName,
              room_icon: roomIcon,
              category_name: customTriviaTitle,
              game_type: "async",
              game_mode: `trivia:${createdTriviaId}`,
              user_trivia_id: createdTriviaId,
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
          await persistQueuedRounds(createdRoom.id);
          
          onClose();
          navigate(`/team?join=${roomCode}`);
        } else {
          // Fallback to old behavior if no persisted trivia ID
          room = await createRoom(
            "custom",
            customTriviaTitle || "Custom Trivia",
            customTriviaQuestions,
            effectiveRoomName,
            roomIcon,
            plannedRoomCode
          );

          if (room?.id) {
            await persistQueuedRounds(room.id);
          }
        }
      } else if (selectedCategory) {
        // Create the room with selected category
        room = await createRoom(selectedCategory.category_id, selectedCategory.name, undefined, effectiveRoomName, roomIcon, plannedRoomCode);

        if (room?.id) {
          await persistQueuedRounds(room.id);
        }
      }
      
      // Send invitations immediately after room is created — picked friends
      // and every player of every picked room alike
      if (room && (invitees.length > 0 || selectedFriends.size > 0)) {
        for (const person of invitees) {
          // Add as invited participant first, then notify
          await addInvitedParticipant(
            room.id,
            person.id,
            person.nickname,
            person.avatarUrl,
            person.countryCode ?? null
          );
          await sendInvitation(person.id, room.id);
        }
        // Selected ids with no friend entry (a challenged non-friend) still
        // get their invitation, exactly as before
        for (const friendId of selectedFriends) {
          if (!invitees.some((p) => p.id === friendId)) {
            await sendInvitation(friendId, room.id);
          }
        }

        // Small delay to ensure DB writes complete before navigation
        await new Promise(resolve => setTimeout(resolve, 150));

        // If this is a challenge, also send a notification to the challenged user
        if (challengeUserId && !invitees.some((p) => p.id === challengeUserId)) {
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
            `${userProfile?.nickname || t("extra.friendFallback")} ${t("extra.invitedToGameMsg", { name: "" })}`,
            effectiveRoomName,
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
      // Surface the failure - a silent catch leaves the user staring at a
      // button that "did nothing" with no way to tell it from a hang
      toast({
        title: t("common.error"),
        description: t("extra.mpRoomCreateFailed"),
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
    >
      {/* Bubble background video behind the whole page, washed light so the
          form stays readable (negative z paints it under the content) */}
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
        <BackgroundVideo
          sources={[
            { src: bubbleVideo.webm, type: "video/webm" },
            { src: bubbleVideo.mp4, type: "video/mp4" },
          ]}
          still="/videos/floating-blob-still.jpg"
          className="absolute inset-0"
        />
        {/* Same soft wash the global background uses, so the blobs stay subtle */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(249,219,255,0.5) 0%, rgba(249,219,255,0.3) 45%, rgba(249,219,255,0.5) 100%)",
          }}
        />
      </div>

      {/* Frosted popup panel — a real container now: header, form and the
          create button all live inside it. Height hugs the content (m-auto
          centers it), max-h keeps it inside the viewport with scrolling. */}
      <div className="relative m-auto flex max-h-full w-full max-w-[740px] md:max-w-[560px] flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(104,71,204,0.18)]">

      {/* Header - simplified */}
      <div className="border-b border-border/30 shrink-0">
        <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-xl font-display text-foreground">{t("team.newRoom")}</h1>
          </div>
          
          {/* Help Button */}
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full px-4 py-4 space-y-5">
        {/* Room Name with Icon - AI generated */}
        <div>
          <h2 className="text-[13.2px] font-medium text-muted-foreground mb-2">{t("extra.chooseRoomName")}</h2>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                  {/* Clickable area for Icon + Name - opens picker modal */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !isGeneratingName && setShowIconPickerModal(true)}
                    onKeyDown={(e) => e.key === 'Enter' && !isGeneratingName && setShowIconPickerModal(true)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
                  >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-background shadow-md flex items-center justify-center overflow-hidden shrink-0">
                {isGeneratingName ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : roomIcon ? (
                  <img src={roomIcon} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <img src={triviaBuzzer} alt="" className="w-6 h-6 object-contain" />
                )}
              </div>
              
              {/* Room Name */}
              <p className="font-semibold text-foreground text-sm truncate text-left">
                {roomName}
              </p>
                  </div>

            {/* Edit button - opens modal */}
            <button
              onClick={() => setShowIconPickerModal(true)}
              disabled={isGeneratingName}
              className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Pencil className="w-4 h-4 text-primary" />
            </button>
            
            {/* Regenerate button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                generateRoomName();
              }}
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
            <h2 className="text-[13.2px] font-medium text-muted-foreground">{t("extra.inviteFriendsToPlay")}</h2>
            {acceptedFriends.length > 5 && (
              <button 
                onClick={() => setShowInviteModal(true)}
                className="text-xs text-primary font-medium hover:underline"
              >
                {t("extra.seeAll")}
              </button>
            )}
          </div>
          
          {acceptedFriends.length > 0 || inviteRooms.length > 0 ? (
            <div className="flex items-center gap-2">
              {/* Horizontal scrolling friends */}
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 pb-1 pt-1 pl-1">
                  {/* Invite friends button - Opens friend selection modal */}
                  <motion.button
                    onClick={() => setShowInviteModal(true)}
                    className="shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 min-w-[68px]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-[52px] h-[52px] rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs text-primary font-medium">{t("extra.inviteBtn")}</span>
                  </motion.button>

                  {/* Whole rooms first (Figma 926-10187 team circles): picking
                      one invites every player already in it. */}
                  {inviteRooms.map((inviteRoom) => {
                    const isSelected = selectedRooms.has(inviteRoom.id);
                    return (
                      <motion.button
                        key={inviteRoom.id}
                        onClick={() =>
                          setSelectedRooms((prev) => {
                            const next = new Set(prev);
                            if (next.has(inviteRoom.id)) next.delete(inviteRoom.id);
                            else next.add(inviteRoom.id);
                            return next;
                          })
                        }
                        className={`relative shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${
                          isSelected
                            ? "bg-primary/10 border-[#7126d5]"
                            : "bg-muted/50 border-transparent hover:bg-muted"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="relative">
                          <div
                            className="w-[52px] h-[52px] rounded-full flex items-center justify-center overflow-hidden"
                            style={{ background: ROOM_GRADS[roomGradIndex(inviteRoom.id)] }}
                          >
                            {inviteRoom.room_icon ? (
                              <img src={inviteRoom.room_icon} alt="" className="w-8 h-8 object-contain" />
                            ) : (
                              <span className="text-base font-bold text-white">
                                {(inviteRoom.room_name || inviteRoom.room_code).charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 480, damping: 22 }}
                              className="absolute inset-0 m-auto w-[30px] h-[30px] rounded-full bg-white/75 backdrop-blur-[2px] flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-[#7126d5]" strokeWidth={3.5} />
                            </motion.div>
                          )}
                        </div>
                        <span className="text-xs text-foreground font-medium max-w-[70px] truncate">
                          {inviteRoom.room_name || inviteRoom.room_code}
                        </span>
                      </motion.button>
                    );
                  })}

                  {reelFriends.slice(0, 10).map((friend) => {
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
                            src={resolveAvatarUrl(friend.avatarUrl) || fallbackAvatarFor(friend.friendId)} 
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
                      <span className="text-xs text-muted-foreground">{t("extra.moreCount")}</span>
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
                <span className="text-sm text-foreground">{t("extra.appFriends")}</span>
              </motion.button>
              <motion.button
                onClick={handleShareInviteLink}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 hover:from-primary/20 hover:to-accent/20 transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Share2 className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary font-medium">{t("extra.shareBtn")}</span>
              </motion.button>
            </div>
          )}
          
          {(selectedFriends.size > 0 || selectedRooms.size > 0) && (
            <p className="text-xs text-primary mt-1.5">
              {t("extra.friendsInvited", { count: collectInvitees().length })}
            </p>
          )}
        </div>

        {/* What will you play? — the horizontal game reel (Figma 926-10187):
            Random / Versus King / Trivia Battle / classic friends room. */}
        <div>
          <h2 className="text-[13.2px] font-medium text-muted-foreground mb-2">{t("extra.whatToPlay")}</h2>

          <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-[17px] pt-1 pb-2 w-max">
              {(
                [
                  { key: "random", icon: iconDiceCard, title: t("extra.randomOption"), desc: t("extra.randomDesc") },
                  { key: "king", icon: iconKingCard, title: t("lobby.vkTitle"), desc: t("lobby.kingCardDesc") },
                  { key: "battle", icon: iconCrateCard, title: t("teamBattle.title"), desc: t("gameTypes.teamBattleDesc") },
                  { key: "classic", icon: iconFriendsCard, title: t("team.newRoom"), desc: t("lobby.classicCardDesc") },
                ] as { key: GameChoice; icon: string; title: string; desc: string }[]
              ).map((card) => {
                const isPicked = gameChoice === card.key;
                return (
                  <motion.button
                    key={card.key}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 480, damping: 28 }}
                    onClick={() => {
                      setGameChoice(card.key);
                      if (card.key === "random" && !isSearchingRandom) void selectRandomCategory();
                    }}
                    className={`relative shrink-0 w-[200px] h-[235px] rounded-[24px] overflow-clip text-left flex flex-col pt-4 px-4 pb-[7px] bg-[rgba(243,244,246,0.5)] border border-solid transition-shadow ${
                      isPicked
                        ? "border-[#7126d5] shadow-[0px_4px_4px_0px_rgba(113,38,213,0.42)]"
                        : "border-[rgba(211,211,211,0.5)]"
                    }`}
                  >
                    <div className="flex-1 flex items-center justify-center">
                      <img alt="" src={card.icon} className="w-[86px] h-[86px] object-contain" />
                    </div>
                    <p className="font-[Nunito] font-bold text-[16px] leading-[24px] text-[#0f1729] tracking-[-0.16px] whitespace-nowrap overflow-hidden text-ellipsis">
                      {card.title}
                    </p>
                    <p className="font-[Nunito] text-[14px] leading-[20px] text-[#6b7280] tracking-[-0.16px] h-[40px] overflow-hidden line-clamp-2 mb-[6px]">
                      {card.desc}
                    </p>
                    {isPicked && (
                      <motion.div
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 480, damping: 20 }}
                        className="absolute right-[10px] top-[14px] w-[30px] h-[30px] rounded-full bg-[rgba(113,38,213,0.08)] flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-[#7126d5]" strokeWidth={3.5} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 mt-1">
            {/* Random Option - Container that expands to show preview.
                Shown for the Random card (as the roll status/preview) and
                inside the classic room's source list. */}
            {(gameChoice === "random" || gameChoice === "classic") && (
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
                    {/* The category's icon on its gradient. This played the
                        category's video where one existed; the video belongs
                        on the category's own page, not behind a preview you
                        look at for two seconds on the way to a room. */}
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                      <CategoryArtwork
                        categoryId={selectedCategory.category_id}
                        iconSlug={selectedCategory.icon_slug}
                        size={96}
                      />
                    </div>
                    
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
                            {t("extra.randomDesc")}
                          </p>
                          {/* Inline queue preview */}
                          {queuedRounds.length > 0 && (
                             <div className="mt-2 space-y-0.5">
                <p className="text-xs text-white/60 font-medium">{t("extra.nextRounds")}</p>
                               <div className="flex flex-wrap gap-1.5">
                                 {queuedRounds.map((r, i) => (
                                   <span 
                                     key={r.tmpId}
                                     className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/90"
                                   >
                                     <span className="text-white/50">{i + 1}.</span>
                                      {r.category_name || t("extra.randomOption")}
                                   </span>
                                 ))}
                               </div>
                             </div>
                          )}
                        </div>
                        {/* Re-roll button */}
                        <button 
                          onClick={selectRandomCategory}
                          className="p-2 shrink-0 bg-black/45 border border-white/30 backdrop-blur-sm hover:bg-black/60 rounded-lg transition-colors"
                          title={t("extra.anotherCategory")}
                        >
                          <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                        {/* Add to queue */}
                        <button
                          onClick={() => setShowQueuePicker(true)}
                          className="p-2 shrink-0 bg-black/45 border border-white/30 backdrop-blur-sm hover:bg-black/60 rounded-lg transition-colors"
                           title={t("extra.addToQueue")}
                        >
                          <Plus className="w-5 h-5 text-white" />
                        </button>
                        {/* Clear button */}
                        <button 
                          onClick={clearSelection}
                          className="p-2 shrink-0 bg-black/45 border border-white/30 backdrop-blur-sm hover:bg-black/60 rounded-lg transition-colors"
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
                        {isSearchingRandom ? t("extra.searchingCategory") : t("extra.randomOption")}
                      </p>
                      <p className={`text-sm ${isSearchingRandom ? "text-white/70" : "text-muted-foreground"}`}>
                        {isSearchingRandom 
                          ? (selectedCategory?.name || t("extra.choosingCategory")) 
                          : t("extra.randomDesc")
                        }
                      </p>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            )}

            {/* Library Option - Container that expands to show preview */}
            {gameChoice === "classic" && (
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
                    {selectedCategory.category_id === "__mixed__" ? (
                      // Special handling for mixed category - show mystery-box icon
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
                      >
                        <div className="opacity-40">
                          <DynamicIcon slug="mystery-box" size={80} />
                        </div>
                      </div>
                    ) : (
                      // Its own icon on its own gradient, under a scrim: the
                      // info bar below is white text and white glyphs and has
                      // to stay readable. This used to play the category's
                      // video instead, which now runs only on the category's
                      // own page.
                      <>
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: categoryGradient(selectedCategory.color) }}
                        >
                          <CategoryArtwork
                            categoryId={selectedCategory.category_id}
                            iconSlug={selectedCategory.icon_slug}
                            size={96}
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      </>
                    )}
                    
                    {/* Overlaid Info Bar at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden">
                          {selectedCategory.category_id === "__mixed__" ? (
                            <DynamicIcon slug="mystery-box" size={24} />
                          ) : (
                            // The category's own icon. This was a stock
                            // bookcase for every category alike, which said
                            // "library" rather than which one was picked.
                            <CategoryArtwork
                              categoryId={selectedCategory.category_id}
                              iconSlug={selectedCategory.icon_slug}
                              size={26}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate drop-shadow-lg">
                            {selectedCategory.name}
                          </p>
                          <p className="text-xs text-white/80">
                            {t("extra.selectedCategoryLabel")}
                          </p>
                          {/* Inline queue preview */}
                          {queuedRounds.length > 0 && (
                             <div className="mt-2 space-y-0.5">
                <p className="text-xs text-white/60 font-medium">{t("extra.nextRounds")}</p>
                               <div className="flex flex-wrap gap-1.5">
                                 {queuedRounds.map((r, i) => (
                                   <span 
                                     key={r.tmpId}
                                     className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/90"
                                   >
                                     <span className="text-white/50">{i + 1}.</span>
                                      {r.category_name || t("extra.randomOption")}
                                   </span>
                                 ))}
                               </div>
                             </div>
                          )}
                        </div>
                        {/* Add to queue */}
                        <button
                          onClick={() => setShowQueuePicker(true)}
                          className="p-2 shrink-0 bg-black/45 border border-white/30 backdrop-blur-sm hover:bg-black/60 rounded-lg transition-colors"
                           title={t("extra.addToQueue")}
                        >
                          <Plus className="w-5 h-5 text-white" />
                        </button>
                        {/* Clear button */}
                        <button 
                          onClick={clearSelection}
                          className="p-2 shrink-0 bg-black/45 border border-white/30 backdrop-blur-sm hover:bg-black/60 rounded-lg transition-colors"
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
                        {t("extra.libraryOption")}
                      </p>
                      <p className={`text-sm ${selectionMode === "library" && !selectedCategory ? "text-white/70" : "text-muted-foreground"}`}>
                        {t("extra.libraryDesc")}
                      </p>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            )}

            {/* My Trivias Option - User's created content */}
            {gameChoice === "classic" && (
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
                            {challengeTrivia.type === "collection" ? t("extra.collectionLabel") : t("extra.triviaLabel")}
                          </p>
                          {/* Inline queue preview */}
                          {queuedRounds.length > 0 && (
                             <div className="mt-2 space-y-0.5">
                               <p className="text-xs text-white/60 font-medium">{t("extra.nextRounds")}</p>
                               <div className="flex flex-wrap gap-1.5">
                                 {queuedRounds.map((r, i) => (
                                   <span 
                                     key={r.tmpId}
                                     className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/90"
                                   >
                                     <span className="text-white/50">{i + 1}.</span>
                                     {r.category_name || t("extra.randomOption")}
                                   </span>
                                 ))}
                               </div>
                             </div>
                          )}
                        </div>
                        <button 
                          onClick={() => setShowMyTriviasModal(true)}
                          className="p-2 shrink-0 bg-black/45 border border-white/30 backdrop-blur-sm hover:bg-black/60 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                        <button
                          onClick={() => setShowQueuePicker(true)}
                          className="p-2 shrink-0 bg-black/45 border border-white/30 backdrop-blur-sm hover:bg-black/60 rounded-lg transition-colors"
                          title={t("extra.addToQueue")}
                        >
                          <Plus className="w-5 h-5 text-white" />
                        </button>
                        <button 
                          onClick={() => {
                            setChallengeTrivia(null);
                            setSelectionMode(null);
                            setRoomName("");
                            setQueuedRounds([]);
                          }}
                          className="p-2 shrink-0 bg-black/45 border border-white/30 backdrop-blur-sm hover:bg-black/60 rounded-lg transition-colors"
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
                        {t("extra.myTriviaOption")}
                      </p>
                      <p className={`text-sm ${selectionMode === "my-trivias" && !challengeTrivia ? "text-white/70" : "text-muted-foreground"}`}>
                        {t("extra.myTriviaDesc")}
                      </p>
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            )}

          </div>
        </div>

        {/* Pre-room queued rounds preview - only show when no category selected */}
        {!selectedCategory && !challengeTrivia && (
          <PreRoomQueuePreview
            items={queuedRounds}
            onRemove={removeQueuedRound}
            onClear={() => setQueuedRounds([])}
          />
        )}

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
                      {t("extra.questionsCount", { count: customTriviaQuestions.length })} • {isPersonalTrivia ? t("extra.editHint") : t("extra.answersHidden")}
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
      </div>

      {/* Footer - Normal Button */}
      <div className="border-t border-border/30 shrink-0">
        <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full px-4 py-4">
        <ChunkyButton
          onClick={handleCreate}
          disabled={loading || isCreating || !createEnabled}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {isCreating || loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          {t("extra.createBtn")}
        </ChunkyButton>
        </div>
      </div>

      {/* End of frosted popup panel */}
      </div>

      {/* TV Play Modal */}
      <TVPlayModal
        isOpen={showTVModal}
        onClose={() => setShowTVModal(false)}
        categoryId={selectedCategory?.id}
        categoryName={selectedCategory?.name}
      />
      
      {/* Invite Friends Modal - Pre-room selection mode */}
      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          // Whoever is invited now leads the reel, newest picks last
          setPinnedFriendIds(prev => [
            ...prev.filter(id => selectedFriends.has(id)),
            ...Array.from(selectedFriends).filter(id => !prev.includes(id)),
          ]);
        }}
        roomCode={plannedRoomCode}
        onFriendSelect={(friendId: string) => {
          const newSelected = new Set(selectedFriends);
          if (newSelected.has(friendId)) {
            newSelected.delete(friendId);
          } else {
            newSelected.add(friendId);
          }
          setSelectedFriends(newSelected);
        }}
        selectedFriends={selectedFriends}
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
        onSwitchToCollection={(subject) => {
          setCollectionInitialSubject(subject);
          setShowCreateCollectionModal(true);
        }}
      />

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
      />

      {/* Create Collection Modal */}
      <CreateCollectionModal
        open={showCreateCollectionModal}
        onOpenChange={(open) => {
          setShowCreateCollectionModal(open);
          if (!open) setCollectionInitialSubject("");
        }}
        onCollectionCreated={() => {
          toast({
            title: t("extra.collectionCreated"),
            description: t("extra.collectionCreatedDesc"),
          });
        }}
        initialRoundSubject={collectionInitialSubject}
      />

      {/* Room Icon Picker Modal */}
      <RoomIconPickerModal
        isOpen={showIconPickerModal}
        onClose={() => setShowIconPickerModal(false)}
        currentIconUrl={roomIcon}
        roomName={roomName}
        onConfirm={(iconUrl, newName) => {
          // Same screen the lobby rename has — renaming during creation was
          // a free pass, and room names ride push notifications.
          if (containsBlockedText(newName)) {
            toast({ title: t("extra.textNotAllowed"), variant: "destructive" });
            return;
          }
          setRoomIcon(iconUrl);
          setRoomName(newName);
        }}
      />

      {/* My Trivias Picker Modal */}
      <MyTriviasPickerModal
        open={showMyTriviasModal}
        onOpenChange={setShowMyTriviasModal}
        onSelect={handleMyTriviaSelect}
        onCreateTrivia={() => {
          setShowMyTriviasModal(false);
          setShowCreateTriviaModal(true);
        }}
      />

      {/* Queue picker (pre-room) */}
      <CategoryPickerModal
        isOpen={showQueuePicker}
        onClose={() => setShowQueuePicker(false)}
        onSelectCategory={() => setShowQueuePicker(false)}
        onSelectRandom={() => setShowQueuePicker(false)}
        onSelectTrivia={() => setShowQueuePicker(false)}
        onAddToQueue={handleAddPreRoomQueueItem}
        showQueueOption={true}
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
