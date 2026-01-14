import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { QRCodeSVG } from 'qrcode.react';
import { Play, Settings, Trophy, Users, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import glitchIcon from "@/assets/glitch.png";

interface Category {
  id: string;
  name: string;
  icon_slug: string | null;
}

export const TVIdleScreen: React.FC = () => {
  const { 
    players, 
    code, 
    isHost, 
    startGame, 
    categoryName, 
    roundNumber,
    roomName,
    totalRoundsPlayed,
    accumulatedScores,
  } = useTVGame();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, icon_slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Sort players by accumulated scores if available, otherwise by current score
  const sortedPlayers = [...players].sort((a, b) => {
    const aTotal = accumulatedScores[a.id] || a.score;
    const bTotal = accumulatedScores[b.id] || b.score;
    return bTotal - aTotal;
  });

  const handleStartNewRound = async () => {
    setIsStarting(true);
    try {
      await startGame(selectedCategoryId || undefined);
    } finally {
      setIsStarting(false);
    }
  };

  const joinUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/join?code=${code}` 
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">{roomName || 'TV კვიზი'}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-purple-300">
              {totalRoundsPlayed > 0 ? `რაუნდი ${totalRoundsPlayed} დასრულდა` : 'მოელოდეთ თამაშის დაწყებას'}
            </span>
            {categoryName && (
              <span className="px-3 py-1 bg-purple-500/30 rounded-full text-purple-200 text-sm">
                {categoryName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-purple-300">
          <Users className="w-5 h-5" />
          <span>{players.length} მოთამაშე</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Leaderboard - Takes 2 columns */}
        <div className="col-span-2 bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">ლიდერბორდი</h2>
            {totalRoundsPlayed > 0 && (
              <span className="text-purple-300 text-sm">({totalRoundsPlayed} რაუნდის შემდეგ)</span>
            )}
          </div>

          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const totalScore = accumulatedScores[player.id] || player.score;
              
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5"
                >
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-yellow-500 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-white/10 text-white'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden">
                    {player.avatar_url ? (
                      <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {player.nickname.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name & Host Badge */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-lg">{player.nickname}</span>
                      {player.isHost && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                          HOST
                        </span>
                      )}
                    </div>
                    {totalRoundsPlayed > 0 && player.score > 0 && (
                      <span className="text-green-400 text-sm">+{player.score} ამ რაუნდში</span>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">{totalScore}</span>
                    <span className="text-purple-300 text-sm ml-1">ქულა</span>
                  </div>
                </motion.div>
              );
            })}

            {sortedPlayers.length === 0 && (
              <div className="text-center py-12 text-purple-300">
                <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
                  <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
                </div>
                <p>ჯერ არავინ შემოსულა</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Controls & QR */}
        <div className="space-y-6">
          {/* Host Controls */}
          {isHost && (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 text-purple-300" />
                <h3 className="text-lg font-bold text-white">ჰოსტის კონტროლი</h3>
              </div>

              <div className="space-y-3">
                {/* Category Picker */}
                <button
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                  className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left text-white flex items-center justify-between"
                >
                  <span>კატეგორია: {selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : categoryName || 'შემთხვევითი'}</span>
                  <RefreshCw className="w-4 h-4 text-purple-300" />
                </button>

                {showCategoryPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2 max-h-48 overflow-y-auto"
                  >
                    <button
                      onClick={() => {
                        setSelectedCategoryId(null);
                        setShowCategoryPicker(false);
                      }}
                      className="w-full p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors text-purple-200 text-left text-sm"
                    >
                      🎲 შემთხვევითი
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setShowCategoryPicker(false);
                        }}
                        className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white text-left text-sm"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Start New Round */}
                <motion.button
                  onClick={handleStartNewRound}
                  disabled={isStarting}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isStarting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                  {totalRoundsPlayed > 0 ? 'ახალი რაუნდი' : 'დაწყება'}
                </motion.button>
              </div>
            </div>
          )}

          {/* QR Code for Late Joiners */}
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 text-center">
            <h3 className="text-lg font-bold text-white mb-4">შემოუერთდი</h3>
            <div className="bg-white rounded-2xl p-4 inline-block">
              <QRCodeSVG
                value={joinUrl}
                size={120}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-purple-300 mt-4 font-mono text-xl tracking-widest">{code}</p>
            <p className="text-purple-400 text-sm mt-2">mytrivia.io/join</p>
          </div>

          {/* Waiting indicator for non-hosts */}
          {!isHost && (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 text-center">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-purple-300"
              >
                მოელოდეთ ჰოსტის მითითებას...
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
