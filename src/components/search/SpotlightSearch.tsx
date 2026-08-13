import React, { useState, useEffect, useMemo } from "react";
import { portal } from "@/lib/overlayPortal";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Plus, 
  Settings, 
  User, 
  Gamepad2, 
  Store, 
  Trophy, 
  Bell, 
  HelpCircle, 
  LogOut,
  Sparkles,
  Users,
  Zap,
  Command,
  ChevronLeft,
  X
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCategories } from "@/hooks/useCategories";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";
import { getGradientById } from "@/config/roomGradients";
import { useFriends } from "@/hooks/useFriends";
import { useMyRooms } from "@/hooks/useMyRooms";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections } from "@/hooks/useCollections";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import { Input } from "@/components/ui/input";
import { SearchHorizontalLists } from "./SearchHorizontalLists";
import { usePlayGuard } from "@/contexts/PlayGuardContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";

interface SpotlightSearchProps {
  className?: string;
  variant?: "bar" | "button";
}

// Command definitions - labels/descriptions resolved via t() at render time.
// The slash command string still powers filtering but is no longer displayed.
const COMMAND_KEYS = [
  { command: "/newroom", labelKey: "extra.ssCreateNewRoom", descKey: "extra.ssDescNewRoom", icon: Plus, action: "create-room" as const },
  { command: "/settings", labelKey: "extra.ssSettings", descKey: "extra.ssDescSettings", icon: Settings, action: "navigate" as const, path: "/settings" },
  { command: "/profile", labelKey: "extra.ssMyProfile", descKey: "extra.ssDescProfile", icon: User, action: "navigate" as const, path: "/profile" },
  { command: "/play", labelKey: "extra.ssStartGame", descKey: "extra.ssDescPlay", icon: Gamepad2, action: "navigate" as const, path: "/game" },
  { command: "/shop", labelKey: "extra.ssShop", descKey: "extra.ssDescShop", icon: Store, action: "navigate" as const, path: "/power-ups" },
  { command: "/leaderboard", labelKey: "extra.ssLeaderboard", descKey: "extra.ssDescLeaderboard", icon: Trophy, action: "navigate" as const, path: "/leaderboards" },
  { command: "/notifications", labelKey: "extra.ssNotifications", descKey: "extra.ssDescNotifications", icon: Bell, action: "navigate" as const, path: "/notifications" },
  { command: "/help", labelKey: "extra.ssHelp", descKey: "extra.ssDescHelp", icon: HelpCircle, action: "navigate" as const, path: "/support" },
  { command: "/team", labelKey: "extra.ssTeam", descKey: "extra.ssDescTeam", icon: Users, action: "navigate" as const, path: "/team" },
  { command: "/logout", labelKey: "extra.ssLogout", descKey: "extra.ssDescLogout", icon: LogOut, action: "logout" as const },
];

