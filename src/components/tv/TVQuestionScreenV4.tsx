import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { supabase } from '@/integrations/supabase/client';
import { SafeAvatar } from '@/components/shared/SafeAvatar';
import { Check, X, Clock } from 'lucide-react';
import { QuizAnswerButton } from '@/components/ui/quiz-answer-button';
import { TimerBadge } from '@/components/game/TimerBadge';
import { QuizQuestionCard } from '@/components/ui/quiz-question-card';
import { TVRoundQueueIndicator } from './TVRoundQueueIndicator';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { TVDebugOverlay } from './TVDebugOverlay';
import retroTvIcon from '@/assets/retro-tv-colored.png';
import { TVBrandingOverlay } from './TVBrandingOverlay';

import { useLanguage } from '@/contexts/LanguageContext';

const getAnswerLabels = (t: (key: string) => string) => [
  t("extra.answerLabelA"), t("extra.answerLabelB"), t("extra.answerLabelC"), t("extra.answerLabelD")
];

export const TVQuestionScreenV4: React.FC = () => {
  const { t } = useLanguage();
  const {
    questions,
    currentQuestionIndex,
    timeRemaining,
    players,
    categoryName,
    roomName,
    phase,
    roundNumber,
    totalRounds,
    currentRoundSuggesterId,
    currentRoundSuggesterNickname,
    currentRoundSuggesterAvatarUrl,
    sessionId,
  } = useTVGame();

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const timerMax = 15;
  const timerPercent = (timeRemaining / timerMax) * 100;

  // Check if this is a media-based question
  const hasImage = !!currentQuestion?.image_url;
  const hasVideo = !!currentQuestion?.video_url;
  const hasAudio = !!currentQuestion?.audio_url;
  const hasMedia = hasImage || hasVideo || hasAudio;

  // ── DB-backed roster ──────────────────────────────────────────────────────
  // Presence only knows about currently-connected devices, so a host or
  // player whose phone is locked/refreshing simply vanished from the TV.
  // The tv_players table is the durable roster: merge it in, and derive
  // answer status for non-connected players from player_answers.
  type RosterRow ={ player_id: string; nickname: string; avatar_url: string | null; is_host: boolean; current_round_score: number | null; is_active: boolean };
  const [dbRoster, setDbRoster] = useState<RosterRow[]>([]);
  const [dbAnswers, setDbAnswers] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!sessionId || sessionId === 'mock-session-id') return;
    const systemIds = ['TV_DISPLAY', 'TV_MIRROR'];
    const fetchRoster = async () => {
      const { data } = await supabase
        .from('tv_players')
        .select('player_id, nickname, avatar_url, is_host, current_round_score, is_active')
        .eq('tv_session_id', sessionId);
      if (data) {
        setDbRoster((data as RosterRow[]).filter(
          p => !systemIds.includes(p.player_id) && !systemIds.includes(p.nickname || '')
        ));
      }
    };
    fetchRoster();
    const channel = supabase
      .channel(`tv-roster-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tv_players', filter: `tv_session_id=eq.${sessionId}` }, fetchRoster)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Answers of the current question (user_id -> is_correct) for players whose
  // live presence status isn't available
  useEffect(() => {
    if (!sessionId || sessionId === 'mock-session-id') return;
    setDbAnswers(new Map());
    let cancelled = false;
    const fetchAnswers = async () => {
      const { data } = await supabase
        .from('player_answers')
        .select('user_id, is_correct')
        .eq('tv_session_id', sessionId)
        .eq('question_index', currentQuestionIndex);
      if (!cancelled && data) {
        setDbAnswers(new Map(data.filter(a => a.user_id).map(a => [a.user_id as string, !!a.is_correct])));
      }
    };
    fetchAnswers();
    const channel = supabase
      .channel(`tv-q-answers-${sessionId}-${currentQuestionIndex}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_answers', filter: `tv_session_id=eq.${sessionId}` }, (payload) => {
        const row = payload.new as { user_id?: string; question_index?: number; is_correct?: boolean };
        if (row.question_index === currentQuestionIndex && row.user_id) {
          setDbAnswers(prev => new Map(prev).set(row.user_id!, !!row.is_correct));
        }
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentQuestionIndex]);

  // Merge: live presence entries win (freshest status); DB roster fills in
  // everyone else (host included) so nobody disappears from the TV
  const presenceIds = new Set(players.map(p => p.id));
  const rosterOnly = dbRoster
    .filter(p => !presenceIds.has(p.player_id) && (p.is_active || p.is_host))
    .map(p => ({
      id: p.player_id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      score: p.current_round_score || 0,
      hasAnswered: dbAnswers.has(p.player_id),
      lastAnswerCorrect: dbAnswers.has(p.player_id) ? (dbAnswers.get(p.player_id) as boolean) : null,
      lastAnswer: null,
      isHost: p.is_host,
      isActive: p.is_active,
    }));
  const allPlayers = [...players, ...rosterOnly];

  // Filter out the suggester from active players - they skip this round
  const activePlayers = allPlayers.filter(p => p.id !== currentRoundSuggesterId);

  // Group players by their answer status for current question
  const correctPlayers = activePlayers.filter(p => p.hasAnswered && p.lastAnswerCorrect === true);
  const wrongPlayers = activePlayers.filter(p => p.hasAnswered && p.lastAnswerCorrect === false);
  const waitingPlayers = activePlayers.filter(p => !p.hasAnswered);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading question...</div>
      </div>
    );
  }


  const isReveal = phase === 'reveal';
  const correctAnswer = currentQuestion.correct_answer;

  return (
    <div className="h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4 flex flex-col overflow-hidden relative">
      {/* Code only overlay (no logo during gameplay) */}
      <TVBrandingOverlay showLogo={false} showCode compact />

      {/* Debug Overlay - only shows in development */}
      <TVDebugOverlay />
      {/* Question Progress Indicator - Left side */}
      {totalQuestions > 1 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5"
        >
          <motion.div
            className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-white/30 border-2 border-white shadow-lg"
            animate={{
              scale: [1, 1.06, 1],
              boxShadow: [
                '0 0 10px rgba(255,255,255,0.25)',
                '0 0 20px rgba(255,255,255,0.45)',
                '0 0 10px rgba(255,255,255,0.25)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-white font-bold text-xs">
              {currentQuestionIndex + 1}/{totalQuestions}
            </span>
          </motion.div>

          <span className="text-white/60 text-[10px] font-medium mt-1 writing-vertical">
            {t("extra.tvQuestionVertical")}
          </span>
        </motion.div>
      )}

      {/* Mini Queue Indicator - Right side */}
      <TVRoundQueueIndicator 
        currentRound={roundNumber} 
        totalRounds={totalRounds} 
        className="absolute right-3 top-1/2 -translate-y-1/2 z-30"
      />
      {/* Player Status Bar - Three Zone Layout */}
      <motion.div 
        className="flex justify-between items-center w-full mb-3 flex-shrink-0 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Wrong Players (Red) - LEFT EDGE */}
        <div className="flex gap-2 min-w-[60px] justify-start">
          <AnimatePresence>
            {wrongPlayers.map((player) => (
              <motion.div 
                key={player.id}
                className="relative flex flex-col items-center"
                initial={{ scale: 0, x: 50 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <SafeAvatar 
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname}
                  className="w-10 h-10 ring-3 ring-red-400 border-2 border-white"
                  fallbackClassName="bg-red-500 text-white font-bold text-sm"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                  <X className="w-3 h-3 text-white" />
                </div>
                {isReveal && (
                  <span className="text-[10px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full mt-1">{Math.round(player.score)}</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Waiting Players (Yellow) - CENTER - only show players who haven't answered */}
        <div className="flex gap-2 justify-center flex-1 min-w-0">
          <AnimatePresence mode="sync">
            {waitingPlayers.map((player) => (
              <motion.div 
                key={player.id}
                className="relative flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                {/* Subtle outer glow */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: '0 0 12px 3px rgba(250, 204, 21, 0.4)',
                  }}
                />
                <SafeAvatar 
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname}
                  className="w-10 h-10 ring-3 ring-yellow-400 border-2 border-white relative z-10"
                  fallbackClassName="bg-yellow-500 text-white font-bold text-sm"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white z-20">
                  <Clock className="w-3 h-3 text-white" />
                </div>
                {isReveal && (
                  <span className="text-[10px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full mt-1 relative z-10">{Math.round(player.score)}</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Correct Players (Green) - RIGHT EDGE */}
        <div className="flex gap-2 min-w-[60px] justify-end">
          <AnimatePresence>
            {correctPlayers.map((player) => (
              <motion.div 
                key={player.id}
                className="relative flex flex-col items-center"
                initial={{ scale: 0, x: -50 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <SafeAvatar 
                  avatarUrl={player.avatar_url}
                  fallback={player.nickname}
                  className="w-10 h-10 ring-3 ring-green-400 border-2 border-white"
                  fallbackClassName="bg-green-500 text-white font-bold text-sm"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <Check className="w-3 h-3 text-white" />
                </div>
                {isReveal && (
                  <span className="text-[10px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full mt-1">{Math.round(player.score)}</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Top info row (category + timer) */}
      <div className="flex items-center justify-between px-2 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <img src={retroTvIcon} alt="TV" className="w-6 h-6 object-contain" />
          {categoryName && (
            <span>{categoryName}</span>
          )}
          <span className="text-white/60 font-medium">-</span>
          <span className="text-white/80 font-medium">{t("extra.tvRoundNofM", { n: roundNumber, m: totalRounds })}</span>
        </div>

        <TimerBadge seconds={timeRemaining} maxSeconds={timerMax} compact />
      </div>

      {/* Question + answers (game UI) */}
      {hasImage ? (
        // SPECIAL LAYOUT FOR IMAGE QUESTIONS: 50/50 split
        <motion.div 
          className="max-w-6xl mx-auto w-full px-6 flex-1 flex min-h-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Left 50%: Question text + Image */}
          <div className="w-1/2 pr-4 flex flex-col justify-center">
            {/* Image */}
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-lg">
              <img 
                src={currentQuestion.image_url!} 
                alt="Question" 
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
          
          {/* Right 50%: Answers stacked vertically */}
          <div className="w-1/2 pl-4 flex flex-col justify-center gap-3">
            {currentQuestion.options.slice(0, 4).map((option, index) => (
              <QuizAnswerButton
                key={index}
                state={
                  isReveal
                    ? option === correctAnswer
                      ? 'correct'
                      : 'disabled'
                    : 'default'
                }
                label={getAnswerLabels(t)[index]}
                text={option}
                disabled
                className="w-full"
              />
            ))}
          </div>
        </motion.div>
      ) : (
        // STANDARD LAYOUT: Question card + 2x2 grid
        <motion.div 
          className="max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col min-h-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative flex justify-center mb-3 flex-shrink-0 pt-16 [@media(max-height:700px)]:pt-12">
            {/* Suggester Avatar - top left corner */}
            {currentRoundSuggesterId && (
              <motion.div 
                className="absolute left-0 top-12 z-30 flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <SafeAvatar 
                  avatarUrl={currentRoundSuggesterAvatarUrl}
                  fallback={currentRoundSuggesterNickname || '?'}
                  className="w-10 h-10 ring-2 ring-purple-300 border-2 border-white shadow-lg"
                  fallbackClassName="bg-purple-500 text-white font-bold text-xs"
                />
                <span className="text-white/80 text-xs font-medium bg-black/30 px-2 py-1 rounded-lg">
                  {currentRoundSuggesterNickname}
                </span>
              </motion.div>
            )}
            {/* Category/Question Icon - overlapping top of card (hide if media) */}
            {!hasMedia && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20 w-24 h-24">
                <DynamicIcon 
                  slug={currentQuestion?.icon_slug || undefined}
                  questionId={currentQuestion?.id}
                  size={96}
                  className="drop-shadow-lg"
                  hideIfEmpty={false}
                />
              </div>
            )}
            <QuizQuestionCard
              questionText={currentQuestion.question_text}
              imageUrl={currentQuestion.image_url}
              videoUrl={currentQuestion.video_url}
              audioUrl={currentQuestion.audio_url}
              progressPercent={Math.max(0, Math.min(100, timerPercent))}
              className="w-full pt-8"
              reserveTopSpace={!hasMedia}
              hideQuestionText={!!currentQuestion.image_url}
            />
          </div>

          {/* Answer Options 2x2 Grid - clean single container buttons */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {currentQuestion.options.slice(0, 4).map((option, index) => (
              <QuizAnswerButton
                key={index}
                state={
                  isReveal
                    ? option === correctAnswer
                      ? 'correct'
                      : 'disabled'
                    : 'default'
                }
                label={getAnswerLabels(t)[index]}
                text={option}
                disabled
                className="w-full h-full"
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
