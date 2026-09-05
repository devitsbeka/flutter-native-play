import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { useState, useEffect, useRef, useMemo, useCallback, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useLanguage } from "@/contexts/LanguageContext";
import { anyBlockedText, containsBlockedText } from "@/utils/contentFilter";
import { Loader2, ArrowLeft, Bell, X, RefreshCw, Pencil, Gamepad2, Plus, Check, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateRoomIdentity } from "@/utils/roomNameGenerator";
import { roomVisibilityFields } from "@/utils/roomVisibility";
import { localizeCategoryNames } from "@/utils/localizeCategories";
import { filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";
import { readAppLanguage } from "@/utils/appLanguage";
import { dealTeamNames } from "@/utils/teamNameGenerator";
import { useFriends } from "@/hooks/useFriends";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { categoryGradient } from "@/utils/categoryGradient";
import { useResponsiveVideo } from "@/hooks/useResponsiveVideo";
import { createNotification, useNotifications } from "@/hooks/useNotifications";
// Room names are AI-generated via edge function during room creation
import { TVPlayModal } from "@/components/team/TVPlayModal";
import { isPartyCategory } from "@/config/partyCategories";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";
import { GuessPickerScreen } from "@/components/team/GuessPickerScreen";
import { CategorySelectorModal } from "@/components/team/CategorySelectorModal";
import { CategoryPickerModal } from "@/components/team/CategoryPickerModal";
import { CreateBlindTriviaModal } from "@/components/team/CreateBlindTriviaModal";
import { CreateCollectionModal } from "@/components/social/CreateCollectionModal";
import { RoomIconPickerModal } from "@/components/team/RoomIconPickerModal";
import { MyTriviasPickerModal } from "@/components/team/MyTriviasPickerModal";
import { GameStylePersonalTrivia } from "@/components/team/GameStylePersonalTrivia";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIconLibrary } from "@/hooks/useIconLibrary";
import iconCollections from "@/assets/icon-collections.png";
import secretBookcase from "@/assets/secret-bookcase.png";
import triviaBuzzer from "@/assets/trivia-buzzer-3.png";
import iconGroupOfPeople from "@/assets/group-of-people.png";
import stickerAlbum from "@/assets/sticker-album.png";
import featuredQuick from "@/assets/play-chooser/featured-quick.webp";
// The Guess card's scene. The file is still called "random" — it is the
// mascot under a shower of question marks, which is what a guessing game
// looks like; the mode it was drawn for is gone and the art outlived it.
import featuredGuess from "@/assets/play-chooser/featured-random.webp";
import iconWordsBoard from "@/assets/play-chooser/icon-words.webp";
import featuredKing from "@/assets/play-chooser/featured-king.webp";
import featuredBattle from "@/assets/play-chooser/featured-battle.webp";
import featuredWords from "@/assets/play-chooser/featured-words.webp";
import featuredLibrary from "@/assets/play-chooser/featured-library.webp";
import featuredMyTrivias from "@/assets/play-chooser/featured-mytrivias.webp";
import playersIcon from "@/assets/play-chooser/players.svg";
import { LOBBY_SCENES, rememberLobbyScene } from "@/utils/lobbyScene";
import { UniversalLobby, type LobbyPlayer } from "@/components/lobby/UniversalLobby";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
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
type GameChoice = "quick" | "guess" | "king" | "battle" | "words" | "library" | "mytrivias";

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
  /**
   * Skip the fade-in and paint opaque on the first frame.
   *
   * This screen is a `fixed inset-0` overlay that covers the page completely
   * — but it entered from `opacity: 0`, so for the length of the fade the
   * page underneath showed through it. That is fine when it is opened from
   * inside the rooms hub, where the cross-fade is the transition. It is wrong
   * when the play chooser sends someone straight here: the hub is not a
   * screen they asked for, and watching it resolve into the create screen
   * reads as the app landing somewhere else first and then correcting itself.
   */
  enterInstantly?: boolean;
}