const SpotlightSearch: React.FC<SpotlightSearchProps> = ({ className, variant = "bar" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isSearchOpenFromUrl = searchParams.get("search") === "open";
  
  const [open, setOpen] = useState(isSearchOpenFromUrl);
  const [query, setQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { openProfile } = usePlayerProfile();
  const { signOut } = useAuth();
  const { guardPlay } = usePlayGuard();
  const { t } = useLanguage();
  
  // Resolve command labels with current language
  const COMMANDS = useMemo(() =>
    COMMAND_KEYS.map(cmd => ({ ...cmd, label: t(cmd.labelKey), description: t(cmd.descKey) })),
    [t]
  );
  
  // Data hooks
  const { categories } = useCategories();
  const { friends } = useFriends();
  const { rooms } = useMyRooms({ limit: 20 });
  const { data: trivias = [] } = useMyQuizPosts();
  const { data: collections = [] } = useMyCollections();
  
  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sync open state with URL param
  useEffect(() => {
    const isOpenInUrl = searchParams.get("search") === "open";
    if (isOpenInUrl !== open) {
      setOpen(isOpenInUrl);
    }
  }, [searchParams]);

  // Update URL when open state changes (user action)
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    setSearchParams(prev => {
      if (newOpen) {
        prev.set("search", "open");
      } else {
        prev.delete("search");
      }
      return prev;
    }, { replace: !newOpen }); // Use replace when closing to not add extra history entry
  };

  // Focus mobile input when panel opens
  useEffect(() => {
    if (open && isMobile && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [open, isMobile]);
  
  // Command detection
  const isCommand = query.startsWith("/");
  const lowerQuery = query.toLowerCase();

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setInputValue("");
    } else if (inputValue) {
      setQuery(inputValue);
      setInputValue("");
    }
  }, [open, inputValue]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!isCommand) return [];
    return COMMANDS.filter(cmd => 
      cmd.command.toLowerCase().includes(lowerQuery) ||
      cmd.label.toLowerCase().includes(lowerQuery.replace("/", ""))
    );
  }, [isCommand, lowerQuery]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    if (isCommand || !query) return categories.slice(0, 6);
    return categories
      .filter(c => c.name.toLowerCase().includes(lowerQuery))
      .slice(0, 6);
  }, [categories, query, isCommand, lowerQuery]);

  // Filter friends for mobile
  const filteredFriends = useMemo(() => {
    if (isCommand) return [];
    if (!query) return friends.slice(0, 10);
    return friends
      .filter(f => f.nickname.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [friends, query, isCommand, lowerQuery]);

  // Filter rooms for mobile
  const filteredRooms = useMemo(() => {
    if (isCommand) return [];
    if (!query) return rooms.slice(0, 10);
    return rooms
      .filter(r => 
        (r.room_name || r.room_code || "").toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10);
  }, [rooms, query, isCommand, lowerQuery]);

  // Filter trivias for mobile
  const filteredTrivias = useMemo(() => {
    if (isCommand) return [];
    if (!query) return trivias.slice(0, 10);
    return trivias
      .filter(t => t.title?.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [trivias, query, isCommand, lowerQuery]);

  // Filter collections for mobile
  const filteredCollections = useMemo(() => {
    if (isCommand) return [];
    if (!query) return collections.slice(0, 10);
    return collections
      .filter(c => c.title?.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [collections, query, isCommand, lowerQuery]);

  // Handle command execution
  const handleCommandSelect = async (cmd: typeof COMMANDS[0]) => {
    handleOpenChange(false);
    
    switch (cmd.action) {
      case "create-room":
        navigate("/team", { state: { openCreateRoom: true } });
        break;
      case "navigate":
        if (cmd.path) {
          // Guard game-starting paths
          if (cmd.path === "/game") {
            if (!guardPlay(() => navigate("/game"))) return;
          }
          navigate(cmd.path);
        }
        break;
      case "logout":
        await signOut();
        navigate("/auth");
        break;
    }
  };

  // Handle category select
  const handleCategorySelect = (categoryId: string) => {
    handleOpenChange(false);
    navigate(`/category/${categoryId}`);
  };

  // Handle friend select — open the profile modal directly over the
  // current page; routing to /profile/:id swaps the page for a Suspense
  // skeleton while the lazy route chunk loads
  const handleFriendSelect = (friendId: string) => {
    handleOpenChange(false);
    openProfile(friendId);
  };

  // Handle room select
  const handleRoomSelect = (roomCode: string) => {
    handleOpenChange(false);
    navigate(`/room/${roomCode}`);
  };

  // Handle trivia select
  const handleTriviaSelect = (triviaId: string) => {
    handleOpenChange(false);
    navigate(`/trivia/${triviaId}`);
  };

  // Handle collection select
  const handleCollectionSelect = (collectionId: string) => {
    handleOpenChange(false);
    navigate(`/collection/${collectionId}`);
  };

  // Section heading with roomier typography and a right-aligned "all" link
  // that jumps to the full list for that section
  const groupHeading = (label: string, onAll?: () => void) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-semibold text-foreground/80">{label}</span>
      {onAll && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            handleOpenChange(false);
            onAll();
          }}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {t("extra.ssViewAll")}
        </button>
      )}
    </div>
  );

  // Handle input change - open modal when typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value && !open) {
      handleOpenChange(true);
    }
  };

  // Handle input keydown
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      handleOpenChange(true);
    }
    if (e.key === "Escape") {
      setInputValue("");
      inputRef.current?.blur();
    }
  };

  // Render mobile full-screen panel
  if (isMobile && open) {
    return (
      <>
        {/* Button trigger (still needed for initial open) */}
        {variant === "button" && (
          <motion.button
            className={`relative p-2 rounded-full hover:bg-white/30 transition-colors ${className}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleOpenChange(true)}
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        )}
        
        {/* Full-screen mobile panel. Portalled to <body>: the header that
            hosts the search button is a backdrop-blur bar, which makes it the
            containing block for position:fixed children — inside it, inset-0
            resolves to the header's own box, so the panel covered only the
            header strip and the page showed straight through the rest. */}
        {portal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col"
          >
            {/* Header with search bar */}
            <div className="flex items-center gap-3 p-4 border-b border-border safe-top">
              <motion.button
                onClick={() => handleOpenChange(false)}
                whileTap={{ scale: 0.9 }}
                className="p-2 -ml-2 rounded-full hover:bg-muted"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </motion.button>
              
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={mobileInputRef}
                  type="text"
                  placeholder={t("extra.ssSearchPlaceholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-10 h-11 rounded-full bg-muted border-0"
                />
                {query && (
                  <motion.button
                    onClick={() => setQuery("")}
                    whileTap={{ scale: 0.9 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Content with horizontal lists */}
            <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
              <SearchHorizontalLists
                friends={filteredFriends}
                rooms={filteredRooms}
                trivias={filteredTrivias.map(t => ({
                  id: t.id,
                  title: t.title || "",
                  cover_image: t.cover_image,
                  cover_gradient: t.cover_gradient,
                  question_count: t.question_count,
                }))}
                collections={filteredCollections.map(c => ({
                  id: c.id,
                  title: c.title,
                  cover_image: c.cover_image,
                  cover_gradient: c.cover_gradient,
                  rounds: c.rounds,
                }))}
                onSelectFriend={handleFriendSelect}
                onSelectRoom={handleRoomSelect}
                onSelectTrivia={handleTriviaSelect}
                onSelectCollection={handleCollectionSelect}
              />

              {/* Empty state */}
              {filteredFriends.length === 0 && 
               filteredRooms.length === 0 && 
               filteredTrivias.length === 0 && 
               filteredCollections.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-sm">{t("extra.ssNothingFound")}</p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        )}
      </>
    );
  }

  return (
    <>
      {variant === "button" ? (
        /* Button mode - just an icon */
        <motion.button
          className={`relative p-2 rounded-full hover:bg-white/30 transition-colors ${className}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleOpenChange(true)}
        >
          <Search className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      ) : (
        /* Bar mode - full search bar */
        <motion.div
          className={`relative flex items-center gap-3 px-4 py-2 rounded-full h-[42px] w-full max-w-[750px] bg-white/40 backdrop-blur-sm border border-purple-900/10 ${className}`}
          whileHover={{ backgroundColor: "rgba(255,255,255,0.5)" }}
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={t("extra.ssSearchPlaceholder")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd 
            className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 text-[10px] font-medium text-muted-foreground border border-border/50 cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={() => handleOpenChange(true)}
          >
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </motion.div>
      )}

      {/* Command Dialog (Desktop only) */}
      {!isMobile && (
        <CommandDialog open={open} onOpenChange={handleOpenChange}>
          <CommandInput 
            placeholder={isCommand ? t("extra.ssEnterCommand") : t("extra.ssSearchInCategoriesFriendsRooms")}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-6">
                <Search className="w-10 h-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t("extra.ssNothingFound")}</p>
                <p className="text-xs text-muted-foreground/70">
                  {t("extra.ssTryCommands")} <span className="font-mono bg-muted px-1 rounded">/</span> {t("extra.ssTryCommandsSuffix")}
                </p>
              </div>
            </CommandEmpty>

            {/* Commands Group (when starts with /) */}
            {isCommand && filteredCommands.length > 0 && (
              <CommandGroup heading={groupHeading(t("extra.ssCommands"))}>
                {filteredCommands.map((cmd) => (
                  <CommandItem 
                    key={cmd.command}
                    onSelect={() => handleCommandSelect(cmd)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                      <cmd.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{cmd.label}</span>
                      <span className="text-xs text-muted-foreground">{cmd.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Quick Actions (when no query) */}
            {!isCommand && !query && (
              <>
                <CommandGroup heading={groupHeading(t("extra.ssQuickActions"))}>
                  <CommandItem 
                    onSelect={() => handleCommandSelect(COMMANDS[0])}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <span>{t("extra.ssCreateNewRoom")}</span>
                  </CommandItem>
                  <CommandItem 
                    onSelect={() => { 
                      if (!guardPlay(() => { setOpen(false); navigate("/game"); })) { setOpen(false); return; }
                      setOpen(false); navigate("/game"); 
                    }}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span>{t("extra.ssStartGame")}</span>
                  </CommandItem>
                  <CommandItem 
                    onSelect={() => { setOpen(false); navigate("/discover"); }}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                      <Search className="w-4 h-4 text-white" />
                    </div>
                    <span>{t("extra.ssDiscover")}</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Categories */}
            {!isCommand && filteredCategories.length > 0 && (
              <CommandGroup heading={groupHeading(t("extra.ssCategories"), () => navigate("/discover"))}>
                {filteredCategories.map((category) => (
                  <CommandItem 
                    key={category.id}
                    onSelect={() => handleCategorySelect(category.id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                      <QuizCategoryIcon
                        iconSlug={category.icon_slug ?? undefined}
                        imageUrl={category.image_url ?? undefined}
                        categoryId={category.id}
                        size={30}
                      />
                    </div>
                    <span>{category.name}</span>
                    {category.totalLevels && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {category.totalLevels} {t("extra.ssLevels")}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Friends */}
            {!isCommand && filteredFriends.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={groupHeading(t("extra.ssFriends"), () => navigate("/team"))}>
                  {filteredFriends.slice(0, 5).map((friend) => (
                    <CommandItem 
                      key={friend.id}
                      onSelect={() => handleFriendSelect(friend.friendId)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Avatar className="w-8 h-8">
                        <ResolvedAvatarImage src={friend.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {friend.nickname.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{friend.nickname}</span>
                      {friend.isOnline && (
                        <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600">
                         <span className="w-2 h-2 rounded-full bg-green-500" />
                          {t("extra.ssOnline")}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Game Rooms */}
            {!isCommand && filteredRooms.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={groupHeading(t("extra.ssGameRooms"), () => navigate("/team?tab=rooms"))}>
                  {filteredRooms.slice(0, 5).map((room) => (
                    <CommandItem 
                      key={room.id}
                      onSelect={() => handleRoomSelect(room.room_code)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden shrink-0"
                        style={{ background: getGradientById(room.background_gradient)?.gradient }}
                      >
                        {room.room_icon ? (
                          <img src={room.room_icon} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          <Gamepad2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span>{room.room_name || room.room_code}</span>
                        <span className="text-xs text-muted-foreground">
                          {room.participants?.length || 0} {t("extra.ssPlayers")}
                        </span>
                      </div>
                      {room.status === "playing" && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                          {t("extra.ssOngoing")}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* My Trivias - with their real covers */}
            {!isCommand && filteredTrivias.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={groupHeading(t("extra.cpMyTrivias"), () => navigate("/team?tab=my-content"))}>
                  {filteredTrivias.slice(0, 5).map((trivia) => (
                    <CommandItem
                      key={trivia.id}
                      onSelect={() => handleTriviaSelect(trivia.id)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div
                        className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
                        style={{ background: trivia.cover_gradient || "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}
                      >
                        {trivia.cover_image && (
                          <img src={trivia.cover_image} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="truncate">{trivia.title}</span>
                      {typeof trivia.question_count === "number" && trivia.question_count > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground shrink-0">
                          {t("extra.questionsCount", { count: trivia.question_count })}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Shop */}
            {!isCommand && (
              <>
                <CommandSeparator />
                <CommandGroup heading={groupHeading(t("extra.ssShop"), () => navigate("/power-ups"))}>
                  <CommandItem 
                    onSelect={() => { setOpen(false); navigate("/power-ups"); }}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span>{t("extra.ssPowers")}</span>
                  </CommandItem>
                  <CommandItem 
                    onSelect={() => { setOpen(false); navigate("/vip"); }}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <span>VIP</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandDialog>
      )}
    </>
  );
};

export default SpotlightSearch;
