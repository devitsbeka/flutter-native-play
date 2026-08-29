import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useTVGame } from '@/contexts/TVGameContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Crown, Users, Play, Shuffle, Check, X, UserPlus } from 'lucide-react';
import { SmartAvatar } from '@/components/shared/SmartAvatar';
import { supabase } from '@/integrations/supabase/client';
import { filterCategoriesForLanguage } from '@/utils/languageCategoryFilter';
import { excludePartyCategories } from '@/config/partyCategories';
import { useTVSessionQueue } from '@/hooks/useTVSessionQueue';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import retroTvIcon from '@/assets/retro-tv-colored.png';
import triviaBuzzer from '@/assets/trivia-buzzer.png';
import { TVBrandingOverlay } from './TVBrandingOverlay';
import { MyTriviaLiveLogo } from '@/components/shared/MyTriviaLiveLogo';
import { currentBuildLabel } from '@/hooks/useFreshBuildGuard';

const MAX_PLAYERS = 8;
const MIN_PLAYERS_TO_START = 2;
const AUTO_START_DELAY = 15; // seconds

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon: string;
}

interface InvitedGuest {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  status: string;
}

export const TVLobbyScreenV2: React.FC = () => {
  const { code, sessionId, players, categoryName, categoryIcon, isHost, startGame, categoryQueue: contextQueue } = useTVGame() as any;
  const { t } = useLanguage();
  const [roomName, setRoomName] = useState('');
  const [roomIcon, setRoomIcon] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [invitedGuests, setInvitedGuests] = useState<InvitedGuest[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [hostProfile, setHostProfile] = useState<{ user_id: string; nickname: string; avatar_url: string | null } | null>(null);
  
  // Auto-start countdown state
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPlayerCountRef = useRef<number>(0);
  
  // Track newly joined players for entrance animations
  const [newlyJoinedIds, setNewlyJoinedIds] = useState<Set<string>>(new Set());
  
  // Check if we have a context-provided queue (for showcase mode)
  const isMockMode = sessionId === 'mock-session-id';
  
  // Convert context queue to TVQueueItem format for mock mode
  const mockQueueItems = useMemo(() => {
    if (!isMockMode) return undefined;
    // Handle empty/undefined context queue in mock mode
    if (!contextQueue || contextQueue.length === 0) return [];
    return contextQueue.map((item: any, index: number) => ({
      id: item.id || `mock-${index}`,
      session_id: sessionId || '',
      position: index,
      source_type: item.source_type || 'category',
      category_id: item.category_id || null,
      category_name: item.category_name || null,
      icon_slug: item.icon_slug || null,
      user_trivia_id: item.user_trivia_id || null,
      created_at: new Date().toISOString(),
    }));
  }, [contextQueue, isMockMode, sessionId]);
  
  // Use queue with room fallback (or mock data in showcase mode)
  const { queue, addCategoryToQueue, removeFromQueue } = useTVSessionQueue(
    sessionId, 
    roomId, 
    mockQueueItems
  );

  // Debug: log queue state changes
  useEffect(() => {
    console.log('[TVLobbyScreenV2] Queue state:', { 
      sessionId, 
      roomId, 
      queueLength: queue.length, 
      queue,
      hasMultiRound: queue.length > 0,
      isMockMode
    });
  }, [sessionId, roomId, queue, isMockMode]);

  // Hard switch: guests join via sessionId QR to avoid 4-digit collisions.
  const joinUrl = sessionId ? `${window.location.origin}/join/session/${sessionId}` : `${window.location.origin}/join`;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, category_id, name, icon, is_language_specific, language')
        .eq('is_active', true)
        .order('sort_order');

      if (data) {
        const visible = excludePartyCategories(filterCategoriesForLanguage(data));
        setCategories(visible);
        // Set initial category if exists
        if (categoryName) {
          const found = visible.find(c => c.name === categoryName);
          if (found) setSelectedCategory(found);
        }
      }
    };
    fetchCategories();
  }, [categoryName]);

  // Load room name and room_id from session
  useEffect(() => {
    const loadSessionData = async () => {
      if (!sessionId) return;
      const { data } = await supabase
        .from('tv_sessions')
        .select('room_name, room_id, host_user_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (data) {
        // Track the host so the TV can show them even before/without their
        // controller being connected to the presence channel
        if (data.host_user_id) {
          setHostUserId(data.host_user_id);
        }
        // Try to get room name from tv_sessions first
        if (data.room_name) {
          setRoomName(data.room_name);
          setEditedName(data.room_name);
        }
        
        // If we have a room_id, fetch from game_rooms for room icon and fallback name
        if (data.room_id) {
          setRoomId(data.room_id);
          
          // Always fetch room icon, and room name if not set in tv_sessions
          const { data: gameRoom } = await supabase
            .from('game_rooms')
            .select('room_name, room_icon')
            .eq('id', data.room_id)
            .maybeSingle();
          
          if (gameRoom) {
            // Set room icon if available
            if (gameRoom.room_icon) {
              setRoomIcon(gameRoom.room_icon);
            }
            // Fallback for room name
            if (!data.room_name && gameRoom.room_name) {
              setRoomName(gameRoom.room_name);
              setEditedName(gameRoom.room_name);
            }
          }
        }
      }
    };
    loadSessionData();
  }, [sessionId]);

  // Resolve the host's profile so the TV can always render the host card.
  // host_user_id may also be a device/player id for guest hosts - in that
  // case there is no profile and no placeholder is shown (as before).
  useEffect(() => {
    if (!hostUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .eq('user_id', hostUserId)
        .maybeSingle();
      if (!cancelled && data) {
        setHostProfile(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hostUserId]);

  // Fetch invited guests from room_participants
  useEffect(() => {
    const fetchInvitedGuests = async () => {
      if (!roomId) return;
      
      const { data } = await supabase
        .from('room_participants')
        .select('id, user_id, nickname, avatar_url, status')
        .eq('room_id', roomId)
        .eq('status', 'invited');
      
      if (data) {
        setInvitedGuests(data);
      }
    };
    
    fetchInvitedGuests();
    
    // Subscribe to changes
    if (roomId) {
      const channel = supabase
        .channel(`room_participants_${roomId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        }, () => {
          fetchInvitedGuests();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [roomId]);

  const handleSaveRoomName = async () => {
    if (!sessionId || !editedName.trim()) return;
    await supabase
      .from('tv_sessions')
      .update({ room_name: editedName.trim() })
      .eq('id', sessionId);
    setRoomName(editedName.trim());
    setIsEditingName(false);
  };

  const handleCategoryChange = async (category: Category) => {
    setSelectedCategory(category);
    setShowCategoryDropdown(false);
    if (sessionId) {
      await supabase
        .from('tv_sessions')
        .update({ 
          category_name: category.name,
          category_icon: category.icon,
        })
        .eq('id', sessionId);
    }
  };

  const handleStartGame = async () => {
    // If a queue exists, always play the first queued round
    const queued = queue[0];
    if (queued) {
      // Start without mutating queue first; the game context will consume it after successfully starting.
      if (queued.user_trivia_id) {
        await startGame(undefined, queued.user_trivia_id);
        return;
      }
      if (queued.category_id) {
        await startGame(queued.category_id);
        return;
      }
    }

    if (selectedCategory) {
      await startGame(selectedCategory.id);
    } else if (categories.length > 0) {
      const randomCat = categories[Math.floor(Math.random() * categories.length)];
      await startGame(randomCat.id);
    }
  };

  // Track newly joined players for entrance animations
  useEffect(() => {
    const currentIds = new Set(players.map(p => p.id));
    const previousIds = previousPlayerCountRef.current;
    
    // Find new players that weren't in the previous count
    if (players.length > previousIds) {
      const allCurrentIds = players.map(p => p.id);
      // Mark the newest players (those beyond previous count)
      const newIds = allCurrentIds.slice(previousIds);
      if (newIds.length > 0) {
        setNewlyJoinedIds(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => updated.add(id));
          return updated;
        });
        
        // Clear the "new" status after animation completes
        setTimeout(() => {
          setNewlyJoinedIds(prev => {
            const updated = new Set(prev);
            newIds.forEach(id => updated.delete(id));
            return updated;
          });
        }, 1000);
      }
    }
    
    previousPlayerCountRef.current = players.length;
  }, [players]);

  // Auto-start countdown when minimum players join. Every NEWCOMER resets
  // the countdown - with a big group (up to 8) joining one by one, a fixed
  // 15s from the 2nd join would start the game while friends are still
  // scanning the QR.
  const lastAutoStartCountRef = useRef<number>(0);
  useEffect(() => {
    // Only run for host
    if (!isHost) return;

    const prevCount = lastAutoStartCountRef.current;
    lastAutoStartCountRef.current = players.length;

    // Start countdown when we reach minimum players
    if (players.length >= MIN_PLAYERS_TO_START && autoStartCountdown === null) {
      setAutoStartCountdown(AUTO_START_DELAY);
      return;
    }

    // A new player joined mid-countdown - restart the clock for the group
    if (players.length > prevCount && autoStartCountdown !== null && autoStartCountdown > 0) {
      setAutoStartCountdown(AUTO_START_DELAY);
      return;
    }

    // Cancel countdown if players drop below minimum
    if (players.length < MIN_PLAYERS_TO_START && autoStartCountdown !== null) {
      setAutoStartCountdown(null);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  }, [players.length, isHost, autoStartCountdown]);

  // Countdown timer logic
  useEffect(() => {
    if (autoStartCountdown === null || !isHost) return;
    
    if (autoStartCountdown <= 0) {
      // Auto-start the game
      handleStartGame();
      return;
    }
    
    countdownIntervalRef.current = setInterval(() => {
      setAutoStartCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [autoStartCountdown, isHost]);

  // Cancel auto-start on manual interaction
  const cancelAutoStart = useCallback(() => {
    setAutoStartCountdown(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // The host must ALWAYS be visible on the TV, even when their controller
  // isn't (yet) connected to the presence channel - e.g. still in the room
  // lobby, mid-refresh, or a dropped connection. When no presence entry is
  // recognizable as the host, render a crowned card from the session's own
  // host profile.
  const hostNickname = (hostProfile?.nickname || "").trim().toLowerCase();
  const hostInPresence =
    players.some(p => p.isHost) ||
    (!!hostNickname && players.some(p => (p.nickname || "").trim().toLowerCase() === hostNickname));
  const hostPlaceholder: typeof players =
    !hostInPresence && hostProfile
      ? [{
          id: `HOST_${hostProfile.user_id}`,
          nickname: hostProfile.nickname,
          avatar_url: hostProfile.avatar_url,
          score: 0,
          hasAnswered: false,
          lastAnswerCorrect: null,
          lastAnswer: null,
          isHost: true,
          isActive: false,
        }]
      : [];

  // Combine active players with invited guests (invited shown with inactive
  // styling). NOTE: player.id is the TV presence/device id, NOT an auth
  // user_id - the two never match, so id-based dedupe alone let the same
  // person appear twice (joined + grayed "invited" ghost). Dedupe by nickname
  // against the joined players; the joinSession flow also promotes the
  // invited row to "joined" in the DB, which removes the ghost at the source.
  const displayedPlayers = [...hostPlaceholder, ...players];
  const activePlayerIds = new Set(displayedPlayers.map(p => p.id));
  const activeNicknames = new Set(displayedPlayers.map(p => (p.nickname || "").trim().toLowerCase()));
  const filteredInvitedGuests = invitedGuests.filter(
    g =>
      !activePlayerIds.has(g.user_id) &&
      !activeNicknames.has((g.nickname || "").trim().toLowerCase())
  );

  // Fill remaining slots with placeholders
  const playerSlots: Array<typeof players[0] | InvitedGuest | null> = [...displayedPlayers, ...filteredInvitedGuests];
  while (playerSlots.length < MAX_PLAYERS) {
    playerSlots.push(null);
  }

  // Display name: use room name (category is shown in queue pills)
  const displayRoomName = roomName || t("extra.tvRoom");

  // Determine what to show in the central category area
  const hasMultiRound = queue.length > 0;
  // No-emoji policy: never fall back to emoji icons.
  const displayCategory = selectedCategory || (categoryName ? { name: categoryName, icon: categoryIcon || null } : null);

  return (
    <div className="h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4 flex flex-col overflow-hidden relative">
      {/* Branding Overlay */}
      <TVBrandingOverlay showLogo={false} showCode={false} />

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        {/* Room Name - Editable */}
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-3xl font-bold bg-transparent border-b-2 border-purple-400 text-white outline-none px-2 py-1"
                style={{ fontFamily: 'var(--font-display, inherit)' }}
                autoFocus
                maxLength={30}
              />
              <button
                onClick={handleSaveRoomName}
                className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditedName(roomName);
                  setIsEditingName(false);
                }}
                className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Show room icon if available, otherwise fallback to TV icon */}
              {roomIcon ? (
                <img src={roomIcon} alt="Room" className="w-10 h-10 object-cover rounded-lg" />
              ) : (
                <img src={retroTvIcon} alt="TV" className="w-10 h-10 object-contain" />
              )}
              <h1 
                className="text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display, inherit)' }}
              >
                {displayRoomName}
              </h1>
            </div>
          )}
        </div>

        {/* Player Count + TV Icon (host card counts even before their
            controller connects, so the number matches the grid) */}
        <div className="flex items-center gap-3 text-purple-200">
          <Users className="w-5 h-5" />
          <span className="text-xl font-bold">{displayedPlayers.length}/{MAX_PLAYERS}</span>
          <img src={retroTvIcon} alt="TV" className="w-12 h-12 object-contain" />
        </div>
      </div>

      {/* Central Category/Rounds Display - Left aligned */}
      <div className="mb-2">
        {hasMultiRound ? (
          // Multi-round queue display - single line, scrollable if needed
          <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide pr-60 flex-nowrap">
            {queue.map((item, index) => {
              // Abbreviate long names: "მეცნიერება" → "მეცნ."
              const displayName = item.category_name 
                ? (item.category_name.length > 12 
                    ? item.category_name.slice(0, 8) + '.' 
                    : item.category_name)
                : t("extra.tvRoundFallback");
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-400/50 shrink-0"
                  style={{
                    background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(139,92,246,0.3) 100%)',
                  }}
                >
                  <span className="text-xs text-purple-200/80">{index + 1}.</span>
                  <span className="text-white text-sm font-medium whitespace-nowrap">
                    {displayName}
                  </span>
                </motion.div>
              );
            })}
          </div>
        ) : (
          // Single category display
          <div className="flex justify-start">
            <button
              onClick={() => isHost && setShowCategoryDropdown(!showCategoryDropdown)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-colors ${
                isHost ? 'hover:bg-white/20 cursor-pointer' : ''
              }`}
              style={{
                background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(139,92,246,0.3) 100%)',
                border: '2px solid rgba(168,85,247,0.4)',
              }}
              disabled={!isHost}
            >
              {displayCategory?.icon || categoryIcon ? (
                <span className="text-3xl">{displayCategory?.icon || categoryIcon}</span>
              ) : (
                <img
                  src={triviaBuzzer}
                  alt="Trivia"
                  className="w-8 h-8 object-contain"
                />
              )}
              <span className="text-xl text-white font-medium">
                {displayCategory?.name || categoryName || t("extra.tvRandom")}
              </span>
              {isHost && <Shuffle className="w-4 h-4 text-purple-300" />}
            </button>
          </div>
        )}

        {/* Category Dropdown */}
        <AnimatePresence>
          {showCategoryDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed inset-0 safe-screen z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCategoryDropdown(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="w-80 max-h-[70vh] overflow-y-auto rounded-2xl bg-purple-900/95 backdrop-blur-lg border border-purple-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-purple-900/95 p-3 border-b border-purple-500/20">
                  <h3 className="text-white font-bold text-center">
                    {hasMultiRound ? t("extra.tvAddToQueue") : t("extra.tvChooseCategory")}
                  </h3>
                </div>
                
                {/* Random Option (only for single category mode) */}
                {!hasMultiRound && (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors border-b border-purple-500/20"
                  >
                    <span className="text-2xl">🎲</span>
                    <span className="text-white">{t("extra.tvRandom")}</span>
                  </button>
                )}
                
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (hasMultiRound) {
                        addCategoryToQueue({ id: cat.id, name: cat.name });
                        setShowCategoryDropdown(false);
                      } else {
                        handleCategoryChange(cat);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                      selectedCategory?.id === cat.id ? 'bg-white/20' : ''
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-white">{cat.name}</span>
                  </button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content - Split Layout (Players Left, QR Right) */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Side - Players Grid */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-2">

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-4 gap-1 auto-rows-min">
            {playerSlots.map((player, index) => {
              // Check if this is an invited guest
              const isInvited = player && 'status' in player && player.status === 'invited';
              const isActivePlayer = player && !isInvited;
              const playerId = isActivePlayer ? (player as typeof players[0]).id : null;
              const isNewlyJoined = playerId && newlyJoinedIds.has(playerId);
              
              // Enhanced entrance animation for newly joined players
              const entranceAnimation = isNewlyJoined
                ? {
                    initial: { opacity: 0, scale: 0.3, x: -50, rotate: -10 },
                    animate: { 
                      opacity: 1, 
                      scale: 1.05, 
                      x: 0, 
                      rotate: 0,
                    },
                    transition: { 
                      duration: 0.5, 
                      type: 'spring' as const, 
                      stiffness: 400, 
                      damping: 20 
                    }
                  }
                : {
                    initial: { opacity: 0, scale: 0.8 },
                    animate: { opacity: 1, scale: 1 },
                    transition: { delay: index * 0.05 }
                  };
              
              return (
                <motion.div
                  key={isActivePlayer ? (player as typeof players[0]).id : isInvited ? (player as InvitedGuest).id : `slot-${index}`}
                  {...entranceAnimation}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 ${
                    isActivePlayer 
                      ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30' 
                      : isInvited
                        ? 'bg-white/5 ring-1 ring-inset ring-purple-400/40'
                        : 'bg-white/5 ring-1 ring-inset ring-purple-500/40'
                  } ${isInvited ? 'opacity-50 grayscale' : ''} ${isNewlyJoined ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-transparent' : ''}`}
                  style={isActivePlayer ? { boxShadow: 'inset 0 0 0 2px rgba(192, 132, 252, 0.5)' } : {}}
                >
                  {isActivePlayer ? (
                    <>
                      {/* Host Crown */}
                      {(player as typeof players[0]).isHost && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg z-10"
                        >
                          <Crown className="w-3 h-3 text-yellow-900" />
                        </motion.div>
                      )}

                      {/* Avatar - 40% larger */}
                      <div className="w-14 h-14 mb-2">
                        <SmartAvatar
                          avatarUrl={(player as typeof players[0]).avatar_url}
                          fallback={(player as typeof players[0]).nickname?.slice(0, 2)}
                          size="lg"
                        />
                      </div>

                      {/* Name */}
                      <p className="text-white font-bold text-center truncate w-full text-sm mt-1">
                        {(player as typeof players[0]).nickname}
                      </p>
                    </>
                  ) : isInvited ? (
                    <>
                      {/* Invited Guest - Grayed out - 40% larger */}
                      <div className="w-14 h-14 mb-2">
                        <SmartAvatar
                          avatarUrl={(player as InvitedGuest).avatar_url}
                          fallback={(player as InvitedGuest).nickname?.slice(0, 2)}
                          size="lg"
                        />
                      </div>
                      <p className="text-purple-300/70 font-medium text-center truncate w-full text-sm mt-1">
                        {(player as InvitedGuest).nickname}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <UserPlus className="w-3 h-3 text-purple-400/50" />
                        <span className="text-[10px] text-purple-400/50">{t("extra.tvInvited")}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-2">
                        <Users className="w-6 h-6 text-purple-400/50" />
                      </div>
                      <p className="text-purple-400/50 text-xs mt-1">{t("extra.tvWaitingEllipsis")}</p>
                    </>
                  )}
                </motion.div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Right Side - QR Code */}
        <div className="w-56 flex-shrink-0 flex flex-col items-center justify-between pt-5 mt-[15px]">
          {/* Top: QR Code + URL */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 rounded-2xl bg-white shadow-2xl"
            >
              <QRCodeSVG
                value={joinUrl}
                size={140}
                level="M"
                includeMargin={false}
              />
            </motion.div>

            <div className="mt-3 text-center">
              <p className="text-purple-300 text-sm mb-1">{t("extra.tvOrOpen")}</p>
              <p className="text-sm font-bold text-white">mytrivia.io/join</p>
              {/* Code to enter */}
              <div className="mt-2 px-3 py-1 bg-white/10 rounded-lg inline-block">
                <span className="text-purple-300 text-xs">{t("extra.tvCodePrefix")}</span>
                <span className="text-white font-bold text-lg tracking-wider">{code}</span>
              </div>
            </div>
          </div>
          
          {/* Bottom: Logo */}
          <div className="pb-4">
            <MyTriviaLiveLogo size="sm" textColor="light" />
          </div>
        </div>
      </div>

      {/* Bottom - Start Game (Host Only) */}
      {isHost && players.length >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex flex-col items-center gap-2 flex-shrink-0"
        >
          {/* Auto-start countdown indicator */}
          {autoStartCountdown !== null && autoStartCountdown > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
            >
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="3"
                  />
                  <motion.circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={88}
                    strokeDashoffset={88 - (88 * autoStartCountdown) / AUTO_START_DELAY}
                    transition={{ duration: 0.3 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                  {autoStartCountdown}
                </span>
              </div>
              <span className="text-white text-sm">{t("extra.tvAutoStart")}</span>
              <button
                onClick={cancelAutoStart}
                className="ml-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </motion.div>
          )}
          
          <motion.button
            onClick={() => {
              cancelAutoStart();
              handleStartGame();
            }}
            className="px-8 py-3 rounded-xl flex items-center gap-2 text-lg font-bold text-white transition-all"
            style={{
              background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
              boxShadow: '0 6px 24px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-5 h-5" />
            {queue.length > 0 ? t("extra.tvStartRoundsBtn", { count: queue.length }) : t("extra.tvStartGame")}
          </motion.button>
        </motion.div>
      )}

      {/* Build fingerprint - diagnosing "which code is this device running" */}
      <span className="absolute bottom-1 left-2 text-purple-300/40 text-[10px] font-mono select-none">
        {currentBuildLabel()}
      </span>

      {/* Hint for non-hosts */}
      {!isHost && players.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-center text-purple-300/60 text-sm flex-shrink-0"
        >
          {t("extra.tvWaitingHostStart")}
        </motion.p>
      )}
    </div>
  );
};
