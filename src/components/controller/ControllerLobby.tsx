import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Users, Crown, Play, ChevronDown, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon_slug: string | null;
}

export const ControllerLobby: React.FC = () => {
  const { players, isHost, startGame } = useTVGame();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    if (isHost) {
      fetchCategories();
    }
  }, [isHost]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    const { data, error } = await supabase
      .from('categories')
      .select('id, category_id, name, icon_slug')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
    setLoadingCategories(false);
  };

  const handleStartGame = () => {
    startGame(selectedCategory?.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          {isHost ? "You're the Host!" : "Waiting for Host"}
        </h1>
        <p className="text-purple-300">Watch the TV for the game</p>
      </motion.div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-purple-300" />
          <span className="text-purple-200">Players ({players.length})</span>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {players.map(player => (
            <div key={player.id} className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={player.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-600 text-white">
                  {player.nickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white flex-1">{player.nickname}</span>
              {player.isHost && <Crown className="w-5 h-5 text-yellow-400" />}
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="flex-1 flex flex-col">
          {/* Category Selection */}
          <div className="mb-4">
            <p className="text-purple-200 text-sm mb-2">Select Category</p>
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="w-full bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between border border-white/20"
            >
              {selectedCategory ? (
                <div className="flex items-center gap-3">
                  <DynamicIcon 
                    slug={selectedCategory.icon_slug || undefined}
                    categoryId={selectedCategory.category_id} 
                    size={24} 
                  />
                  <span className="text-white font-medium">{selectedCategory.name}</span>
                </div>
              ) : (
                <span className="text-purple-300">All Categories (Random)</span>
              )}
              <ChevronDown className={`w-5 h-5 text-purple-300 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showCategories && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 bg-white/10 backdrop-blur rounded-xl border border-white/20 max-h-[250px] overflow-y-auto">
                    {loadingCategories ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-300" />
                      </div>
                    ) : (
                      <>
                        {/* Random option */}
                        <button
                          onClick={() => {
                            setSelectedCategory(null);
                            setShowCategories(false);
                          }}
                          className={`w-full p-3 flex items-center gap-3 border-b border-white/10 ${
                            !selectedCategory ? 'bg-purple-600/30' : 'hover:bg-white/10'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                            <span className="text-white text-xs">?</span>
                          </div>
                          <span className="text-white">Random Mix</span>
                        </button>

                        {categories.map(category => (
                          <button
                            key={category.id}
                            onClick={() => {
                              setSelectedCategory(category);
                              setShowCategories(false);
                            }}
                            className={`w-full p-3 flex items-center gap-3 border-b border-white/10 last:border-b-0 ${
                              selectedCategory?.id === category.id ? 'bg-purple-600/30' : 'hover:bg-white/10'
                            }`}
                          >
                            <DynamicIcon 
                              slug={category.icon_slug || undefined}
                              categoryId={category.category_id} 
                              size={24} 
                            />
                            <span className="text-white">{category.name}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Start Button */}
          <div className="mt-auto">
            {players.length >= 1 && (
              <ChunkyButton 
                variant="success" 
                size="lg" 
                onClick={handleStartGame} 
                icon={<Play className="w-5 h-5" />} 
                className="w-full"
              >
                Start Game
              </ChunkyButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
