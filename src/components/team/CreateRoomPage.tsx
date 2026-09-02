import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { anyBlockedText, containsBlockedText } from "@/utils/contentFilter";
import { Loader2, ArrowLeft, HelpCircle, X, RefreshCw, Play, Pencil, Gamepad2, Plus, Check, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { generateRoomIdentity } from "@/utils/roomNameGenerator";
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
import secretBookcase from "@/assets/secret-bookcase.png";
import triviaBuzzer from "@/assets/trivia-buzzer-3.png";
import teamPenguinsIcon from "@/assets/tb-lobby/team-penguins.png";
import teamFormulaIcon from "@/assets/tb-lobby/team-formula.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import stickerAlbum from "@/assets/sticker-album.png";
import featuredQuick from "@/assets/play-chooser/featured-quick.webp";
import featuredRandom from "@/assets/play-chooser/featured-random.webp";
import featuredKing from "@/assets/play-chooser/featured-king.webp";
import featuredBattle from "@/assets/play-chooser/featured-battle.webp";
import featuredWords from "@/assets/play-chooser/featured-words.webp";
import featuredLibrary from "@/assets/play-chooser/featured-library.webp";
import featuredMyTrivias from "@/assets/play-chooser/featured-mytrivias.webp";
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
  /**
   * The room's name, dealt once and never shown on this screen.
   *
   * It used to be the first thing here: a generated name, an icon, a pencil
   * and a re-roll, above the choice of what to even play. Naming a room is
   * something a host does to a room they are looking at — the lobby has the
   * same rename sheet, and that is where it belongs. Dealt from the local
   * tables rather than the edge function, so there is no spinner and no
   * round-trip for something nobody is reading yet.
   */
  const [roomName] = useState<string>(() => generateRoomIdentity(readAppLanguage()).name);

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
   * Which of the six can go on the Public tab at all.
   *
   * A published room is one a stranger could usefully walk into: a random
   * category, a category from the library, or an arena that wants ten
   * people. The other three are not rooms in that sense — the quick game is
   * matchmaking with no room to list, the King's couch is a private duel
   * against the King, and My Trivia is your own quiz, which is yours to
   * hand out rather than to advertise. They are created private, and the
   * switch is not offered rather than offered and ignored.
   */
  const canPublish =
    gameChoice === "random" || gameChoice === "library" || gameChoice === "battle";
  const publishRoom = canPublish && isPublic;

  /**
   * Which side of the arena the host takes.
   *
   * Everyone who made a Trivia Battle used to land on Team A, because the
   * room's first seat says so — so the host's own side was the one thing
   * about the match they could not choose, and moving afterwards meant
   * dragging their own avatar across the arena.
   */
  const [battleTeam, setBattleTeam] = useState<"a" | "b">("a");
  /**
   * The two crests-to-be. null = the classic default art. Tapping a team
   * card picks that side AND deals it a new random icon from the library;
   * tapping the icon itself opens the picker to choose one deliberately.
   * They ride to the arena in router state and become the room's
   * team_a_icon / team_b_icon (tb_set_team_icon) once it exists.
   */
  const [teamIcons, setTeamIcons] = useState<{ a: string | null; b: string | null }>({
    a: null,
    b: null,
  });
  const [crestPickerFor, setCrestPickerFor] = useState<"a" | "b" | null>(null);
  const crestPoolRef = useRef<string[]>([]);
  const rollTeamIcon = async (side: "a" | "b") => {
    if (crestPoolRef.current.length === 0) {
      const { data } = await supabase
        .from("icon_library")
        .select("icon_url")
        .not("icon_url", "is", null)
        .limit(80);
      crestPoolRef.current = (data ?? [])
        .map((r) => r.icon_url as string)
        .filter(Boolean);
    }
    const pool = crestPoolRef.current;
    if (pool.length === 0) return;
    setTeamIcons((prev) => {
      let next = prev[side];
      // A reroll that lands on the same icon reads as a dead tap.
      for (let tries = 0; tries < 5 && next === prev[side]; tries++) {
        next = pool[Math.floor(Math.random() * pool.length)];
      }
      return { ...prev, [side]: next };
    });
  };

  /**
   * How many a side the arena is set for: 2-2 through 5-5.
   *
   * The arena always laid out five seats per team whatever the match was
   * actually going to be, so a 2v2 opened with eight empty podiums and no
   * way to say "this is a 2v2". It caps the room (max_players) and the
   * seats the lobby draws. Five is the default because that is what every
   * arena was before this, so nothing shrinks unless somebody asks.
   */
  const [battleTeamSize, setBattleTeamSize] = useState(5);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  
  const [showTVModal, setShowTVModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showCreateTriviaModal, setShowCreateTriviaModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [collectionInitialSubject, setCollectionInitialSubject] = useState<string>("");
  const [showCreateOptionsMenu, setShowCreateOptionsMenu] = useState(false);
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

  // Fetch categories from database
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

  // The Random card starts the game itself. A random category is a choice
  // with nothing to deliberate, so the roll, its preview and a second tap
  // on Create were three steps to the same place; the card now deals the
  // category and creates the room in one go. The effect by the Create
  // handler presses Create for it once the state dealt here has landed —
  // or, if the categories are still loading, once the roll below has run.
  const randomAutoStart = useRef(false);

  const startRandomGame = () => {
    if (isCreating) return;
    setGameChoice("random");
    randomAutoStart.current = true;
    if (categories.length === 0) return;
    setSelectionMode("random");
    setSelectedCategory(categories[Math.floor(Math.random() * categories.length)]);
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
    setIsPersonalTrivia(true);
  };

  const clearSelection = () => {
    setSelectedCategory(null);
    setSelectionMode(null);
    setQueuedRounds([]);
  };

  // The carousel's cards, so the picked one can scroll itself in. A card
  // tapped while peeking at the edge stayed half off-screen with its tick
  // hidden, which read as the tap not registering. "start" matches where
  // the snap points are, so it lands exactly as a swipe would leave it.
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!gameChoice) return;
    cardRefs.current[gameChoice]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
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
      // Versus King is friends-only: its lounge never publishes, whatever
      // the switch said before the game type was picked.
      navigate(gameChoice === "king" ? "/king" : "/team-battle", {
        state: {
          invite,
          isPublic: publishRoom,
          team: gameChoice === "battle" ? battleTeam : undefined,
          teamSize: gameChoice === "battle" ? battleTeamSize : undefined,
          teamIcons: gameChoice === "battle" ? teamIcons : undefined,
        },
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

    const effectiveRoomName = roomName;

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
            room_icon: null,
            // Ensure lobby can render the initial selection (otherwise it appears empty)
            category_name: challengeTrivia.title,
            game_type: "async",
            game_mode: challengeTrivia.type === "collection" ? `collection:${challengeTrivia.id}` : `trivia:${challengeTrivia.id}`,
            // CRITICAL: Set user_trivia_id for trivia type so TVSetupInline can find it
            user_trivia_id: challengeTrivia.type === "trivia" ? challengeTrivia.id : null,
            status: "waiting",
            ...(await roomVisibilityFields(publishRoom)),
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
              room_icon: null,
              category_name: customTriviaTitle,
              game_type: "async",
              game_mode: `trivia:${createdTriviaId}`,
              user_trivia_id: createdTriviaId,
              status: "waiting",
              ...(await roomVisibilityFields(publishRoom)),
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
            null,
            plannedRoomCode,
            publishRoom
          );

          if (room?.id) {
            await persistQueuedRounds(room.id);
          }
        }
      } else if (selectedCategory) {
        // Create the room with selected category
        room = await createRoom(selectedCategory.category_id, selectedCategory.name, undefined, effectiveRoomName, null, plannedRoomCode, publishRoom);

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

  // What the picked card unfolds beneath itself: the random roll and
  // its preview, the library's chosen category, which side of the arena,
  // the chosen trivia. One element, rendered under whichever card is
  // picked, so the detail sits next to the thing it belongs to. Empty
  // for the modes that have nothing to add, and hidden when empty.
  const pickedDetail = (
    <div className="mt-3 shrink-0 space-y-3 empty:hidden">
    {/* Which side of the arena you take — two big cards, the crest
        above the name. A tap picks the side AND deals its crest a
        fresh random icon; a tap on the crest itself opens the
        picker to choose one deliberately. */}
    {gameChoice === "battle" && (
      <div>
        <h2 className="text-[13.2px] font-medium text-muted-foreground mb-1.5">
          {t("extra.pickYourSide")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {(["a", "b"] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => {
                setBattleTeam(side);
                void rollTeamIcon(side);
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-4 border-2 transition-colors ${
                battleTeam === side
                  ? "bg-background border-primary shadow-sm text-foreground"
                  : "bg-muted border-transparent text-muted-foreground"
              }`}
            >
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setBattleTeam(side);
                  setCrestPickerFor(side);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    setCrestPickerFor(side);
                  }
                }}
                className="relative"
              >
                <motion.img
                  key={teamIcons[side] ?? "default"}
                  initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                  src={teamIcons[side] ?? (side === "a" ? teamPenguinsIcon : teamFormulaIcon)}
                  alt=""
                  className="w-14 h-14 object-contain"
                />
                <span className="absolute -right-1.5 -bottom-1 flex w-5 h-5 items-center justify-center rounded-full bg-background shadow-sm border border-border/50">
                  <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                </span>
              </span>
              <span className="text-[14px] font-bold">
                {side === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB")}
              </span>
            </button>
          ))}
        </div>
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
  );

  // Random, dealt above → straight into the room, no Create tap.
  useEffect(() => {
    if (!randomAutoStart.current) return;
    if (gameChoice !== "random") { randomAutoStart.current = false; return; }
    if (!createEnabled || isCreating) return;
    randomAutoStart.current = false;
    void handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameChoice, createEnabled, isCreating]);

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
        <div className="mx-auto flex min-h-full w-full max-w-[700px] flex-col space-y-3 px-4 py-3 md:max-w-[520px]">
        {/* What will you play? — a featured carousel, App Store style: one
            poster-tall card per mode with its own artwork, the title and
            blurb on a scrim at its foot, swiped through sideways and
            snapping card by card. This was a strip of small tiles (Figma
            926-11729) above a screen of empty air; the cards now take the
            height the screen has, and give some back when the picked mode
            unfolds its detail underneath — the random roll, the library
            preview, which side of the arena, the chosen trivia. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <h2 className="mb-1.5 shrink-0 text-[13.2px] font-medium text-muted-foreground">{t("extra.whatToPlay")}</h2>

          {/* The cards are the row's own items so they stretch to its
              height: a percentage height would not resolve through the
              min-height chain above, and left them 0px tall. */}
          <div className="-mx-4 flex min-h-[340px] flex-1 snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-1 scrollbar-hide">
            {(
              [
                { key: "quick", art: featuredQuick, title: t("extra.playQuickGame"), desc: t("extra.playQuickGameDesc") },
                { key: "random", art: featuredRandom, title: t("extra.randomOption"), desc: t("extra.randomDesc") },
                { key: "king", art: featuredKing, title: t("lobby.vkTitle"), desc: t("lobby.kingCardDesc") },
                { key: "battle", art: featuredBattle, title: t("teamBattle.title"), desc: t("gameTypes.teamBattleDesc") },
                { key: "words", art: featuredWords, title: t("gameTypes.wordsTitle"), desc: t("gameTypes.wordsDesc") },
                { key: "library", art: featuredLibrary, title: t("extra.libraryOption"), desc: t("extra.libraryDesc") },
                { key: "mytrivias", art: featuredMyTrivias, title: t("extra.myTriviaOption"), desc: t("extra.myTriviaDesc") },
              ] as { key: GameChoice; art: string; title: string; desc: string }[]
            ).map((card) => {
              const isPicked = gameChoice === card.key;
              return (
                <motion.button
                  key={card.key}
                  ref={(el) => { cardRefs.current[card.key] = el; }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 480, damping: 28 }}
                  aria-pressed={isPicked}
                  onClick={() => {
                    if (card.key === "random") { startRandomGame(); return; }
                    setGameChoice(card.key);
                    if (card.key === "library" && !(selectionMode === "library" && selectedCategory)) setShowCategoriesModal(true);
                    if (card.key === "mytrivias" && !challengeTrivia) void handleOptionClick("my-trivias");
                  }}
                  className={cn(
                    "relative block w-[84%] max-w-[440px] shrink-0 snap-start rounded-[28px] overflow-clip text-left bg-[#e9d8ff] transition-shadow duration-200",
                    isPicked
                      ? "ring-[3px] ring-[#7126d5] shadow-[0px_12px_32px_0px_rgba(113,38,213,0.35)]"
                      : "ring-1 ring-black/[0.06] shadow-[0px_8px_24px_0px_rgba(15,23,41,0.10)]",
                  )}
                >
                  <img
                    alt=""
                    src={card.art}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* The artwork leaves its lower third pale on purpose;
                      a lavender wash on top of that keeps the copy legible
                      even where a prop strays into it. */}
                  <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#f3e6ff] via-[#f3e6ff]/80 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
                    <p className="font-[Nunito] font-extrabold text-[24px] leading-[28px] text-[#0f1729] tracking-[-0.3px]">
                      {card.title}
                    </p>
                    <p className="font-[Nunito] text-[14px] leading-[20px] text-[#4b5563] tracking-[-0.16px] mt-1 line-clamp-2">
                      {card.desc}
                    </p>
                  </div>
                  {isPicked && (
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 480, damping: 20 }}
                      className="absolute right-4 top-4 w-9 h-9 rounded-full bg-[#7126d5] shadow-[0px_4px_12px_0px_rgba(113,38,213,0.45)] flex items-center justify-center"
                    >
                      {card.key === "random" && (isCreating || isSearchingRandom) ? (
                        <Loader2 className="w-[18px] h-[18px] text-white animate-spin" />
                      ) : (
                        <Check className="w-[18px] h-[18px] text-white" strokeWidth={3.5} />
                      )}
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
            <div aria-hidden className="w-px shrink-0" />
          </div>

          {pickedDetail}
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
        {/* Published or private — a real ON/OFF switch (owner's ask: no
            tabs), immediately above the sizing row and the button. The
            label and icon flip with the state, and the line underneath
            says what publishing actually means. */}
        {canPublish && (
          <div className="mb-3">
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-muted px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 min-w-0 text-[13px] font-semibold text-foreground">
                {isPublic ? (
                  <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="truncate">
                  {isPublic ? t("extra.roomPublic") : t("extra.roomPrivate")}
                </span>
              </span>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <p className="mt-1 px-1 text-[11.5px] leading-snug text-muted-foreground">
              {isPublic ? t("extra.roomPublicHint") : t("extra.roomPrivateHint")}
            </p>
          </div>
        )}

        {/* How big the match is — under the switch (owner's ask), above the
            button. The two sides are equal by the server's own rule. */}
        {gameChoice === "battle" && (
          <div className="mb-3">
            <h2 className="text-[13.2px] font-medium text-muted-foreground mb-1.5">
              {t("extra.playersPerTeam")}
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted">
              {[2, 3, 4, 5].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setBattleTeamSize(size)}
                  className={`flex-1 rounded-xl px-2 py-2 text-[13px] font-bold tabular-nums transition-colors ${
                    battleTeamSize === size
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {size}-{size}
                </button>
              ))}
            </div>
          </div>
        )}

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

      {/* Deliberate crest choice — the same icon picker the lobby uses. */}
      {crestPickerFor && (
        <RoomIconPickerModal
          isOpen
          iconOnly
          onClose={() => setCrestPickerFor(null)}
          currentIconUrl={teamIcons[crestPickerFor]}
          roomName={crestPickerFor === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB")}
          onConfirm={(iconUrl) => {
            const side = crestPickerFor;
            setCrestPickerFor(null);
            setTeamIcons((prev) => ({ ...prev, [side]: iconUrl }));
          }}
        />
      )}

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
