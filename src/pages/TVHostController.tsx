import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Tv, Play, SkipForward, Users, Loader2, QrCode, Copy, Check, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar } from '@/components/shared/Avatar';

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
}

interface Category {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  color: string;
}

type Phase = 'category-select' | 'waiting' | 'countdown' | 'playing' | 'completed';

const TVHostController: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [guestJoinCode, setGuestJoinCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [phase, setPhase] = useState<Phase>('category-select');
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const joinUrl = `${window.location.origin}/controller/${guestJoinCode}`;

  // Load session and categories
  useEffect(() => {
    const loadData = async () => {
      if (!sessionId) {
        setError('No session ID');
        setLoading(false);
        return;
      }

      // Load session
      const { data: sessionData, error: fetchError } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError || !sessionData) {
        setError('Session not found');
        setLoading(false);
        return;
      }

      // Verify this user is the host
      if (sessionData.host_user_id !== user?.id) {
        setError('You are not the host of this session');
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setGuestJoinCode(sessionData.pairing_code || '');
      
      // Check if questions already loaded (category was already selected)
      if (sessionData.questions && Array.isArray(sessionData.questions) && sessionData.questions.length > 0) {
        setPhase(sessionData.status === 'waiting' ? 'waiting' : sessionData.status as Phase);
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, category_id, name, icon, color')
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      setLoading(false);

      // Subscribe to session updates
      const channel = supabase
        .channel(`host-session-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tv_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            const newData = payload.new as any;
            setSession(newData);
            
            // Update phase based on status
            if (newData.status === 'countdown') setPhase('countdown');
            else if (newData.status === 'playing') setPhase('playing');
            else if (newData.status === 'completed') setPhase('completed');
          }
        )
        .subscribe();

      channelRef.current = channel;

      // Set up presence channel for tracking players
      const presenceChannel = supabase
        .channel(`tv-presence-${sessionId}`)
        .on('presence', { event: 'sync' }, () => {
          const presenceState = presenceChannel.presenceState();
          const connectedPlayers: Player[] = [];
          
          Object.values(presenceState).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (presence.user_id !== user?.id) { // Don't show host in player list
                connectedPlayers.push({
                  id: presence.user_id,
                  nickname: presence.nickname || 'Player',
                  avatar_url: presence.avatar_url,
                  score: 0,
                });
              }
            });
          });
          
          setPlayers(connectedPlayers);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('Player joined:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('Player left:', leftPresences);
        })
        .subscribe();

      presenceChannelRef.current = presenceChannel;
    };

    loadData();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [sessionId, user?.id]);

  const handleSelectCategory = async (category: Category) => {
    setSelectedCategory(category);
    setIsLoadingQuestions(true);

    try {
      // Fetch questions for this category
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers, difficulty')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .eq('in_production', true)
        .limit(10);

      if (questionsError) throw questionsError;

      const formattedQuestions = (questionsData || []).map(q => {
        const incorrectAnswers = Array.isArray(q.incorrect_answers) 
          ? q.incorrect_answers as string[] 
          : [];
        const allOptions = [q.correct_answer, ...incorrectAnswers].filter(Boolean);
        const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
        
        return {
          id: q.id,
          question_text: q.question_text,
          options: shuffledOptions,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty || undefined,
        };
      });

      if (formattedQuestions.length === 0) {
        toast.error('ამ კატეგორიაში კითხვები ვერ მოიძებნა');
        setIsLoadingQuestions(false);
        setSelectedCategory(null);
        return;
      }

      // Update session with questions
      await supabase
        .from('tv_sessions')
        .update({
          questions: formattedQuestions as unknown as any,
          status: 'waiting',
        })
        .eq('id', sessionId);

      setPhase('waiting');
      toast.success(`${category.name} არჩეულია!`);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('კითხვების ჩატვირთვა ვერ მოხერხდა');
      setSelectedCategory(null);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleStartGame = async () => {
    if (!sessionId) return;

    await supabase
      .from('tv_sessions')
      .update({ status: 'countdown', current_question_index: 0 })
      .eq('id', sessionId);

    setPhase('countdown');

    // After countdown, start the first question
    setTimeout(async () => {
      await supabase
        .from('tv_sessions')
        .update({ 
          status: 'playing',
          question_start_time: new Date().toISOString(),
        })
        .eq('id', sessionId);
      setPhase('playing');
    }, 3000);
  };

  const handleNextQuestion = async () => {
    if (!sessionId || !session) return;

    const questions = session.questions || [];
    const currentIndex = session.current_question_index || 0;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      await supabase
        .from('tv_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
      setPhase('completed');
    } else {
      await supabase
        .from('tv_sessions')
        .update({ 
          current_question_index: nextIndex,
          status: 'playing',
          question_start_time: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
  };

  const handleEndGame = async () => {
    if (!sessionId) return;
    
    await supabase
      .from('tv_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    toast.success('თამაში დასრულდა!');
    navigate('/team');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(guestJoinCode);
    setCopied(true);
    toast.success('კოდი დაკოპირდა!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">იტვირთება...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive text-xl mb-4">{error}</p>
          <ChunkyButton onClick={() => navigate('/team')}>
            უკან
          </ChunkyButton>
        </div>
      </div>
    );
  }

  const currentQuestionIndex = session?.current_question_index || 0;
  const totalQuestions = session?.questions?.length || 0;

  // Category selection phase
  if (phase === 'category-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button onClick={() => navigate('/team')} className="p-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <Tv className="w-6 h-6 text-primary" />
          <span className="font-bold text-foreground">აირჩიე კატეგორია</span>
        </motion.div>

        {/* QR Code section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">მოთამაშეებმა დაასკანერონ</h2>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={joinUrl} size={100} level="H" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">კოდი:</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono font-bold text-primary tracking-wider">
                  {guestJoinCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-primary" />}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{players.length} მოთამაშე</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Connected players */}
        <AnimatePresence>
          {players.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex gap-2 overflow-x-auto pb-2">
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center gap-1 min-w-[60px]"
                  >
                    <Avatar imageUrl={player.avatar_url} emoji={player.nickname?.[0] || '👤'} size="sm" />
                    <span className="text-xs text-muted-foreground truncate max-w-[60px]">{player.nickname}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories grid */}
        <div className="space-y-2">
          {categories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSelectCategory(category)}
              disabled={isLoadingQuestions}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                selectedCategory?.id === category.id
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="flex-1 text-left font-medium text-foreground">{category.name}</span>
              {isLoadingQuestions && selectedCategory?.id === category.id ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // Waiting for players / game control phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-2">
          <Tv className="w-6 h-6 text-primary" />
          <span className="font-bold text-foreground">მართვის პანელი</span>
        </div>
        <div className="bg-card border border-border rounded-full px-3 py-1">
          <span className="text-sm text-muted-foreground capitalize">
            {phase === 'waiting' ? 'მოლოდინი' : phase === 'playing' ? 'მიმდინარე' : phase === 'countdown' ? 'დაწყება' : 'დასრულებული'}
          </span>
        </div>
      </motion.div>

      {/* QR Code for guests */}
      {phase === 'waiting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-border rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">მოთამაშეებს გადაუგზავნე</h2>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={joinUrl} size={120} level="H" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground mb-1">კოდი:</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-primary tracking-wider">
                  {guestJoinCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-primary" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 break-all">{joinUrl}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Players section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-4 mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-muted-foreground" />
          <span className="text-foreground font-medium">{players.length} მოთამაშე</span>
        </div>
        
        {players.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring' }}
                className="flex items-center gap-2 bg-background rounded-full px-3 py-2 border border-border"
              >
                <Avatar imageUrl={player.avatar_url} emoji={player.nickname?.[0] || '👤'} size="sm" />
                <span className="text-sm font-medium text-foreground">{player.nickname}</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </motion.div>
            ))}
          </div>
        )}
        
        {players.length === 0 && phase === 'waiting' && (
          <p className="text-muted-foreground text-sm">ველოდებით მოთამაშეებს...</p>
        )}
      </motion.div>

      {/* Game progress */}
      {phase === 'playing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-4 mb-6"
        >
          <p className="text-muted-foreground text-sm mb-2">პროგრესი</p>
          <p className="text-2xl font-bold text-foreground">
            კითხვა {currentQuestionIndex + 1} / {totalQuestions}
          </p>
        </motion.div>
      )}

      {/* Control buttons */}
      <div className="space-y-3">
        {phase === 'waiting' && (
          <ChunkyButton
            variant="primary"
            className="w-full"
            onClick={handleStartGame}
            disabled={players.length < 1}
          >
            <Play className="w-5 h-5 mr-2" />
            თამაშის დაწყება {players.length < 1 && '(საჭიროა მინ. 1 მოთამაშე)'}
          </ChunkyButton>
        )}

        {phase === 'playing' && (
          <ChunkyButton
            variant="primary"
            className="w-full"
            onClick={handleNextQuestion}
          >
            <SkipForward className="w-5 h-5 mr-2" />
            {currentQuestionIndex + 1 >= totalQuestions ? 'შედეგების ჩვენება' : 'შემდეგი კითხვა'}
          </ChunkyButton>
        )}

        {phase === 'countdown' && (
          <div className="text-center py-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-6xl font-bold text-primary mb-4"
            >
              🎮
            </motion.div>
            <p className="text-xl text-foreground">თამაში იწყება...</p>
          </div>
        )}

        {phase === 'completed' && (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">თამაში დასრულდა! 🎉</h2>
            <ChunkyButton onClick={() => navigate('/team')}>
              უკან დაბრუნება
            </ChunkyButton>
          </div>
        )}

        {phase !== 'completed' && phase !== 'countdown' && (
          <ChunkyButton
            variant="secondary"
            className="w-full"
            onClick={handleEndGame}
          >
            თამაშის დასრულება
          </ChunkyButton>
        )}
      </div>
    </div>
  );
};

export default TVHostController;