export function CreateRoomPage({ onClose, challengeUserId, defaultChallengeType, autoOpenPersonalTrivia, preSelectedCategory, enterInstantly = false }: CreateRoomPageProps) {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const bubbleVideo = useResponsiveVideo("/videos/floating-blob.mp4");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createRoom, startGame, loading } = useMultiplayerV2();

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
  // Words has no room until it starts, so it opens the universal lobby
  // over this screen first — you and the one friend you pick — and its
  // Start is what presses Create. The quick game goes straight to the VS
  // spin (owner's call): no lobby for a duel against a bot.
  const [preLobby, setPreLobby] = useState<"words" | null>(null);
  const [friendPickOpen, setFriendPickOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Which game the room is for. A pre-selected category or a challenge lands
  // on the matching source card; otherwise NOTHING is picked — starting on
  // Random quietly rolled a category the player never chose, and the create
  // button read as ready for a game nobody asked for.
  const { developerMode } = useDeveloperMode();
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
   *
   * Not a switch any more, and not because the choice went away — it moved.
   * The lobby has the same control, on the screen where the room exists;
   * asking on the way in as well meant answering the same question twice
   * before there was anything to be public ABOUT.
   */
  const isPublic = true;

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
  // A party category ("Most Likely To") is friends voting on each other —
  // a private room's game, never a published one. Picking it takes the
  // public switch off the screen; the room stays private.
  const partyPicked = isPartyCategory(selectedCategory?.category_id ?? selectedCategory?.id);
  const canPublish =
    (gameChoice === "guess" || gameChoice === "library" || gameChoice === "battle") && !partyPicked;
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
  // The sides' NAMES, dealt with the crests (plural, the owner's rule —
  // "Team A" told nobody anything). They ride the same handoff and are
  // written with the room row; the captain renames later in the lobby.
  const [teamNames, setTeamNames] = useState<{ a: string | null; b: string | null }>({
    a: null,
    b: null,
  });
  // The cards never open on the same stock hat and race car: the moment
  // Battle is picked, both sides get dealt a random crest from the library
  // (once — a re-visit keeps what was dealt or chosen).
  const crestsDealtRef = useRef(false);
  useEffect(() => {
    if (gameChoice !== "battle" || crestsDealtRef.current) return;
    crestsDealtRef.current = true;
    void rollTeamIcon("a");
    void rollTeamIcon("b");
    setTeamNames(dealTeamNames(readAppLanguage()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameChoice]);
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
      const other = prev[side === "a" ? "b" : "a"];
      let next = prev[side];
      // A deal that repeats this side's icon reads as a dead tap, and two
      // sides wearing the same crest reads as one team.
      for (let tries = 0; tries < 8 && (next === prev[side] || next === other); tries++) {
        next = pool[Math.floor(Math.random() * pool.length)];
      }
      return { ...prev, [side]: next };
    });
  };

  /**
   * How many a side the arena is set for: 2-2 through 5-5.
   *
   * It caps the room (max_players) and the seats the lobby draws. The
   * default is 2-2 — the smallest game that can start — unless this
   * device picked something else last time: the choice is remembered
   * per device (owner's ask), and a cleared store just means 2-2 again.
   */
  const [battleTeamSize] = useState(() => {
    try {
      const saved = Number(localStorage.getItem("mt.battleTeamSize"));
      return saved >= 2 && saved <= 5 ? saved : 2;
    } catch {
      return 2;
    }
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  
  const [showTVModal, setShowTVModal] = useState(false);
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

  // A card starts its game itself. Picking a mode and then pressing Create
  // were two taps to one place, with a half-height "picked" state between
  // them that read as a page of its own; the tap now arms a start, and the
  // effect by the Create handler presses Create the moment the mode is
  // ready — at once for the lounges, the arena, Words and the duel; after
  // the deal for Random; after the picker for the library and My Trivia.
  const autoStart = useRef(false);

  const startMode = (key: GameChoice) => {
    if (isCreating) return;
    rememberLobbyScene(key);
    setGameChoice(key);
    if (key === "words") {
      setPreLobby(key);
      return;
    }
    if (key === "guess") {
      // The one card that asks a question back. Which picture game — the
      // logos, the flags, the cities — is the whole choice, so the card
      // unfolds them rather than starting something on its own.
      setSelectionMode(null);
      setSelectedCategory(null);
      return;
    }
    autoStart.current = true;
    if (key === "library" && !(selectionMode === "library" && selectedCategory)) setShowCategoriesModal(true);
    if (key === "mytrivias" && !challengeTrivia) void handleOptionClick("my-trivias");
  };

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
  const { unreadCount } = useNotifications();

  // The poster cards take the row's height and derive their width from
  // the designed 393:686 ratio. CSS alone cannot say that here: the row's
  // height comes from flex-grow inside a min-height column, which leaves
  // it indefinite for percentage heights and for aspect-ratio transfer
  // (both left the cards 0px wide or taller than the row, clipped by the
  // footer). So the row measures itself and publishes --row-h, its content
  // height, and the cards read it.
  //
  // A callback ref rather than a mount effect, because the row is not always
  // on screen: the Guess screen replaces it, and coming back mounts a NEW row
  // element while this component stays mounted throughout. An effect with []
  // deps never re-ran for that node — it went on observing the old, detached
  // one — so --row-h was never set on the new row and every card resolved to
  // a height of zero. Back from Guess landed on a heading, a hairline, and no
  // cards at all.
  const rowObserver = useRef<ResizeObserver | null>(null);
  const rowRef = useCallback((el: HTMLDivElement | null) => {
    rowObserver.current?.disconnect();
    rowObserver.current = null;
    if (!el) return;
    const publish = () => {
      const cs = getComputedStyle(el);
      const inner = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      el.style.setProperty("--row-h", `${Math.max(0, inner)}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    rowObserver.current = ro;
  }, []);

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
        : // Guess picks a category like the library does — it is the same
          // room, opened on one of the picture games. The roll a "random"
          // entry point runs is not a settled choice until it stops.
          hasValidSelection && !isSearchingRandom;

  /**
   * The Guess card asks which picture game — and the answer is a screen of
   * its own (Figma 1059:8), not a strip of tiles under the card that asked.
   * It replaces the carousel and the Create button for as long as the
   * question is open: the tap on a game IS the Create press.
   */
  const guessPicking = gameChoice === "guess";

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
          teamNames: gameChoice === "battle" ? teamNames : undefined,
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

    /**
     * The room to walk into once this is done, when nothing else will.
     *
     * The two trivia branches below navigate themselves. The category
     * branch never did: it leaned on createRoom flipping the multiplayer
     * context to phase "lobby", which the rooms hub renders over itself —
     * and /create-room mounts its OWN provider whose only consumer is this
     * screen. So on that route the room was created, the context changed,
     * and absolutely nothing happened on screen. The Guess tiles made it
     * obvious (a tap with no Create button behind it to press instead), but
     * the library's picker was landing in the same hole.
     */
    let walkInCode: string | null = null;

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
        // The code the room actually got, not the one that was planned:
        // createRoom falls back to a fresh code on a collision.
        walkInCode = room?.room_code ?? null;

        /**
         * A Guess tile is "play this": the round starts HERE, before the
         * screen changes, so /team opens a room that is already playing and
         * never renders a lobby at all.
         *
         * This used to be done from the other end — the create screen sent
         * ?autostart=1 and the lobby pressed its own Start when it saw it —
         * and that is a race with several ways to lose: the lobby has to
         * mount, read the flag back out of a URL that three effects rewrite,
         * and find the room, the seat, the host flag and the category all
         * settled in the same render. Miss any one and it waits for a
         * condition that has already passed. Starting it here needs none of
         * that to line up.
         *
         * If it fails, the room is left in "waiting" and the walk-in below
         * lands on the lobby with a working Start button — which is the right
         * thing to fall back to.
         */
        if (gameChoice === "guess" && room) {
          await startGame(false, room);
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

      // Last, so the invitations above are sent before this screen goes.
      if (walkInCode) {
        onClose();
        navigate(`/team?join=${walkInCode}`);
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
  /**
   * The picture games, in the order the library shows them.
   *
   * Read off the live category list rather than the six ids in
   * popularImageCategories: one of them (guess_movie) has no row in the
   * database, and a tile that opens a category nobody can play is worse
   * than a tile that is not there.
   */
  const guessCategories = useMemo(
    () =>
      (POPULAR_IMAGE_CATEGORY_IDS as readonly string[])
        .map((id) => categories.find((c) => c.category_id === id))
        .filter((c): c is Category => !!c),
    [categories],
  );

  /**
   * A picture game picked on the Guess screen: the same room a library pick
   * opens, on that category. The tap IS the choice, so it arms Create the
   * way every other card's tap does.
   */
  const pickGuessCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setSelectionMode("library");
    autoStart.current = true;
  };

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
                {teamIcons[side] ? (
                  <motion.img
                    key={teamIcons[side]}
                    initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 20 }}
                    src={teamIcons[side]!}
                    alt=""
                    className="w-14 h-14 object-contain"
                  />
                ) : (
                  // The random deal is a round-trip away: a quiet slot while
                  // it lands, never the stock hat-and-car pair.
                  <span className="block w-14 h-14 rounded-full bg-muted border-2 border-dashed border-border" />
                )}
                <span className="absolute -right-1.5 -bottom-1 flex w-5 h-5 items-center justify-center rounded-full bg-background shadow-sm border border-border/50">
                  <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                </span>
              </span>
              <span className="text-[14px] font-bold">
                {(side === "a" ? teamNames.a : teamNames.b) ??
                  (side === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB"))}
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

  // The tap above armed a start → press Create the moment the mode is ready.
  //
  // selectedCategory is in the deps because createEnabled does not change
  // when one category replaces another: after a create that failed and
  // toasted, a second tap on a different tile armed the ref and then waited
  // for a dependency that was already true, so nothing fired and nothing
  // said why.
  useEffect(() => {
    if (!autoStart.current) return;
    if (!createEnabled || isCreating) return;
    autoStart.current = false;
    void handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameChoice, createEnabled, isCreating, selectedCategory]);

  return (
    <motion.div
      initial={{ opacity: enterInstantly ? 1 : 0 }}
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

      {/* Header — the home page's own (Figma 1013:1377): the wordmark centred
          between a back arrow and the search + bell pair. The arrow goes home
          rather than back to the rooms list this screen opened over: this is
          the doorstep of a game, and leaving it means leaving. */}
      <header className="relative z-20 shrink-0 border-b border-border/30 px-4 py-3">
        <div className="mx-auto flex w-full max-w-[700px] items-center justify-between gap-3 md:max-w-[520px]">
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => (guessPicking ? setGameChoice(null) : navigate("/"))}
            className="rounded-full p-2 transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </motion.button>
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <button type="button" onClick={() => navigate("/")} aria-label="MyTrivia" className="cursor-pointer">
              <MyTriviaLiveLogo responsive />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <SpotlightSearch variant="button" />
            <motion.button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/30"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/notifications")}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-0.5 top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1"
                  style={{
                    background: "linear-gradient(180deg, #EF4444 0%, #DC2626 100%)",
                    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.5)",
                  }}
                >
                  <span className="text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>
                </motion.div>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {guessPicking ? (
        // The screen the Guess card opens. Its own scroller, like every
        // standalone page here — the document does not scroll on the device.
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <GuessPickerScreen
            title={t("extra.guessPickTitle")}
            categories={guessCategories}
            onPick={pickGuessCategory}
            busyCategoryId={isCreating ? selectedCategory?.category_id ?? null : null}
            disabled={isCreating}
          />
        </div>
      ) : (
        <>
      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {/* The column is WIDE from tablet up — the carousel is the point of
            this screen, and at 520px it showed one card and a sliver, with
            six more hiding off the edge. The detail that unfolds under the
            picked card, the trivia preview, the header and the footer keep
            the 520px reading width. */}
        <div className="mx-auto flex min-h-full w-full max-w-[700px] flex-col space-y-3 px-4 py-3 md:max-w-[1100px]">
        {/* What will you play? — a featured carousel, App Store style: one
            poster-tall card per mode with its own artwork, the title and
            blurb on a scrim at its foot, swiped through sideways and
            snapping card by card. This was a strip of small tiles (Figma
            926-11729) above a screen of empty air; the cards now take the
            height the screen has, and give some back when the picked mode
            unfolds its detail underneath — the random roll, the library
            preview, which side of the arena, the chosen trivia. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <h2 className="shrink-0 pb-[13px] pt-[7px] font-[Nunito] text-[24px] leading-[28px] tracking-[-0.3px] text-[#3a2260]">{t("extra.whatToPlay")}</h2>

          {/* The cards are the row's own items so they stretch to its
              height: a percentage height would not resolve through the
              min-height chain above, and left them 0px tall. */}
          {/* Nothing picked: the cards take the height the screen has —
              they ARE the screen. Something picked: the row gives most of
              it back, a banner rather than a poster, so what the pick
              unfolds underneath (which side of the arena, the trivia, the
              library preview) and the footer's switch and sizing row all
              sit in view without a scroll. The picked card kept its poster
              height and the side picker was two cut-off tops under it. */}
          <div
            ref={rowRef}
            className="-mx-4 mt-[10px] flex min-h-[300px] flex-1 snap-x snap-mandatory scroll-px-4 items-start gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-1 scrollbar-hide [container-type:inline-size]"
          >
            {(
              [
                // artTop: where Figma parks each render, as a share of the
                // card's height (1013:1407 and its siblings); descW: the
                // blurb's box in 393rds, 273 for all but Words' longer line.
                { key: "guess", art: featuredGuess, artTop: 0.05, descW: 273, players: "1-10", title: t("extra.modeGuessTitle"), desc: t("extra.modeGuessDesc") },
                { key: "quick", art: featuredQuick, artTop: -1.71, descW: 273, players: "1-10", title: t("extra.modeQuickTitle"), desc: t("extra.modeQuickDesc") },
                // The King and Battle posters are developer-only until the
                // modes are promoted — see DEVELOPER_ONLY_GAME_TYPES.
                ...(developerMode
                  ? [
                      { key: "king", art: featuredKing, artTop: 0, descW: 273, players: "1-10", title: t("extra.modeKingTitle"), desc: t("lobby.kingCardDesc") },
                      { key: "battle", art: featuredBattle, artTop: -4.56, descW: 273, players: "4-10", title: t("extra.modeBattleTitle"), desc: t("gameTypes.teamBattleDesc") },
                    ]
                  : []),
                { key: "words", art: featuredWords, artTop: 0.04, descW: 329, players: "1-2", title: t("gameTypes.wordsTitle"), desc: t("extra.modeWordsDesc") },
                { key: "library", art: featuredLibrary, artTop: -2.86, descW: 273, players: null, title: t("extra.modeLibraryTitle"), desc: t("extra.libraryDesc") },
                { key: "mytrivias", art: featuredMyTrivias, artTop: -0.02, descW: 273, players: null, title: t("extra.myTriviaOption"), desc: t("extra.myTriviaDesc") },
              ] as { key: GameChoice; art: string; artTop: number; descW: number; players: string | null; title: string; desc: string }[]
            ).map((card, i) => {
              const isPicked = gameChoice === card.key;
              const busy = isPicked && isCreating;
              return (
                /* One card, to the Figma 1013:1406 pixel: the frame there is
                   393 × 686, so every inner measure is written in --u, one
                   393rd of whatever width the card actually gets. That keeps
                   the 32px title, the 18px blurb, the pill and its 3.4px rim
                   in the designed proportion on a phone and a tablet alike. */
                <motion.button
                  key={card.key}
                  ref={(el) => { cardRefs.current[card.key] = el; }}
                  style={{ "--u": "calc(100cqw / 393)" } as CSSProperties}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.04 * i, type: "spring", stiffness: 380, damping: 32 } }}
                  whileTap={{ scale: 0.965 }}
                  transition={{ type: "spring", stiffness: 480, damping: 28 }}
                  aria-pressed={isPicked}
                  onClick={() => startMode(card.key)}
                  className={cn(
                    // A phone shows one card and the edge of the next; from
                    // tablet up the cards take a fixed width so the wide
                    // column shows two, three or more of them at once.
                    "group relative isolate block shrink-0 snap-start overflow-clip rounded-[28px] bg-[#e9d8ff] text-left [container-type:inline-size]",
                    // The designed 393:686 poster at 84% of the column —
                    // 146.6% of the row's width tall — or the row's height,
                    // whichever is shorter. A short screen keeps the card's
                    // width and loses height instead: the copy is placed at
                    // a share of the height so it rides up with it, and the
                    // scene's masked foot and the wash meet wherever that
                    // leaves them. Never taller than the row, so never under
                    // the Create button. From tablet up the card is 320px.
                    "w-[84%] max-w-[440px] h-[min(146.6cqw,var(--row-h))] md:w-[320px] md:h-[min(558px,var(--row-h))]",
                    isPicked
                      ? "animate-[mode-card-glow_2.6s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:shadow-[0px_0px_0px_3px_#7126d5,0px_12px_32px_0px_rgba(113,38,213,0.35)]"
                      : "shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_8px_24px_0px_rgba(15,23,41,0.1)]",
                  )}
                >
                  {/* The render sits across the top 76.39% of the card in
                      Figma — a 3:4 image at full width. It drifts a little
                      at rest and swells under a held finger; the banner
                      state shows its middle instead, where the subject is. */}
                  {/* The scene sits at z-0 under everything else in the card,
                      said explicitly: iOS composites a playing <video> above
                      its siblings unless the siblings have a z-index of their
                      own, which put the loop over the wash and the pill and
                      left a hard edge where the loop stopped. The mask fades
                      the loop's own foot out over the same stretch the wash
                      fades in, so the scene dissolves into the card rather
                      than ending on a line. */}
                  <div
                    style={{ top: `${card.artTop}%` }}
                    className="absolute left-0 z-0 aspect-[3/4] w-full overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]"
                  >
                    {/* The render, alive: a five-second seamless loop of the
                        same frame (locked camera, only the atmosphere moves),
                        over the still as its poster. The still is what shows
                        under Reduce Motion, in Low Power Mode until a touch,
                        and while the loop is still loading. */}
                    <BackgroundVideo
                      sources={[
                        { src: `/videos/mode-${card.key}.webm`, type: "video/webm" },
                        { src: `/videos/mode-${card.key}.mp4`, type: "video/mp4" },
                      ]}
                      still={card.art}
                      className="absolute inset-0 transition-transform duration-500 ease-out group-active:scale-[1.04]"
                    />
                  </div>
                  {/* 1013:1408 — the lavender wash over the lower 55%. */}
                  <div className="absolute inset-x-0 bottom-0 z-10 h-[55%] bg-[linear-gradient(to_top,#f3e6ff_0%,#f3e6ff_50%,rgba(243,230,255,0)_100%)]" />
                  {/* How many play: the peach pill, top right. */}
                  {card.players && (
                    <div className="absolute right-[calc(12*var(--u))] top-[calc(12*var(--u))] z-20 flex origin-top-right scale-[0.85] items-center gap-[calc(7*var(--u))] rounded-bl-[calc(25.046*var(--u))] rounded-br-[calc(12.57*var(--u))] rounded-tl-[calc(25.05*var(--u))] rounded-tr-[calc(20*var(--u))] border-solid border-white/65 bg-gradient-to-b from-[#fff3ed] to-[#f5cdcd] px-[calc(16*var(--u))] py-[calc(1*var(--u))] shadow-[0px_2.277px_6.831px_0px_rgba(151,64,64,0.06),0px_2.277px_0px_0px_#d6c7c4] border-[length:calc(3.415*var(--u))]">
                      <img alt="" src={playersIcon} className="h-[calc(22.75*var(--u))] w-[calc(17.333*var(--u))]" />
                      <span className="font-hero bg-gradient-to-b from-[#522b28] to-[#99665f] bg-clip-text text-[calc(32*var(--u))] capitalize leading-[calc(48*var(--u))] tracking-[-0.16px] text-transparent whitespace-nowrap">
                        {card.players}
                      </span>
                    </div>
                  )}
                  {/* 20 design-px above the frame's own 78.86% — 10 more than
                      the frame (owner's ask), so the title and its blurb (which
                      wraps to two lines in several languages where the English
                      is one) sit clear of the card's bottom edge. Written in
                      --u so it scales with the card like every other measure. */}
                  <div
                    className="absolute left-[calc(39*var(--u))] right-[calc(20*var(--u))] top-[calc(78.86%_-_20*var(--u))] z-20"
                  >
                    {/* The title runs to the card's edge: a Georgian or German
                        title is longer than the English the frame was set in. */}
                    <p className="font-hero overflow-hidden text-ellipsis whitespace-nowrap text-[calc(32*var(--u))] capitalize leading-[calc(48*var(--u))] tracking-[-0.16px] text-[#402666]">
                      {card.title}
                    </p>
                    <p
                      style={{ width: `calc(${card.descW} * var(--u))` }}
                      className="mt-[calc(13*var(--u))] line-clamp-2 max-w-full font-[Nunito] text-[calc(18*var(--u))] leading-[calc(24*var(--u))] tracking-[-0.16px] text-[#4b5563]"
                    >
                      {card.desc}
                    </p>
                  </div>
                  {busy && (
                    <div className="absolute left-[calc(12*var(--u))] top-[calc(12*var(--u))] z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-md">
                      <Loader2 className="h-[18px] w-[18px] animate-spin text-[#7126d5]" />
                    </div>
                  )}
                </motion.button>
              );
            })}
            <div aria-hidden className="w-px shrink-0" />
          </div>

          <div className="w-full md:mx-auto md:max-w-[520px]">{pickedDetail}</div>
        </div>

        {/* Custom Trivia Preview */}
        <div className="w-full md:mx-auto md:max-w-[520px]">
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
      </div>

      {/* No footer, no Create button. A card starts its game the moment it
          is tapped (see startMode and the auto-start effect), so a button
          that pressed Create for the same thing was a second tap to one
          place — and, being disabled until a card was picked, it read as a
          step the screen was waiting on. */}

        </>
      )}

      {/* End of frosted popup panel */}
      </div>

      {/* The pre-room lobby (Figma 1018:5815) for the modes that have no
          room until they start: it grows out of the tapped card like every
          other lobby, seats you (and, for Words, the one friend you pick),
          and its Start presses Create. */}
      <AnimatePresence>
        {preLobby && (
          <motion.div
            key="pre-lobby"
            // `safe-screen`, so the lobby inside behaves as it does anywhere
            // else. UniversalLobby is a page: it wears `safe-bleed`, which
            // cancels #root's safe-area padding with a negative margin and
            // re-adds it as its own, so its background reaches the true edges
            // while its contents stay clear of the bar. A `fixed` layer never
            // receives #root's padding (see the note on #root in index.css),
            // so inside this wrapper that cancellation had nothing to cancel:
            // the contents rode up under the status bar, and the box finished
            // `--safe-top + --safe-bottom` short of the bottom, uncovering the
            // page behind it as a clipped strip below Start. Padding the
            // wrapper restores the contract the lobby is written against.
            className="fixed inset-0 z-[60] safe-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <UniversalLobby
              sceneArt={LOBBY_SCENES.words}
              roomName={t("gameTypes.wordsTitle")}
              // The board's own sign, like the arena's crate and the King's
              // crown: every lobby says which game it is above the card.
              icon={iconWordsBoard}
              onBack={() => setPreLobby(null)}
              unreadCount={unreadCount}
              onBell={() => navigate("/notifications")}
              labels={{
                rules: t("lobby.uGameRules"),
                players: t("lobby.uPlayersTab"),
                invite: t("lobby.uInvite"),
                you: t("lobby.uYou"),
                rounds: (count) => t("lobby.uRoundsShort", { count }),
                notifications: t("extra.notifications"),
              }}
              // Words publishes no room and picks no category or TV, so
              // the rules tab states what the game is: one board, alone
              // or with the one friend picked on the players tab.
              rules={[]}
              rulesText={[
                { key: "rules", heading: t("lobby.rulesHeading"), body: t("lobby.rulesWords") },
                { key: "time", heading: t("lobby.timeHeading"), body: t("lobby.timeWords") },
              ]}
              // One board seats two: you and the one friend.
              capacity={{
                min: 1,
                max: 2,
                taken: 1 + Math.min(1, collectInvitees().length),
                fullLabel: t("extra.mpRoomFull"),
              }}
              players={[
                {
                  id: user?.id ?? "me",
                  name: profile?.nickname || t("lobby.uYou"),
                  avatarUrl: profile?.avatar_url ?? null,
                  isHost: true,
                  isYou: true,
                },
                // Words seats one friend; the first pick rides along and is
                // invited the moment the board's room exists.
                ...collectInvitees()
                  .slice(0, 1)
                  .map<LobbyPlayer>((f) => ({
                    id: f.id,
                    name: f.nickname,
                    avatarUrl: f.avatarUrl,
                    isHost: false,
                    isYou: false,
                    pending: true,
                    onPress: () => setFriendPickOpen(true),
                  })),
              ]}
              inviteFaces={acceptedFriends
                .slice()
                .sort((a, b) => Number(!!b.isOnline) - Number(!!a.isOnline))
                .slice(0, 3)
                .map((f) => ({ url: f.avatarUrl, online: !!f.isOnline }))}
              onInvite={() => setFriendPickOpen(true)}
              initialTab="players"
              start={{
                label: t("lobby.startGame"),
                onPress: () => void handleCreate(),
                disabled: isCreating,
                loading: isCreating,
              }}
            >
              {/* Which friend to seat on the Words board: one, so a tap
                  picks and closes. */}
              <AnimatePresence>
                {friendPickOpen && (
                  <motion.div
                    key="friend-pick"
                    className="fixed inset-0 z-[130] flex items-end justify-center bg-[rgba(64,38,102,0.35)] backdrop-blur-[6px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setFriendPickOpen(false)}
                  >
                    <motion.div
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 40, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="flex max-h-[70dvh] w-full max-w-[520px] flex-col rounded-t-[28px] border-2 border-[rgba(255,255,255,0.6)] bg-[rgba(252,247,255,0.96)] px-4 pb-[calc(16px_+_var(--safe-bottom))] pt-3 shadow-[0px_-8px_24px_0px_rgba(102,51,153,0.18)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-[#402666]/20" />
                      <p className="mb-2 px-2 font-[Nunito] text-[18px] font-bold leading-6 text-[#402666]">
                        {t("lobby.inviteToGame")}
                      </p>
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        {acceptedFriends.length === 0 && (
                          <p className="px-2 py-6 text-center font-[Nunito] text-[14px] text-[#402666]/60">
                            {t("team.noFriendsYet")}
                          </p>
                        )}
                        {acceptedFriends
                          .slice()
                          .sort((a, b) => Number(!!b.isOnline) - Number(!!a.isOnline))
                          .map((f) => {
                            const picked = selectedFriends.has(f.friendId);
                            return (
                              <button
                                key={f.friendId}
                                type="button"
                                onClick={() => {
                                  setSelectedFriends(picked ? new Set() : new Set([f.friendId]));
                                  setFriendPickOpen(false);
                                }}
                                className="flex h-[60px] w-full items-center gap-3 rounded-[16px] px-2 text-left active:bg-[#ecdbf3]"
                              >
                                <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#e9d8ff]">
                                  {f.avatarUrl && <img alt="" src={f.avatarUrl} className="h-full w-full object-cover" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-[Nunito] text-[15px] font-bold leading-5 text-[#402666]">
                                    {f.nickname}
                                  </span>
                                  <span className="block font-[Nunito] text-[12px] leading-4 text-[#402666]/60">
                                    {f.isOnline ? t("extra.onlineStatus") : t("extra.offlineStatus")}
                                  </span>
                                </span>
                                <span
                                  className={
                                    picked
                                      ? "flex h-7 w-7 items-center justify-center rounded-full bg-[#10b981] text-white"
                                      : "h-7 w-7 rounded-full border-[1.5px] border-dashed border-[#10b981]"
                                  }
                                >
                                  {picked && <Check className="h-4 w-4" strokeWidth={3} />}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </UniversalLobby>
          </motion.div>
        )}
      </AnimatePresence>

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
        allowParty={!publishRoom}
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
        allowParty={!publishRoom}
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
