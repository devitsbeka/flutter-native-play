import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { anyBlockedText, containsBlockedText } from "@/utils/contentFilter";
import { Loader2, ArrowLeft, HelpCircle, X, RefreshCw, Play, Pencil, Gamepad2, Plus, Check, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { roomVisibilityFields } from "@/utils/roomVisibility";
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
import teamPenguinsIcon from "@/assets/tb-lobby/team-penguins.png";
import teamFormulaIcon from "@/assets/tb-lobby/team-formula.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import stickerAlbum from "@/assets/sticker-album.png";
import iconDiceCard from "@/assets/play-chooser/icon-dice.webp";
import iconButtonCard from "@/assets/play-chooser/icon-button.png";
import iconKingCard from "@/assets/play-chooser/icon-king.webp";
import iconCrateCard from "@/assets/play-chooser/icon-crate.png";
import iconLibraryCard from "@/assets/play-chooser/icon-library.webp";
import iconWordsCard from "@/assets/play-chooser/icon-words.webp";
import { getRandomGradient } from "@/config/roomGradients";

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
 * The six game cards of the redesigned screen (Figma 926-11729): quick game
 * first, then Random, the two lounges, and the two room sources — Library and
 * My Trivia — as cards of their own (the old "classic friends room" card that
 * hid all three sources behind one more tap is gone).
 */
type GameChoice = "quick" | "random" | "king" | "battle" | "words" | "library" | "mytrivias";

/** A person to seat as "invited" — a friend, or a member of a picked room. */
type InvitePerson = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  countryCode?: string | null;
};

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

  // Which game the room is for. A pre-selected category or a challenge lands
  // on the matching source card; otherwise NOTHING is picked — starting on
  // Random quietly rolled a category the player never chose, and the create
  // button read as ready for a game nobody asked for.
  const [gameChoice, setGameChoice] = useState<GameChoice | null>(() => {
    if (preSelectedCategory || defaultChallengeType === "library") return "library";
    if (defaultChallengeType === "my-trivias" || defaultChallengeType === "create") return "mytrivias";
    return null;
  });
  
  // Room name & icon state - AI-generated via edge function
  const [roomName, setRoomName] = useState<string>(t("extra.loadingState"));
  const [roomIcon, setRoomIcon] = useState<string | null>(null);

  /**
   * Published, or just mine.
   *
   * A published room is listed on the Public tab for everyone, with its
   * first round's category and how many seats are taken — and being listed
   * is not the same as being open: strangers ask, and the host answers.
   * Private is the old behaviour exactly, a room only reachable through its
   * code, its link or an invitation.
   *
   * It starts published because a room nobody can find is the thing this
   * screen was worst at: the only way to fill one was to already know who
   * you wanted in it.
   */
  const [isPublic, setIsPublic] = useState(true);

  /**
   * Which side of the arena the host takes.
   *
   * Everyone who made a Trivia Battle used to land on Team A, because the
   * room's first seat says so — so the host's own side was the one thing
   * about the match they could not choose, and moving afterwards meant
   * dragging their own avatar across the arena.
   */
  const [battleTeam, setBattleTeam] = useState<"a" | "b">("a");
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  
  const [showTVModal, setShowTVModal] = useState(false);
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
  
  // If challenge user provided, auto-add to selected friends
  useEffect(() => {
    if (challengeUserId) {
      setSelectedFriends(new Set([challengeUserId]));
    }
  }, [challengeUserId]);

  // Only accepted friends
  const acceptedFriends = useMemo(
    () => friends.filter(f => f.status === "accepted"),
    [friends]
  );

  // Everyone the Create press will seat as invited. Inviting now happens in
  // the lobby (the + seat); the only pre-room pick left is the friend this
  // screen was opened to challenge.
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

  const handleLibraryCategorySelect = (category: { id: string; category_id: string; name: string; icon?: string; icon_slug?: string | null; color: string; image_url?: string | null; total_levels: number }) => {
    // Use the category directly from the modal - it already has category_id
    setSelectedCategory({
      id: category.id,
      category_id: category.category_id,
      name: category.name,
      // categories.icon is the EMOJI; the icon library wants icon_slug. The
      // emoji used to be passed as the slug here, which resolved to nothing
      // and left the picked-category preview wearing the "?" fallback.
      icon_slug: category.icon_slug || null,
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

  // The reel's cards, so the picked one can scroll itself in. A card tapped
  // at the edge of the strip stayed half off-screen with its tick hidden,
  // which read as the tap not registering.
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!gameChoice) return;
    cardRefs.current[gameChoice]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      // "nearest" vertically: centring would drag the whole form up too.
      block: "nearest",
    });
  }, [gameChoice]);

  // Set when the + picker adds rounds; the effect below then creates the
  // room as if Create had been pressed — the queue is shown and managed in
  // the lobby, not on this screen.
  const queuedViaPicker = useRef(false);

  const handleAddPreRoomQueueItem = (item: PreRoomQueueItemInput) => {
    const tmpId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    queuedViaPicker.current = true;
    setQueuedRounds((prev) => [...prev, { ...item, tmpId }]);
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

  // Nothing picked, nothing to create — the player decides what to play.
  // The lounges are always ready to enter; Random needs a settled roll;
  // Library and My Trivia keep their per-source validity.
  const createEnabled =
    gameChoice === null
      ? false
      : gameChoice === "quick" || gameChoice === "king" || gameChoice === "battle" || gameChoice === "words"
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

    // Quick game is the /game matchmaking flow — no room to create; its
    // own guards (limits, stake) live centrally in the game flow.
    if (gameChoice === "quick") {
      onClose();
      navigate("/game");
      return;
    }

    // The lounges create their own room the moment they open; the people
    // picked here ride along in router state and get seated as invited
    // once that room exists.
    if (gameChoice === "king" || gameChoice === "battle") {
      const invite = collectInvitees();
      onClose();
      navigate(gameChoice === "king" ? "/king" : "/team-battle", {
        state: { invite, isPublic, team: gameChoice === "battle" ? battleTeam : undefined },
      });
      return;
    }

    // Words seats one friend. The first person picked here rides along and
    // is invited the moment the board's room exists; the board itself opens
    // at once, solo until they arrive.
    if (gameChoice === "words") {
      const invite = collectInvitees().slice(0, 1);
      onClose();
      navigate("/words", { state: { invite } });
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
            ...(await roomVisibilityFields(isPublic)),
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
              ...(await roomVisibilityFields(isPublic)),
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
            plannedRoomCode,
            isPublic
          );

          if (room?.id) {
            await persistQueuedRounds(room.id);
          }
        }
      } else if (selectedCategory) {
        // Create the room with selected category
        room = await createRoom(selectedCategory.category_id, selectedCategory.name, undefined, effectiveRoomName, roomIcon, plannedRoomCode, isPublic);

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

  // More than one round picked → straight to the lobby. The + picker just
  // closed having added rounds; pressing Create for the user here means the
  // queue is seen and managed in the lobby rather than previewed on this
  // screen.
  useEffect(() => {
    if (!queuedViaPicker.current || showQueuePicker) return;
    if (queuedRounds.length === 0 || isCreating) return;
    queuedViaPicker.current = false;
    void handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedRounds, showQueuePicker, isCreating]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden pt-[var(--safe-top)] pb-[var(--safe-bottom)]"
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

      {/* Full-bleed: the page IS the screen. This was a frosted card inset
          from every edge, which cost a margin all the way round on a phone
          and left the reel's cards clipped by it. The header, form and
          create button still centre their own column, so nothing stretches
          on a wide screen. Fixed height, so only the middle scrolls and the
          button never moves. */}
      <div className="relative flex h-full w-full flex-col overflow-hidden">

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
            <h1 className="text-xl font-display text-foreground">{t("team.onlineGame")}</h1>
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
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full px-4 py-3 space-y-3">
        {/* Room Name with Icon - AI generated.
            Hidden for the quick game: that one is matchmaking, not a room —
            it goes straight to /game and never reads this name, so offering
            to rename and re-roll something that will not exist is noise. */}
        {gameChoice !== "quick" && (
          <div>
            <h2 className="text-[13.2px] font-medium text-muted-foreground mb-1.5">{t("extra.chooseRoomName")}</h2>
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
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

            {/* Published or private. Two labelled halves rather than a bare
                switch: "public" alone does not say whether it means anyone
                can watch, anyone can walk in, or anyone can find it, and the
                line under the pair answers that in the one place someone is
                deciding. */}
            <div className="mt-2 flex items-center gap-1 p-1 rounded-2xl bg-muted">
              {([
                { on: true, icon: Globe, label: t("extra.roomPublic") },
                { on: false, icon: Lock, label: t("extra.roomPrivate") },
              ] as const).map(({ on, icon: Icon, label }) => (
                <button
                  key={String(on)}
                  type="button"
                  onClick={() => setIsPublic(on)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                    isPublic === on
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 px-1 text-[11.5px] leading-snug text-muted-foreground">
              {isPublic ? t("extra.roomPublicHint") : t("extra.roomPrivateHint")}
            </p>
          </div>
        )}

        {/* What will you play? — the horizontal game reel (Figma 926-11729):
            quick / Random / Versus King / Trivia Battle / Library / My Trivia. */}
        <div>
          <h2 className="text-[13.2px] font-medium text-muted-foreground mb-1.5">{t("extra.whatToPlay")}</h2>

          <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-[17px] pt-1 pb-2 w-max">
              {(
                [
                  { key: "quick", icon: iconButtonCard, title: t("extra.playQuickGame"), desc: t("extra.playQuickGameDesc") },
                  { key: "random", icon: iconDiceCard, title: t("extra.randomOption"), desc: t("extra.randomDesc") },
                  { key: "king", icon: iconKingCard, title: t("lobby.vkTitle"), desc: t("lobby.kingCardDesc") },
                  { key: "battle", icon: iconCrateCard, title: t("teamBattle.title"), desc: t("gameTypes.teamBattleDesc") },
                  { key: "words", icon: iconWordsCard, title: t("gameTypes.wordsTitle"), desc: t("gameTypes.wordsDesc") },
                  { key: "library", icon: iconLibraryCard, title: t("extra.libraryOption"), desc: t("extra.libraryDesc") },
                  { key: "mytrivias", icon: stickerAlbum, title: t("extra.myTriviaOption"), desc: t("extra.myTriviaDesc") },
                ] as { key: GameChoice; icon: string; title: string; desc: string }[]
              ).map((card) => {
                const isPicked = gameChoice === card.key;
                return (
                  <motion.button
                    key={card.key}
                    ref={(el) => { cardRefs.current[card.key] = el; }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 480, damping: 28 }}
                    onClick={() => {
                      setGameChoice(card.key);
                      if (card.key === "random" && !isSearchingRandom) void selectRandomCategory();
                      if (card.key === "library" && !(selectionMode === "library" && selectedCategory)) setShowCategoriesModal(true);
                      if (card.key === "mytrivias" && !challengeTrivia) void handleOptionClick("my-trivias");
                    }}
                    className={`relative shrink-0 w-[200px] h-[210px] rounded-[24px] overflow-clip text-left flex flex-col pt-4 px-4 pb-[7px] bg-[rgba(243,244,246,0.5)] border border-solid transition-shadow ${
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
            {/* Which side of the arena you take. Two buttons rather than a
                dropdown: there are exactly two, and the whole choice is
                which of them you tap. */}
            {gameChoice === "battle" && (
              <div>
                <h2 className="text-[13.2px] font-medium text-muted-foreground mb-1.5">
                  {t("extra.pickYourSide")}
                </h2>
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted">
                  {(["a", "b"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setBattleTeam(side)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                        battleTeam === side
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      <img
                        src={side === "a" ? teamPenguinsIcon : teamFormulaIcon}
                        alt=""
                        className="w-6 h-6 object-contain"
                      />
                      {side === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Random Option - the roll status/preview under the Random card */}
            {gameChoice === "random" && (
            <div className="rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                {selectionMode === "random" && selectedCategory && !isSearchingRandom ? (
                  // Expanded state - video preview inside the button area
                  <motion.div
                    key="random-preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full h-0 pb-[calc(50%_-_10px)]"
                  >
                    {/* The category's icon on its gradient. This played the
                        category's video where one existed; the video belongs
                        on the category's own page, not behind a preview you
                        look at for two seconds on the way to a room. */}
                    <div className="absolute inset-0 pb-14 bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
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

            {/* Library preview — only once a category is picked; the card
                above already says "Library", so no collapsed twin row. */}
            {gameChoice === "library" && selectionMode === "library" && !!selectedCategory && (
            <div className="rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                {selectionMode === "library" && selectedCategory ? (
                  // Expanded state - video preview inside the button area
                  <motion.div
                    key="library-preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative w-full h-0 pb-[calc(50%_-_10px)]"
                  >
                    {/* Video/Gradient Background */}
                    {selectedCategory.category_id === "__mixed__" ? (
                      // Special handling for mixed category - show mystery-box icon
                      <div 
                        className="absolute inset-0 pb-14 flex items-center justify-center"
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
                          className="absolute inset-0 pb-14 flex items-center justify-center"
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

            {/* My Trivia preview — only once a trivia is picked (see above) */}
            {gameChoice === "mytrivias" && selectionMode === "my-trivias" && !!challengeTrivia && (
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
          {gameChoice === "quick" ? t("lobby.startGame") : t("extra.createBtn")}
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
