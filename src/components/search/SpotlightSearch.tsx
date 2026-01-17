import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Command
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
import { useFriends } from "@/hooks/useFriends";
import { useMyRooms } from "@/hooks/useMyRooms";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SpotlightSearchProps {
  className?: string;
}

const COMMANDS = [
  { command: "/newroom", label: "ახალი ოთახის შექმნა", icon: Plus, action: "create-room" },
  { command: "/settings", label: "პარამეტრები", icon: Settings, action: "navigate", path: "/settings" },
  { command: "/profile", label: "ჩემი პროფილი", icon: User, action: "navigate", path: "/profile" },
  { command: "/play", label: "თამაშის დაწყება", icon: Gamepad2, action: "navigate", path: "/game" },
  { command: "/shop", label: "მაღაზია", icon: Store, action: "navigate", path: "/power-ups" },
  { command: "/leaderboard", label: "ლიდერბორდი", icon: Trophy, action: "navigate", path: "/leaderboards" },
  { command: "/notifications", label: "შეტყობინებები", icon: Bell, action: "navigate", path: "/notifications" },
  { command: "/help", label: "დახმარება", icon: HelpCircle, action: "navigate", path: "/support" },
  { command: "/team", label: "გუნდი", icon: Users, action: "navigate", path: "/team" },
  { command: "/logout", label: "გასვლა", icon: LogOut, action: "logout" },
];

const SpotlightSearch: React.FC<SpotlightSearchProps> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  // Data hooks
  const { categories } = useCategories();
  const { friends } = useFriends();
  const { rooms } = useMyRooms();
  
  // Command detection
  const isCommand = query.startsWith("/");
  const lowerQuery = query.toLowerCase();

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setInputValue("");
    } else if (inputValue) {
      // Transfer any typed value to query when modal opens
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

  // Filter friends
  const filteredFriends = useMemo(() => {
    if (isCommand || !query) return friends.slice(0, 5);
    return friends
      .filter(f => f.nickname.toLowerCase().includes(lowerQuery))
      .slice(0, 5);
  }, [friends, query, isCommand, lowerQuery]);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    if (isCommand || !query) return rooms.slice(0, 5);
    return rooms
      .filter(r => 
        (r.room_name || r.room_code || "").toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5);
  }, [rooms, query, isCommand, lowerQuery]);

  // Handle command execution
  const handleCommandSelect = async (cmd: typeof COMMANDS[0]) => {
    setOpen(false);
    
    switch (cmd.action) {
      case "create-room":
        navigate("/team", { state: { openCreateRoom: true } });
        break;
      case "navigate":
        if (cmd.path) navigate(cmd.path);
        break;
      case "logout":
        await signOut();
        navigate("/auth");
        break;
    }
  };

  // Handle category select
  const handleCategorySelect = (categoryId: string) => {
    setOpen(false);
    navigate(`/category/${categoryId}`);
  };

  // Handle friend select
  const handleFriendSelect = (friendId: string) => {
    setOpen(false);
    navigate(`/profile/${friendId}`);
  };

  // Handle room select
  const handleRoomSelect = (roomCode: string) => {
    setOpen(false);
    navigate(`/room/${roomCode}`);
  };

  // Handle input change - open modal when typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (value && !open) {
      setOpen(true);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    // Focus is ready for typing, modal opens on first keystroke
  };

  // Handle input keydown
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      setOpen(true);
    }
    if (e.key === "Escape") {
      setInputValue("");
      inputRef.current?.blur();
    }
  };

  return (
    <>
      {/* Input Bar - acts like real input */}
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
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder="ძებნა..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <kbd 
          className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 text-[10px] font-medium text-muted-foreground border border-border/50 cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={() => setOpen(true)}
        >
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </motion.div>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder={isCommand ? "შეიყვანე ბრძანება..." : "ძებნა კატეგორიებში, მეგობრებში, ოთახებში..."}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <Search className="w-10 h-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">არაფერი მოიძებნა</p>
              <p className="text-xs text-muted-foreground/70">
                სცადე <span className="font-mono bg-muted px-1 rounded">/</span> ბრძანებებისთვის
              </p>
            </div>
          </CommandEmpty>

          {/* Commands Group (when starts with /) */}
          {isCommand && filteredCommands.length > 0 && (
            <CommandGroup heading="ბრძანებები">
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
                    <span className="text-xs text-muted-foreground font-mono">{cmd.command}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick Actions (when no query) */}
          {!isCommand && !query && (
            <>
              <CommandGroup heading="სწრაფი მოქმედებები">
                <CommandItem 
                  onSelect={() => handleCommandSelect(COMMANDS[0])}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <span>ახალი ოთახის შექმნა</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">/newroom</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => { setOpen(false); navigate("/game"); }}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span>თამაშის დაწყება</span>
                </CommandItem>
                <CommandItem 
                  onSelect={() => { setOpen(false); navigate("/discover"); }}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <span>აღმოაჩინე</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Categories */}
          {!isCommand && filteredCategories.length > 0 && (
            <CommandGroup heading="კატეგორიები">
              {filteredCategories.map((category) => (
                <CommandItem 
                  key={category.id}
                  onSelect={() => handleCategorySelect(category.id)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div 
                    className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ backgroundColor: category.color + "20" }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: category.color }} />
                  </div>
                  <span>{category.name}</span>
                  {category.totalLevels && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {category.totalLevels} დონე
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
              <CommandGroup heading="მეგობრები">
                {filteredFriends.map((friend) => (
                  <CommandItem 
                    key={friend.id}
                    onSelect={() => handleFriendSelect(friend.id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={friend.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {friend.nickname.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{friend.nickname}</span>
                    {friend.isOnline && (
                      <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        ონლაინ
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
              <CommandGroup heading="თამაშის ოთახები">
                {filteredRooms.map((room) => (
                  <CommandItem 
                    key={room.id}
                    onSelect={() => handleRoomSelect(room.room_code)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                      <Gamepad2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span>{room.room_name || room.room_code}</span>
                      <span className="text-xs text-muted-foreground">
                        {room.participants?.length || 0} მოთამაშე
                      </span>
                    </div>
                    {room.status === "playing" && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        მიმდინარე
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
              <CommandGroup heading="მაღაზია">
                <CommandItem 
                  onSelect={() => { setOpen(false); navigate("/power-ups"); }}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span>პაუერ-აფები</span>
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
    </>
  );
};

export default SpotlightSearch;
