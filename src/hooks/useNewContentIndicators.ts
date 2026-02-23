import { useState, useEffect, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { usePendingChallenges } from '@/hooks/usePendingChallenges';
import { FriendsContext } from '@/contexts/FriendsContext';

const STORAGE_KEY = 'lastTabVisits';

interface TabVisits {
  explore: number;
  shop: number;
  rank: number;
  team: number;
}

// Track when categories/items were last updated (mock timestamps for now)
const CONTENT_UPDATES = {
  explore: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago (no new content)
  shop: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago (no new content)
  rank: Date.now() - 1000 * 60 * 60 * 24 * 7, // Updated when new week starts
};

function getStoredVisits(): TabVisits {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading tab visits:', e);
  }
  return {
    explore: 0,
    shop: 0,
    rank: 0,
    team: 0,
  };
}

function storeVisit(tab: keyof TabVisits) {
  try {
    const visits = getStoredVisits();
    visits[tab] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch (e) {
    console.error('Error storing tab visit:', e);
  }
}

export function useNewContentIndicators() {
  const location = useLocation();
  const { pendingChallenges } = usePendingChallenges();
  const friendsCtx = useContext(FriendsContext);
  const pendingRequests = friendsCtx?.pendingRequests ?? [];
  
  const [indicators, setIndicators] = useState({
    explore: false,
    shop: false,
    rank: false,
    team: false,
  });

  // Update indicators based on content updates and last visits
  const updateIndicators = useCallback(() => {
    const visits = getStoredVisits();
    
    // Team tab has special handling - shows indicator for pending challenges/friend requests
    const hasTeamNotifications = pendingChallenges.length > 0 || pendingRequests.length > 0;
    
    // Check if there's new content since last visit
    const exploreHasNew = visits.explore < CONTENT_UPDATES.explore;
    const shopHasNew = visits.shop < CONTENT_UPDATES.shop;
    const rankHasNew = visits.rank < CONTENT_UPDATES.rank;
    
    setIndicators({
      explore: exploreHasNew,
      shop: shopHasNew,
      rank: rankHasNew,
      team: hasTeamNotifications,
    });
  }, [pendingChallenges.length, pendingRequests.length]);

  // Track tab visits based on route changes
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/discover' || path.startsWith('/category')) {
      storeVisit('explore');
    } else if (path === '/power-ups') {
      storeVisit('shop');
    } else if (path === '/leaderboards') {
      storeVisit('rank');
    } else if (path === '/team') {
      storeVisit('team');
    }
    
    // Update indicators after storing visit
    updateIndicators();
  }, [location.pathname, updateIndicators]);

  // Initial update
  useEffect(() => {
    updateIndicators();
  }, [updateIndicators]);

  // Function to manually mark a tab as visited (for when navigating programmatically)
  const markTabVisited = useCallback((tab: keyof TabVisits) => {
    storeVisit(tab);
    setIndicators(prev => ({ ...prev, [tab]: false }));
  }, []);

  return {
    indicators,
    markTabVisited,
  };
}
