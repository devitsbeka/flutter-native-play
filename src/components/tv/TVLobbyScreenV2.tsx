import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useTVGame } from '@/contexts/TVGameContext';
import { Pencil, Crown, Users, Play, Shuffle, Check, X } from 'lucide-react';
import { SmartAvatar } from '@/components/shared/SmartAvatar';
import { supabase } from '@/integrations/supabase/client';

const MAX_PLAYERS = 8;

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon: string;
}

export const TVLobbyScreenV2: React.FC = () => {
  const { code, sessionId, players, categoryName, categoryIcon, isHost, startGame } = useTVGame();
  const [roomName, setRoomName] = useState('TV კვიზი');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(roomName);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const joinUrl = `${window.location.origin}/join?code=${code}`;

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

  // Load room name from session
  useEffect(() => {
    const loadRoomName = async () => {
      if (!sessionId) return;
      const { data } = await supabase
        .from('tv_sessions')
        .select('room_name')
        .eq('id', sessionId)
        .single();
      if (data?.room_name) {
        setRoomName(data.room_name);
        setEditedName(data.room_name);
      }
    };
    loadRoomName();
  }, [sessionId]);

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

  const handleStartGame = () => {
    if (selectedCategory) {
      startGame(selectedCategory.id);
    } else if (categories.length > 0) {
      const randomCat = categories[Math.floor(Math.random() * categories.length)];
      startGame(randomCat.id);
    }
  };

  // Fill remaining slots with placeholders
  const playerSlots = [...players];
  while (playerSlots.length < MAX_PLAYERS) {
    playerSlots.push(null);
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        {/* Room Name - Editable */}
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-4xl font-bold bg-transparent border-b-2 border-purple-400 text-white outline-none px-2 py-1"
                style={{ fontFamily: 'var(--font-display, inherit)' }}
                autoFocus
                maxLength={30}
              />
              <button
                onClick={handleSaveRoomName}
                className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              >
                <Check className="w-6 h-6" />
              </button>
              <button
                onClick={() => {
                  setEditedName(roomName);
                  setIsEditingName(false);
                }}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 
                className="text-4xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display, inherit)' }}
              >
                {roomName}
              </h1>
              {isHost && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-2 rounded-lg bg-white/10 text-purple-300 hover:bg-white/20 transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Category Badge with Dropdown */}
          <div className="relative mt-3">
            <button
              onClick={() => isHost && setShowCategoryDropdown(!showCategoryDropdown)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                isHost ? 'hover:bg-white/20 cursor-pointer' : ''
              }`}
              style={{
                background: 'linear-gradient(180deg, rgba(168,85,247,0.3) 0%, rgba(139,92,246,0.3) 100%)',
                border: '1px solid rgba(168,85,247,0.4)',
              }}
              disabled={!isHost}
            >
              <span className="text-2xl">{selectedCategory?.icon || categoryIcon || '🎲'}</span>
              <span className="text-lg text-purple-200">
                {selectedCategory?.name || categoryName || 'შემთხვევითი'}
              </span>
              {isHost && <Shuffle className="w-4 h-4 text-purple-300" />}
            </button>

            {/* Category Dropdown */}
            <AnimatePresence>
              {showCategoryDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl bg-purple-900/95 backdrop-blur-lg border border-purple-500/30 shadow-2xl z-50"
                >
                  {/* Random Option */}
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
                  
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                        selectedCategory?.id === cat.id ? 'bg-white/20' : ''
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-white">{cat.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Player Count */}
        <div className="flex items-center gap-2 text-purple-200">
          <Users className="w-6 h-6" />
          <span className="text-2xl font-bold">{players.length}/{MAX_PLAYERS}</span>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex gap-8">
        {/* Left Side - QR Code */}
        <div className="w-1/3 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-3xl bg-white shadow-2xl"
          >
            <QRCodeSVG
              value={joinUrl}
              size={220}
              level="M"
              includeMargin={false}
            />
          </motion.div>

          <div className="mt-6 text-center">
            <p className="text-purple-300 mb-2">ან გახსენით</p>
            <p className="text-xl font-bold text-white">mytrivia.io/join</p>
            <div className="mt-3 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <span className="text-3xl font-mono font-bold text-white tracking-widest">{code}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Players Grid */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-purple-200 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            მოთამაშეები
          </h2>

          <div className="grid grid-cols-4 gap-4">
            {playerSlots.map((player, index) => (
              <motion.div
                key={player?.id || `slot-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center p-4 ${
                  player 
                    ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-400/50' 
                    : 'bg-white/5 border-2 border-dashed border-purple-500/30'
                }`}
              >
                {player ? (
                  <>
                    {/* Host Crown */}
                    {player.isHost && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg"
                      >
                        <Crown className="w-5 h-5 text-yellow-900" />
                      </motion.div>
                    )}

                    {/* Avatar */}
                    <div className="w-16 h-16 mb-2">
                      <SmartAvatar
                        avatarUrl={player.avatar_url}
                        fallback={player.nickname?.slice(0, 2)}
                        size="lg"
                      />
                    </div>

                    {/* Name */}
                    <p className="text-white font-bold text-center truncate w-full">
                      {player.nickname}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
                      <Users className="w-8 h-8 text-purple-400/50" />
                    </div>
                    <p className="text-purple-400/50 text-sm">მოლოდინი...</p>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom - Start Game (Host Only) */}
      {isHost && players.length >= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex justify-center"
        >
          <motion.button
            onClick={handleStartGame}
            className="px-12 py-4 rounded-2xl flex items-center gap-3 text-xl font-bold text-white transition-all"
            style={{
              background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
              boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-6 h-6" />
            თამაშის დაწყება
          </motion.button>
        </motion.div>
      )}

      {/* Hint for non-hosts */}
      {!isHost && players.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center text-purple-300/60"
        >
          მოლოდინი, ჰოსტმა დაიწყოს თამაში...
        </motion.p>
      )}
    </div>
  );
};
