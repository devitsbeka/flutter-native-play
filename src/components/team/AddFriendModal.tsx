import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Loader2, Clock } from "lucide-react";
import { GameModal } from "@/components/ui/game-modal";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMissions } from "@/hooks/useMissions";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
}

export function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [pendingOutgoingIds, setPendingOutgoingIds] = useState<Set<string>>(new Set());
  const { searchUsers, sendFriendRequest, friends } = useFriends();
  const { user } = useAuth();
  const { trackMissionEvent } = useMissions();

  // Memoize friend IDs to prevent infinite re-renders
  const friendIds = useMemo(
    () => new Set(friends.map(f => f.friendId)),
    [friends]
  );
  
  // Fetch pending outgoing friend requests on modal open
  useEffect(() => {
    const fetchPendingOutgoing = async () => {
      if (!user?.id || !isOpen) return;
      
      const { data } = await supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id)
        .eq("status", "pending");
      
      if (data) {
        setPendingOutgoingIds(new Set(data.map(f => f.friend_id)));
      }
    };
    
    fetchPendingOutgoing();
  }, [user?.id, isOpen]);

  // Debounced search - don't include friendIds in deps to avoid re-render loop
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, [searchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSendRequest = async (userId: string) => {
    const success = await sendFriendRequest(userId);
    if (success) {
      setSentRequests(prev => new Set([...prev, userId]));
      setPendingOutgoingIds(prev => new Set([...prev, userId]));
      void trackMissionEvent("friend_invited", 1);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSentRequests(new Set());
    onClose();
  };

  return (
    <GameModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("extra.addFriendTitle")}
      icon={<UserPlus className="w-8 h-8" />}
      variant="success"
    >
      <div className="space-y-4 pt-2 px-1">
        {/* Search Input */}
        <div className="relative px-1 py-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("extra.searchUserPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-foreground placeholder:text-muted-foreground focus:ring-offset-0"
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Search Results */}
        <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-2">
          <AnimatePresence mode="popLayout">
            {searchQuery.length < 2 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground text-sm"
              >
                {t("extra.minCharsHint")}
              </motion.div>
            ) : (
              (() => {
                const filteredResults = searchResults.filter(r => !friendIds.has(r.user_id));
                return filteredResults.length === 0 && !searching ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    {t("extra.userNotFoundSearch")}
                  </motion.div>
                ) : (
                  filteredResults.map((result) => (
                    <SearchResultCard
                      key={result.user_id}
                      result={result}
                      onSendRequest={async () => {
                        await handleSendRequest(result.user_id);
                      }}
                      isSent={sentRequests.has(result.user_id)}
                      isPending={pendingOutgoingIds.has(result.user_id)}
                    />
                  ))
                );
              })()
            )}
          </AnimatePresence>
        </div>
      </div>
    </GameModal>
  );
}

interface SearchResultCardProps {
  result: SearchResult;
  onSendRequest: () => Promise<void>;
  isSent: boolean;
  isPending: boolean;
}

function SearchResultCard({ result, onSendRequest, isSent, isPending }: SearchResultCardProps) {
  const { t } = useLanguage();
  const [isSending, setIsSending] = useState(false);
  const touchedRef = useRef(false);
  
  const handleButtonAction = async () => {
    console.log("[AddFriendModal] handleButtonAction called", { 
      userId: result.user_id, isPending, isSent, isSending 
    });
    
    if (isPending || isSent || isSending) {
      if (isPending || isSent) {
        toast.info(t("extra.requestAlreadySentWait"));
      }
      return;
    }
    
    setIsSending(true);
    try {
      await onSendRequest();
    } finally {
      setIsSending(false);
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (touchedRef.current) {
      touchedRef.current = false;
      return; // Skip click after touch
    }
    handleButtonAction();
  };
  
  const handleTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    touchedRef.current = true;
    handleButtonAction();
  };
  
  // Show pending state after sending OR if already pending
  const showPendingState = isPending || isSent;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
    >
      <Avatar className="w-12 h-12 border-2 border-white/20">
        <ResolvedAvatarImage src={result.avatar_url || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
          {result.nickname.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{result.nickname}</p>
        {result.country_code && (
          <p className="text-sm text-muted-foreground">
            {getCountryFlag(result.country_code)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleClick}
        onTouchEnd={handleTouch}
        disabled={showPendingState || isSending}
        className={`flex items-center gap-1.5 px-5 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-colors active:scale-95 ${
          showPendingState
            ? "bg-muted/50 text-muted-foreground cursor-default"
            : isSending
            ? "bg-muted/30 text-muted-foreground cursor-wait"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90"
        }`}
        style={{ touchAction: 'manipulation' }}
      >
        {isSending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("extra.sending")}
          </>
        ) : showPendingState ? (
          <>
            <Clock className="w-4 h-4" />
            {t("extra.pending")}
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            {t("extra.addBtn")}
          </>
        )}
      </button>
    </motion.div>
  );
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
