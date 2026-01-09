/**
 * TV Game Debug Logging Utility
 * Provides structured logging for debugging TV game flow
 */

const TV_DEBUG = import.meta.env.DEV;

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  event: string;
  level: LogLevel;
  data?: unknown;
}

// Keep last 100 logs in memory for debugging
const logHistory: LogEntry[] = [];
const MAX_LOGS = 100;

const formatTime = () => {
  const now = new Date();
  return now.toISOString().split('T')[1].slice(0, -1);
};

const addToHistory = (entry: LogEntry) => {
  logHistory.push(entry);
  if (logHistory.length > MAX_LOGS) {
    logHistory.shift();
  }
};

export const tvLog = (event: string, data?: unknown, level: LogLevel = 'info') => {
  if (!TV_DEBUG) return;

  const entry: LogEntry = {
    timestamp: formatTime(),
    event,
    level,
    data,
  };
  
  addToHistory(entry);

  const prefix = `[TV ${entry.timestamp}]`;
  const styles = {
    info: 'color: #8B5CF6',
    warn: 'color: #F59E0B',
    error: 'color: #EF4444',
    debug: 'color: #6B7280',
  };

  if (data !== undefined) {
    console.log(`%c${prefix} ${event}`, styles[level], data);
  } else {
    console.log(`%c${prefix} ${event}`, styles[level]);
  }
};

export const tvLogPhase = (from: string, to: string, trigger?: string) => {
  tvLog(`Phase: ${from} → ${to}`, { trigger }, 'info');
};

export const tvLogPlayer = (action: 'join' | 'leave' | 'answer' | 'update', playerId: string, data?: unknown) => {
  tvLog(`Player ${action}: ${playerId.slice(0, 8)}...`, data, 'debug');
};

export const tvLogError = (context: string, error: unknown) => {
  tvLog(`Error in ${context}`, error, 'error');
};

export const tvLogPresence = (event: 'sync' | 'join' | 'leave', playerCount: number, players?: string[]) => {
  tvLog(`Presence ${event}: ${playerCount} players`, players, 'debug');
};

export const tvLogTimer = (action: 'start' | 'tick' | 'expired' | 'reset', remaining?: number) => {
  tvLog(`Timer ${action}`, remaining !== undefined ? { remaining } : undefined, 'debug');
};

// Export log history for debugging panel if needed
export const getTVLogHistory = () => [...logHistory];

// Clear logs
export const clearTVLogs = () => {
  logHistory.length = 0;
};
