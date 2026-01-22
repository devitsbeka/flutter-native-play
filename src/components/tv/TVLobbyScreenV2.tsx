import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useTVGame } from '@/contexts/TVGameContext';
import { Pencil, Crown, Users, Play, Shuffle, Check, X, UserPlus } from 'lucide-react';
import { SmartAvatar } from '@/components/shared/SmartAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useTVSessionQueue } from '@/hooks/useTVSessionQueue';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import retroTvIcon from '@/assets/retro-tv-colored.png';

const MAX_PLAYERS = 8;

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
  const [roomName, setRoomName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [invitedGuests, setInvitedGuests] = useState<InvitedGuest[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  // Check if we have a context-provided queue (for showcase mode)
  const isMockMode = contextQueue && contextQueue.length > 0 && sessionId === 'mock-session-id';
  
  // Convert context queue to TVQueueItem format for mock mode
  const mockQueueItems = useMemo(() => {
    if (!isMockMode) return undefined;
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
        .select('id, category_id, name, icon')
        .eq('is_active', true)
        .order('sort_order');
      
      if (data) {
        setCategories(data);
        // Set initial category if exists
        if (categoryName) {
          const found = data.find(c => c.name === categoryName);
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
        .select('room_name, room_id')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (data) {
        // Try to get room name from tv_sessions first
        if (data.room_name) {
          setRoomName(data.room_name);
          setEditedName(data.room_name);
        }
        
        // If we have a room_id, fetch from game_rooms as fallback for name
        if (data.room_id) {
          setRoomId(data.room_id);
          
          // Fetch room name from game_rooms if not set in tv_sessions
          if (!data.room_name) {
            const { data: gameRoom } = await supabase
              .from('game_rooms')
              .select('room_name')
              .eq('id', data.room_id)
              .maybeSingle();
            
            if (gameRoom?.room_name) {
              setRoomName(gameRoom.room_name);
              setEditedName(gameRoom.room_name);
            }
          }
        }
      }
    };
    loadSessionData();
  }, [sessionId]);

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

  // Combine active players with invited guests (invited shown with inactive styling)
  const activePlayerIds = new Set(players.map(p => p.id));
  const filteredInvitedGuests = invitedGuests.filter(g => !activePlayerIds.has(g.user_id));
  
  // Fill remaining slots with placeholders
  const playerSlots: Array<typeof players[0] | InvitedGuest | null> = [...players, ...filteredInvitedGuests];
  while (playerSlots.length < MAX_PLAYERS) {
    playerSlots.push(null);
  }

  // Display name: use room name or default
  const displayRoomName = roomName || categoryName || 'მოთამაშეების მოლოდინში...';

  // Determine what to show in the central category area
  const hasMultiRound = queue.length > 0;
  const displayCategory = selectedCategory || (categoryName ? { name: categoryName, icon: categoryIcon || '🎲' } : null);

  return (
    <div className="h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
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
              <img src={retroTvIcon} alt="TV" className="w-10 h-10 object-contain" />
              <h1 
                className="text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display, inherit)' }}
              >
                {displayRoomName}
              </h1>
              {isHost && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 rounded-lg bg-white/10 text-purple-300 hover:bg-white/20 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Player Count */}
        <div className="flex items-center gap-2 text-purple-200">
          <Users className="w-5 h-5" />
          <span className="text-xl font-bold">{players.length}/{MAX_PLAYERS}</span>
        </div>
      </div>

      {/* Central Category/Rounds Display */}
      <div className="mb-4">
        {hasMultiRound ? (
          // Multi-round queue display
          <div className="flex flex-wrap justify-center gap-3 py-3">
            {queue.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-purple-400/50"
                style={{
                  background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(139,92,246,0.3) 100%)',
                }}
              >
                <span className="text-sm text-purple-200/80">{index + 1}.</span>
                <span className="text-white font-medium">{item.category_name || 'რაუნდი'}</span>
                {/* Queue is read-only in TV mode - managed in game room */}
              </motion.div>
            ))}
          </div>
        ) : (
          // Single category display
          <div className="flex justify-center">
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
              <span className="text-3xl">{displayCategory?.icon || categoryIcon || '🎲'}</span>
              <span className="text-xl text-white font-medium">
                {displayCategory?.name || categoryName || 'შემთხვევითი'}
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
                    {hasMultiRound ? 'დაამატე რიგში' : 'აირჩიე კატეგორია'}
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
                    <span className="text-white">შემთხვევითი</span>
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

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Side - QR Code */}
        <div className="w-56 flex-shrink-0 flex flex-col items-center justify-center">
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
            <p className="text-purple-300 text-sm mb-1">ან გახსენით</p>
            <p className="text-sm font-bold text-white">mytrivia.io/join</p>
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <span className="text-xl font-mono font-bold text-white tracking-widest">{code}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Players Grid */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-sm font-bold text-purple-200 mb-2 flex items-center gap-2 flex-shrink-0">
            <Users className="w-4 h-4" />
            მოთამაშეები
          </h2>

          <div className="grid grid-cols-4 gap-2 auto-rows-min">
            {playerSlots.map((player, index) => {
              // Check if this is an invited guest
              const isInvited = player && 'status' in player && player.status === 'invited';
              const isActivePlayer = player && !isInvited;
              
              return (
                <motion.div
                  key={isActivePlayer ? (player as typeof players[0]).id : isInvited ? (player as InvitedGuest).id : `slot-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 ${
                    isActivePlayer 
                      ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-400/50' 
                      : isInvited
                        ? 'bg-white/5 border-2 border-dashed border-purple-400/30'
                        : 'bg-white/5 border-2 border-dashed border-purple-500/30'
                  } ${isInvited ? 'opacity-50 grayscale' : ''}`}
                >
                  {isActivePlayer ? (
                    <>
                      {/* Host Crown */}
                      {(player as typeof players[0]).isHost && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg"
                        >
                          <Crown className="w-3 h-3 text-yellow-900" />
                        </motion.div>
                      )}

                      {/* Avatar */}
                      <div className="w-10 h-10 mb-1">
                        <SmartAvatar
                          avatarUrl={(player as typeof players[0]).avatar_url}
                          fallback={(player as typeof players[0]).nickname?.slice(0, 2)}
                          size="md"
                        />
                      </div>

                      {/* Name */}
                      <p className="text-white font-bold text-center truncate w-full text-xs">
                        {(player as typeof players[0]).nickname}
                      </p>
                    </>
                  ) : isInvited ? (
                    <>
                      {/* Invited Guest - Grayed out */}
                      <div className="w-10 h-10 mb-1">
                        <SmartAvatar
                          avatarUrl={(player as InvitedGuest).avatar_url}
                          fallback={(player as InvitedGuest).nickname?.slice(0, 2)}
                          size="md"
                        />
                      </div>
                      <p className="text-purple-300/70 font-medium text-center truncate w-full text-xs">
                        {(player as InvitedGuest).nickname}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <UserPlus className="w-3 h-3 text-purple-400/50" />
                        <span className="text-[10px] text-purple-400/50">მოწვეული</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-1">
                        <Users className="w-5 h-5 text-purple-400/50" />
                      </div>
                      <p className="text-purple-400/50 text-[10px]">მოლოდინი...</p>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom - Start Game (Host Only) */}
      {isHost && players.length >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex justify-center flex-shrink-0"
        >
          <motion.button
            onClick={handleStartGame}
            className="px-8 py-3 rounded-xl flex items-center gap-2 text-lg font-bold text-white transition-all"
            style={{
              background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
              boxShadow: '0 6px 24px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-5 h-5" />
            {queue.length > 0 ? `დაწყება (${queue.length} რაუნდი)` : 'თამაშის დაწყება'}
          </motion.button>
        </motion.div>
      )}

      {/* Hint for non-hosts */}
      {!isHost && players.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center text-purple-300/60 text-sm flex-shrink-0"
        >
          მოლოდინი, ჰოსტმა დაიწყოს თამაში...
        </motion.p>
      )}
    </div>
  );
};
