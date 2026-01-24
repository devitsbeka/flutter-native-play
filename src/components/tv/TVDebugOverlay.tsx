import React, { useEffect, useState } from 'react';
import { useTVGame } from '@/contexts/TVGameContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface DebugData {
  activePlayerCount: number;
  currentAnswerCount: number;
  sessionId: string | null;
  questionIndex: number;
  phase: string;
  isHost: boolean;
  lastUpdated: string;
}

export const TVDebugOverlay: React.FC = () => {
  const { sessionId, currentQuestionIndex, phase, isHost, players } = useTVGame();
  const [debugData, setDebugData] = useState<DebugData>({
    activePlayerCount: 0,
    currentAnswerCount: 0,
    sessionId: null,
    questionIndex: 0,
    phase: '',
    isHost: false,
    lastUpdated: '',
  });
  const [isExpanded, setIsExpanded] = useState(true);

  // Poll DB every second for real-time debug info
  useEffect(() => {
    if (!sessionId) return;

    const fetchDebugData = async () => {
      // Fetch active_player_count from tv_sessions
      const { data: session } = await supabase
        .from('tv_sessions')
        .select('active_player_count')
        .eq('id', sessionId)
        .single();

      // Fetch current answer count for this question
      const { count } = await supabase
        .from('player_answers')
        .select('*', { count: 'exact', head: true })
        .eq('tv_session_id', sessionId)
        .eq('question_index', currentQuestionIndex);

      setDebugData({
        activePlayerCount: session?.active_player_count || 0,
        currentAnswerCount: count || 0,
        sessionId,
        questionIndex: currentQuestionIndex,
        phase,
        isHost,
        lastUpdated: new Date().toLocaleTimeString(),
      });
    };

    // Initial fetch
    fetchDebugData();

    // Poll every 500ms for real-time updates
    const interval = setInterval(fetchDebugData, 500);

    return () => clearInterval(interval);
  }, [sessionId, currentQuestionIndex, phase, isHost]);

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  const allAnswered = debugData.currentAnswerCount >= debugData.activePlayerCount && debugData.activePlayerCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-4 right-4 z-50"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs font-mono mb-2 hover:bg-black/90 transition-colors"
      >
        {isExpanded ? '▼ Debug' : '▶ Debug'}
      </button>
      
      {isExpanded && (
        <div className="bg-black/90 backdrop-blur-sm text-white p-4 rounded-xl shadow-2xl border border-white/20 font-mono text-xs space-y-2 min-w-[280px]">
          <div className="text-purple-400 font-bold text-sm mb-3 border-b border-white/20 pb-2">
            🔍 TV Debug (Clean Logic v2)
          </div>
          
          {/* Main comparison */}
          <div className={`p-3 rounded-lg ${allAnswered ? 'bg-green-500/30 border border-green-400' : 'bg-yellow-500/20 border border-yellow-400/50'}`}>
            <div className="text-center mb-2 font-bold">
              {allAnswered ? '✅ ALL ANSWERED' : '⏳ WAITING FOR ANSWERS'}
            </div>
            <div className="flex justify-center items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">{debugData.currentAnswerCount}</div>
                <div className="text-[10px] text-gray-400">Answered</div>
              </div>
              <div className="text-xl text-gray-500">/</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">{debugData.activePlayerCount}</div>
                <div className="text-[10px] text-gray-400">Expected (DB)</div>
              </div>
            </div>
          </div>

          {/* Triggers Info */}
          <div className="bg-blue-500/20 border border-blue-400/50 p-2 rounded-lg text-[10px]">
            <div className="text-blue-300 font-bold mb-1">Advance Triggers:</div>
            <div className="text-blue-200">1. Timer expires (15s)</div>
            <div className="text-blue-200">2. All players answered</div>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-400">Phase:</span>
              <span className={`font-bold ${phase === 'question' ? 'text-green-400' : phase === 'reveal' ? 'text-yellow-400' : 'text-white'}`}>
                {debugData.phase}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Question:</span>
              <span className="text-white">{debugData.questionIndex + 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Is Host:</span>
              <span className={debugData.isHost ? 'text-green-400' : 'text-gray-500'}>
                {debugData.isHost ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Players in Context:</span>
              <span className="text-white">{players.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Session ID:</span>
              <span className="text-gray-500 text-[9px]">{debugData.sessionId?.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="text-[9px] text-gray-500 pt-2 border-t border-white/10">
            Last updated: {debugData.lastUpdated}
          </div>
        </div>
      )}
    </motion.div>
  );
};
