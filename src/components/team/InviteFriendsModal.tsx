import { siteUrl, FACEBOOK_APP_ID } from "@/config/site";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { 
  UserPlus, 
  Import, 
  Share2,
  Mail,
  Phone,
  Search,
  Loader2,
  Check,
  ChevronLeft,
  Clock,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { copyToClipboard, shareOrCopy } from "@/utils/shareLink";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { PingPongVideo } from "@/components/shared/PingPongVideo";
import { MAP_VIDEOS } from "@/config/videoConfig";
import { useMissions } from "@/hooks/useMissions";
import { PlayerProfileModal } from "@/components/profile/PlayerProfileModal";
import { GreenPlayButton } from "@/components/shared/GreenPlayButton";

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteLink?: string;
  roomId?: string;
  roomCode?: string;
  // Pre-room selection mode props
  onFriendSelect?: (friendId: string) => void;
  selectedFriends?: Set<string>;
  onInviteSuccess?: () => void;
}

interface SearchResult {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
}

const MessengerIcon = () => (
  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-md" style={{ boxShadow: "0 3px 0 hsl(280 70% 35%)" }}>
    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.78c.04.57.61.94 1.13.71l1.98-.87c.17-.08.36-.1.53-.06.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm1.02 13.15l-2.56-2.73-4.99 2.73 5.49-5.83 2.62 2.73 4.93-2.73-5.49 5.83z"/>
    </svg>
  </div>
);

const WhatsAppIcon = () => (
  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md" style={{ boxShadow: "0 3px 0 hsl(142 76% 28%)" }}>
    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </div>
);

const XTwitterIcon = () => (
  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center shadow-md" style={{ boxShadow: "0 3px 0 hsl(0 0% 15%)" }}>
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  </div>
);

const EmailIcon = () => (
  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-md" style={{ boxShadow: "0 3px 0 hsl(0 70% 35%)" }}>
    <Mail className="w-6 h-6 text-white" />
  </div>
);

const ContactsIcon = () => (
  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(25 90% 35%)" }}>
    <Import className="w-6 h-6 text-white" />
  </div>
);

const FacebookIcon = () => (
  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 0 hsl(220 80% 30%)" }}>
    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  </div>
);

const shareOptions = [
  { id: "messenger", label: "Messenger", icon: MessengerIcon, action: "messenger" },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon, action: "whatsapp" },
  { id: "x", label: "X", icon: XTwitterIcon, action: "twitter" },
  { id: "email", label: "Email", icon: EmailIcon, action: "email" },
];

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function InviteFriendsModal({ isOpen, onClose, inviteLink, roomId, roomCode, onFriendSelect, selectedFriends, onInviteSuccess }: InviteFriendsModalProps) {
  const { t } = useLanguage();
  const [isSharing, setIsSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const [pendingOutgoingIds, setPendingOutgoingIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const touchedRef = useRef(false);
  
  const { searchUsers, sendFriendRequest, friends, pendingRequests, acceptFriendRequest, declineFriendRequest } = useFriends();
  // The friendship id being answered, so exactly that row shows a spinner
  // and can't be double-tapped while the answer is in flight.
  const [answeringRequest, setAnsweringRequest] = useState<{ id: string; action: "accept" | "decline" } | null>(null);

  const answerRequest = async (id: string, action: "accept" | "decline") => {
    if (answeringRequest) return;
    setAnsweringRequest({ id, action });
    try {
      if (action === "accept") await acceptFriendRequest(id);
      else await declineFriendRequest(id);
    } finally {
      setAnsweringRequest(null);
    }
  };
  const { user } = useAuth();
  const { trackMissionEvent } = useMissions();

  // Memoize friendIds to prevent infinite re-renders
  const friendIds = useMemo(
    () => new Set(friends.map(f => f.friendId)),
    [friends]
  );
  
  // Get accepted friends for the grid
  const acceptedFriends = useMemo(
    () => friends.filter(f => f.status === 'accepted'),
    [friends]
  );

  /**
   * Who leads the grid: the friends already picked when this screen opened.
   *
   * Taken on open rather than recomputed on every tap. Sorting live would
   * move a tile to the top the instant it is touched — out from under the
   * finger, and taking the row you were reading with it. CreateRoomPage pins
   * its reel the same way and for the same reason.
   */
  const [leadIds, setLeadIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (isOpen) setLeadIds(new Set(selectedFriends ?? []));
    // selectedFriends is deliberately not a dependency — see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const orderedFriends = useMemo(() => {
    if (leadIds.size === 0) return acceptedFriends;
    // sort() is stable, so everyone else keeps the order they had
    return [...acceptedFriends].sort(
      (a, b) => (leadIds.has(b.friendId) ? 1 : 0) - (leadIds.has(a.friendId) ? 1 : 0),
    );
  }, [acceptedFriends, leadIds]);

  // Determine mode: pre-room selection vs room invite vs friend request
  const isPreRoomMode = Boolean(onFriendSelect);
  const isRoomInviteMode = Boolean(roomId);
  // Opened from the home strip's "+": no room to invite into and nothing to
  // pick for. It used to show only a search box and share links, so the one
  // thing the screen could have told you — who you already have — was the
  // thing it left out.
  const isBrowseMode = !isPreRoomMode && !isRoomInviteMode;
  const selectedCount = selectedFriends?.size ?? 0;
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  
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
  
  /**
   * The link the share row actually sends.
   *
   * It used to be the room link from a lobby and a bare /team from the other
   * four screens this opens on, so an invite sent from home carried nothing
   * at all: whoever opened it landed on the games tab as a stranger.
   *
   * Now it is always the sender's own invite link, which names them and is
   * the same on every screen. Where it leads is decided when it is OPENED,
   * not when it is sent: in a room it offers that room, out of one it offers
   * the friendship, and a link pasted into a chat last week still works
   * today. The room is looked up from what the SENDER is in, so a player
   * inviting someone to a lobby they do not host still brings them there.
   */
  const [myInviteLink, setMyInviteLink] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_or_create_invite_code");
      if (!cancelled && !error && data) setMyInviteLink(siteUrl(`/i/${data}`));
    })();
    return () => { cancelled = true; };
  }, [isOpen, user]);

  /**
   * The link to send, resolved at the moment of sending.
   *
   * This used to be `myInviteLink || inviteLink || siteUrl("/team")`,
   * evaluated at render. The code is fetched by the effect above, so for the
   * first moments the modal is open `myInviteLink` is null and the fallback
   * wins — and from a room lobby the fallback is a /room/<code> link.
   *
   * That is a link that dies. A room is archived when it is finished with,
   * and room_preview and room_players both skip archived rooms, so whoever
   * taps it afterwards gets "this invitation link no longer works". It is
   * exactly what happens when someone opens the invite screen and goes
   * straight for a share button, which is what the screen is for.
   *
   * A personal /i/<code> link never dies: it names its owner, resolves
   * whatever room they are in when it is OPENED, and when they are in none
   * the friendship is still the outcome. So wait for it rather than sending
   * something worse. The effect above has usually already fetched it, in
   * which case this returns without awaiting anything.
   */
  const resolveAppLink = useCallback(async (): Promise<string> => {
    if (myInviteLink) return myInviteLink;
    if (user) {
      const { data, error } = await supabase.rpc("get_or_create_invite_code");
      if (!error && data) {
        const link = siteUrl(`/i/${data}`);
        setMyInviteLink(link);
        return link;
      }
    }
    // Signed out, or the code could not be minted. /team is a worse invite
    // than a personal link and a better one than a room that is gone.
    return inviteLink || siteUrl("/team");
  }, [myInviteLink, user, inviteLink]);

  const shareMessage = t("extra.shareMessage");
  const encodedMessage = encodeURIComponent(shareMessage);

  // Ref to hold stable searchUsers function
  const searchUsersRef = useRef(searchUsers);
  searchUsersRef.current = searchUsers;

  // Stable search function
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsersRef.current(query);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, []);

  // Effect only depends on searchQuery, not performSearch
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSendRequest = async (userId: string) => {
    console.log("[InviteFriendsModal] handleSendRequest called with userId:", userId);
    setSendingRequestTo(userId);
    try {
      console.log("[InviteFriendsModal] Calling sendFriendRequest...");
      const success = await sendFriendRequest(userId);
      console.log("[InviteFriendsModal] sendFriendRequest result:", success);
      if (success) {
        setSentRequests(prev => new Set([...prev, userId]));
        setPendingOutgoingIds(prev => new Set([...prev, userId]));
        void trackMissionEvent("friend_invited", 1);
      }
    } catch (error) {
      console.error("[InviteFriendsModal] sendFriendRequest error:", error);
    } finally {
      setSendingRequestTo(null);
    }
  };

  // Room invitation handler
  const handleInviteToRoom = async (userId: string) => {
    // Callers pick the right action for the mode now, so reaching here without
    // a room is a bug rather than a state. Say so in the log instead of
    // returning quietly, which is how the dead Invite button stayed invisible.
    if (!roomId) {
      console.warn("[InviteFriendsModal] invite to room with no roomId", { userId });
      return;
    }

    setInvitingUser(userId);
    try {
      // Import supabase
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Check if already invited/in room
      const { data: existing } = await supabase
        .from("room_participants")
        .select("id")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .maybeSingle();
      
      if (existing) {
        toast.info(t("extra.userAlreadyInRoom"));
        return;
      }
      
      // Get the user's profile for nickname
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname, avatar_url, country_code")
        .eq("user_id", userId)
        .maybeSingle();
      
      // Add as invited participant
      await supabase.from("room_participants").insert({
        room_id: roomId,
        user_id: userId,
        status: "invited",
        nickname: profile?.nickname || "Player",
        avatar_url: profile?.avatar_url,
        country_code: profile?.country_code || "GE",
        is_host: false,
      });
      
      // Notification is automatically created by database trigger (notify_room_invite)
      // when participant is added to room_participants table
      
      setSentRequests(prev => new Set([...prev, userId]));
      // "მოიწვიე მეგობარი თამაშში". This is that, and until now nothing here
      // told the missions so.
      void trackMissionEvent("invited_to_room", 1);
      toast.success(t("extra.inviteSent"));

      // Auto-close modal after brief delay for visual feedback
      setTimeout(() => {
        handleClose();
        onInviteSuccess?.();
      }, 600);
    } catch (error) {
      console.error("Invite error:", error);
      toast.error(t("extra.inviteFailed"));
    } finally {
      setInvitingUser(null);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSentRequests(new Set());
    setSendingRequestTo(null);
    onClose();
  };
  
  const handleShare = async (platform: string) => {
    setIsSharing(true);

    // On the web, a window.open that happens after an await has lost the
    // click that authorised it and the browser blocks it. So claim the tab
    // synchronously in the one case where the link is not ready yet, and
    // point it at the destination once it is. Native does not need this —
    // there it is the share sheet.
    const needsAwait = !myInviteLink;
    const pendingTab =
      needsAwait && !Capacitor.isNativePlatform() ? window.open("", "_blank") : null;

    const appLink = await resolveAppLink();
    const encodedLink = encodeURIComponent(appLink);

    /**
     * Messenger goes through a share sheet wherever there is one.
     *
     * There is no URL that opens the Messenger composer with a link
     * attached. `fb-messenger://share` is an app scheme, and the webview
     * inside the native app refuses schemes it does not recognise —
     * SILENTLY, which is why the button did nothing when pressed. The web
     * Send Dialog needs a Facebook app id, and none is configured here.
     * Neither leg could deliver, on either platform.
     *
     * A share sheet can. shareOrCopy cascades exactly right for this: the
     * Capacitor plugin's UIActivityViewController inside the app, the
     * browser's own navigator.share on a phone — both of which list
     * Messenger and land the link in a conversation — and the clipboard only
     * on a desktop browser, where no sheet exists and pasting really is all
     * that is left.
     *
     * It is the same link the copy button gives: whatever resolveAppLink
     * returned, handed to Messenger instead of to the clipboard.
     *
     * Only this one. WhatsApp and X are ordinary https links (wa.me, the X
     * composer) that open a real composer everywhere, and mailto: is a
     * scheme every platform handles; sending those through a sheet would
     * spend a tap to arrive at the same place.
     */
    if (platform === "messenger" && !FACEBOOK_APP_ID) {
      pendingTab?.close();
      const outcome = await shareOrCopy({
        title: t("extra.shareTitle"),
        text: shareMessage,
        url: appLink,
      });
      if (outcome === "copied") toast.success(t("extra.linkCopiedToast"));
      if (outcome === "failed") toast.error(t("team.shareFailed"));
      setTimeout(() => setIsSharing(false), 500);
      return;
    }

    let url = "";

    switch (platform) {
      // Messenger only reaches here when a Facebook app id is configured;
      // without one the share sheet above handled it. The Send Dialog is a
      // conversation picker, NOT facebook.com/sharer, which is the timeline
      // composer and was what this used to fall back to — a private room
      // invite offered as a post to your wall.
      case "messenger":
        url = `https://www.facebook.com/dialog/send?app_id=${FACEBOOK_APP_ID}` +
              `&link=${encodedLink}&redirect_uri=${encodedLink}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodedMessage} ${encodedLink}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedLink}`;
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent(t("extra.shareEmailSubject"))}&body=${encodedMessage} ${encodedLink}`;
        break;
    }
    
    if (url) {
      if (Capacitor.isNativePlatform() && !url.startsWith("http")) {
        // Custom schemes (fb-messenger:, mailto:) — window.open is a silent
        // no-op in WKWebView. A location navigation hands the URL to iOS,
        // which opens the target app when installed and quietly does
        // nothing otherwise.
        window.location.href = url;
      } else if (pendingTab && !pendingTab.closed) {
        pendingTab.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    } else {
      pendingTab?.close();
    }

    setTimeout(() => setIsSharing(false), 500);
  };
  
  const handleImportContacts = () => {
    toast.info(t("extra.contactsImportSoon"));
  };

  if (!isOpen) return null;

  // Match lobby "glass card" language
  const lobbyGlassCard =
    "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20";
  const lobbyGlassRow =
    "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20";

  // Lobby-like constrained element widths (cards are narrower than the page)
  const narrow = "mx-auto w-full max-w-[460px]";


  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Render above any lobby layers/stacking contexts
          className="fixed inset-0 safe-screen z-[9999] flex flex-col overflow-hidden"
          style={{
            background:
              // Fully opaque purple background (no glass/see-through feel)
              "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 55%, hsl(var(--primary)) 100%)",
          }}
        >
          {/* Purple backdrop with soft glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl"
              style={{ background: "hsl(var(--primary) / 0.55)" }}
            />
            <div
              className="absolute -bottom-28 -right-28 w-[520px] h-[520px] rounded-full blur-3xl"
              style={{ background: "hsl(var(--primary) / 0.35)" }}
            />
          </div>

          {/* Fixed Header */}
          <div className="relative z-10 flex-shrink-0 border-b border-border/20 bg-primary">
            <div className="mx-auto w-full max-w-[520px] px-4 py-4 flex items-center gap-3">
              <button
                onClick={handleClose}
                className="w-12 h-12 rounded-full bg-primary border border-border/20 flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-primary-foreground" />
              </button>
              <h2 className="text-lg font-bold text-primary-foreground">{t("extra.inviteFriendsTitle")}</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="relative z-10 flex-1 overflow-y-auto">
            {/* Clear the fixed footer, which is a button taller when there
                is a "ready" to press.

                The inset is part of the sum because the footer pads itself by
                it: as a constant 9rem, the clearance was 55px on a phone with
                no home bar and 21px on one with, so the share row ended up
                sitting on the footer's top rule exactly where the bar made the
                footer tallest. */}
            <div
              className={`mx-auto w-full max-w-[520px] p-4 ${
                isPreRoomMode
                  ? "pb-[calc(15rem+env(safe-area-inset-bottom))]"
                  : "pb-[calc(10rem+env(safe-area-inset-bottom))]"
              }`}
            >
              <div className="space-y-[18px] sm:space-y-5">
                {/* Search Section */}
                <div>
                  <div className={`relative ${narrow}`}>
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/90 z-10" />
                <Input
                  type="text"
                  placeholder={t("extra.searchUserPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/60"
                />
                {searching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 animate-spin" />
                )}
                  </div>

                  {/* Search Results */}
                  <AnimatePresence mode="sync">
                    {searchQuery.length >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`mt-2 max-h-[280px] overflow-y-auto space-y-1.5 pointer-events-auto ${narrow}`}
                      >
                        {(() => {
                          // Split results into friends and non-friends
                          const friendResults = searchResults.filter(r => friendIds.has(r.user_id));
                          const nonFriendResults = searchResults.filter(r => !friendIds.has(r.user_id));
                          const hasResults = friendResults.length > 0 || nonFriendResults.length > 0;

                          if (!hasResults && !searching) {
                            return (
                              <p className="text-center py-6 text-primary-foreground/80 text-sm">
                                {t("extra.userNotFoundSearch")}
                              </p>
                            );
                          }

                          const renderRow = (result: SearchResult) => {
                            const isFriend = friendIds.has(result.user_id);
                            const isPendingOutgoing = pendingOutgoingIds.has(result.user_id);
                            const isLoading = invitingUser === result.user_id || sendingRequestTo === result.user_id;
                            const isSent = sentRequests.has(result.user_id);
                            
                            const handleButtonAction = () => {
                              if (isFriend) {
                                if (isSent || isLoading) return;
                                // Which of the three modes this screen is in
                                // decides what "invite" means. The row used to
                                // call handleInviteToRoom unconditionally, and
                                // that function opens with `if (!roomId)
                                // return` — so on the two screens that have no
                                // room the button was dead on touch, with no
                                // spinner, no toast and nothing in the log.
                                // Searching a friend by name from Create Room
                                // and pressing Invite did nothing at all,
                                // while tapping the same friend's tile in the
                                // grid below worked.
                                if (isPreRoomMode) {
                                  onFriendSelect?.(result.user_id);
                                } else if (isRoomInviteMode) {
                                  handleInviteToRoom(result.user_id);
                                } else {
                                  // Browse mode: no room to invite into, so the
                                  // row does what the grid tile does.
                                  setProfileUserId(result.user_id);
                                }
                              } else {
                                if (isPendingOutgoing) {
                                  toast.info(t("extra.requestAlreadySentWait"));
                                  return;
                                }
                                if (isSent || isLoading) return;
                                handleSendRequest(result.user_id);
                              }
                            };
                            
                            const handleClick = (e: React.MouseEvent) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (touchedRef.current) {
                                touchedRef.current = false;
                                return;
                              }
                              handleButtonAction();
                            };
                            
                            const handleTouch = (e: React.TouchEvent) => {
                              e.stopPropagation();
                              e.preventDefault();
                              touchedRef.current = true;
                              handleButtonAction();
                            };
                            
                            const isDisabled = isSent || isLoading || (!isFriend && isPendingOutgoing);
                            // Picked for a room that does not exist yet. The
                            // grid below marks this with a tick; a search row
                            // that stayed on "Invite" after being pressed read
                            // as another press that had not worked.
                            const isPicked =
                              isFriend && isPreRoomMode && !!selectedFriends?.has(result.user_id);
                            
                            return (
                              <motion.div
                                key={result.user_id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`flex items-center gap-3 p-3 pointer-events-auto ${lobbyGlassRow} hover:bg-white/15 transition-colors`}
                              >
                                <SafeAvatar
                                  avatarUrl={result.avatar_url}
                                  fallback={result.nickname}
                                  className="w-11 h-11 border border-white/20"
                                  fallbackClassName="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-white truncate">{result.nickname}</p>
                                  {result.country_code && (
                                    <p className="text-xs text-white/70">{getCountryFlag(result.country_code)}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={handleClick}
                                  onTouchEnd={handleTouch}
                                  disabled={isDisabled}
                                  className={`relative z-10 flex items-center gap-2 px-5 py-3 min-h-[48px] rounded-2xl text-sm font-semibold transition-colors border active:scale-95 ${
                                    isSent || (!isFriend && isPendingOutgoing)
                                      ? "bg-white/15 border-white/20 text-white/70"
                                      : isPicked
                                      ? "bg-white/25 border-white text-white"
                                      : isFriend && !isBrowseMode
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-400/30 text-white hover:opacity-90"
                                      : "bg-white/10 border-white/15 text-white/90 hover:bg-white/15"
                                  }`}
                                  style={{ touchAction: 'manipulation' }}
                                >
                                  {isLoading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      {t("extra.sending")}
                                    </>
                                  ) : !isFriend && isPendingOutgoing ? (
                                    <>
                                      <Clock className="w-4 h-4" />
                                      {t("extra.pending")}
                                    </>
                                  ) : isSent ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      {t("extra.sent")}
                                    </>
                                  ) : isPicked ? (
                                    <>
                                      <Check className="w-4 h-4" />
                                      {t("extra.inviteFriendBtn")}
                                    </>
                                  ) : isFriend && isBrowseMode ? (
                                    // Nothing to invite them into from here, so
                                    // the button says what it really does.
                                    <>
                                      <UserPlus className="w-4 h-4" />
                                      {t("extra.viewProfile")}
                                    </>
                                  ) : isFriend ? (
                                    <>
                                      <UserPlus className="w-4 h-4" />
                                      {t("extra.inviteFriendBtn")}
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="w-4 h-4" />
                                      {t("extra.addFriendActionBtn")}
                                    </>
                                  )}
                                </button>
                              </motion.div>
                            );
                          };

                          return (
                            <>
                              {friendResults.length > 0 && (
                                <>
                                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1 pt-1">
                                    {t("extra.yourFriends")}
                                  </p>
                                  {friendResults.map(renderRow)}
                                </>
                              )}
                              {nonFriendResults.length > 0 && (
                                <>
                                  {friendResults.length > 0 && (
                                    <div className="border-t border-white/10 my-2" />
                                  )}
                                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1 pt-1">
                                    {t("extra.otherPlayers")}
                                  </p>
                                  {nonFriendResults.map(renderRow)}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Incoming friend requests lead the screen: someone waiting
                    on an answer outranks the grid of people already secured,
                    and both answers are one tap right here. */}
                {pendingRequests.length > 0 && !searchQuery && (
                  <div className={`space-y-2 ${narrow}`}>
                    <p className="text-sm font-medium text-white/80 px-1">
                      {t("extra.requestsHeader")} ({pendingRequests.length})
                    </p>
                    <div className="max-h-[168px] space-y-1.5 overflow-y-auto">
                      <AnimatePresence initial={false}>
                        {pendingRequests.map((request) => {
                          const busy = answeringRequest?.id === request.id;
                          return (
                            <motion.div
                              key={request.id}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -60 }}
                              className={`flex items-center gap-3 p-2.5 ${lobbyGlassRow}`}
                            >
                              <SafeAvatar
                                avatarUrl={request.avatarUrl}
                                fallback={request.nickname}
                                className="w-10 h-10 border border-white/20"
                                fallbackClassName="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold"
                              />
                              <p className="flex-1 min-w-0 truncate text-sm font-medium text-white">
                                {request.nickname}
                              </p>
                              <button
                                type="button"
                                onClick={() => answerRequest(request.id, "accept")}
                                disabled={busy}
                                aria-label={t("extra.acceptRequestBtn")}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:opacity-60 active:scale-95"
                              >
                                {busy && answeringRequest?.action === "accept" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => answerRequest(request.id, "decline")}
                                disabled={busy}
                                aria-label={t("notifications.decline")}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/85 transition-colors hover:bg-white/25 disabled:opacity-60 active:scale-95"
                              >
                                {busy && answeringRequest?.action === "decline" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-5 w-5" />
                                )}
                              </button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Friends grid — shown both when picking friends before a
                    room and when inviting into an existing one. Inviting from
                    a room used to hide it, leaving only search and share
                    links even though the friends were right there. */}
                {acceptedFriends.length > 0 && !searchQuery && (
                  <div className={`space-y-3 ${narrow}`}>
                    <p className="text-sm font-medium text-white/80 px-1">{t("extra.yourFriends")}</p>
                    {/* Capped so the share row never disappears under the
                        footer: with many friends the grid at 48vh pushed the
                        social section off-screen. Two-and-a-bit rows show;
                        the rest scroll inside the grid. */}
                    <div className="grid grid-cols-4 gap-2 max-h-[min(30vh,264px)] overflow-y-auto">
                      {orderedFriends.map((friend) => {
                        const isSelected = selectedFriends?.has(friend.friendId) || false;
                        const isInvited = !isBrowseMode && sentRequests.has(friend.friendId);
                        const isInviting = invitingUser === friend.friendId;
                        const marked = isSelected || isInvited;
                        return (
                          <motion.button
                            key={friend.friendId}
                            onClick={() => {
                              if (isPreRoomMode) return onFriendSelect?.(friend.friendId);
                              if (isRoomInviteMode) return handleInviteToRoom(friend.friendId);
                              // Nothing to invite them to from here, so the
                              // tile opens who they are rather than being a
                              // button that does nothing.
                              setProfileUserId(friend.friendId);
                            }}
                            disabled={!isBrowseMode && (isInviting || isInvited)}
                            // The picked ring is drawn inside the tile. Outside
                            // it — which is where a plain `ring` goes — the
                            // grid scrolls, and the top and side edges of it
                            // were being cut off against the scroll box.
                            className={`flex flex-col items-center p-2.5 rounded-xl transition-all disabled:opacity-70 ${
                              marked
                                ? "bg-white/25 ring-2 ring-inset ring-white"
                                : "bg-white/10 hover:bg-white/15"
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="relative">
                              <SafeAvatar
                                avatarUrl={friend.avatarUrl}
                                fallback={friend.nickname}
                                className="w-12 h-12 border border-white/20"
                                fallbackClassName="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold"
                              />
                              {isInviting && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                                </div>
                              )}
                              {marked && !isInviting && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-primary" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-white font-medium mt-1.5 max-w-[60px] truncate">
                              {friend.nickname}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No friends yet */}
                {acceptedFriends.length === 0 && !searchQuery && (
                  <div className={`text-center py-6 ${narrow}`}>
                    <p className="text-white/70 text-sm mb-2">{t("extra.noFriendsYetShort")}</p>
                    <p className="text-white/50 text-xs">{t("extra.searchAndAddAbove")}</p>
                  </div>
                )}



                {/* Divider */}
                <div className={`flex items-center gap-3 ${narrow}`}>
                  <div className="flex-1 h-px bg-primary-foreground/25" />
                  <span className="text-xs text-primary-foreground/90 font-semibold">{t("extra.orShare")}</span>
                  <div className="flex-1 h-px bg-primary-foreground/25" />
                </div>

                {/* Share Options - One Row */}
                <div className="w-full">
                  <div className="mx-auto w-full max-w-[520px]">
                    {/* Roomier below than above: the labels are the last thing
                        on the screen before the footer's rule. */}
                    <div className="flex items-center justify-center gap-8 flex-nowrap overflow-x-auto scrollbar-hide overflow-y-visible pt-2 pb-4">
                      {shareOptions.map((option, index) => {
                        const IconComponent = option.icon;
                        return (
                          <motion.button
                            key={option.id}
                            onClick={() => handleShare(option.action)}
                            className="flex flex-col items-center gap-2 shrink-0 scale-[0.85] sm:scale-100"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ scale: 1.08, y: -2 }}
                            whileTap={{ scale: 0.95, y: 0 }}
                            disabled={isSharing}
                          >
                            <span><IconComponent /></span>
                            <span className="text-sm font-semibold text-primary-foreground/80">{option.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="fixed bottom-0 left-0 right-0 safe-bottom z-[10000] border-t border-white/10 bg-primary">
            <div className="mx-auto w-full max-w-[520px] p-4">
              <motion.button
                onClick={async () => {
                  // Resolved here for the same reason the share row resolves
                  // it: copied before the code arrived, this used to put a
                  // /room/<code> link on the clipboard, and that link stops
                  // working the moment the room is archived.
                  if (await copyToClipboard(await resolveAppLink()) === "failed") {
                    toast.error(t("team.shareFailed"));
                    return;
                  }
                  setCopied(true);
                  toast.success(t("extra.linkCopiedToast"));
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`mx-auto w-full max-w-[460px] py-4 rounded-2xl ${lobbyGlassCard} text-white font-bold text-base transition-colors flex items-center justify-center gap-2 ${copied ? 'bg-green-500/30 border-green-400/50' : 'bg-white/15 hover:bg-white/20'}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-300" />
                    {t("extra.linkCopied")}
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5 text-white/90" />
                    {t("extra.copyLink")}
                  </>
                )}
              </motion.button>

              {/* The way back, when picking friends for a room you have not
                  created yet. The only way out used to be the back chevron in
                  the corner, which reads as "cancel" — so the screen never
                  said what to do once you had chosen someone. Green, because
                  the button above it is the pale one and this is the one that
                  finishes the job. */}
              {isPreRoomMode && (
                <GreenPlayButton
                  onClick={handleClose}
                  // Slate until somebody is picked. Still pressable — leaving
                  // with nobody is a real answer, and the corner chevron being
                  // the only way out is what this button exists to fix.
                  tone={selectedCount > 0 ? "green" : "muted"}
                  className="mx-auto mt-3 h-14 w-full max-w-[460px] text-base"
                  icon={<Check className="w-5 h-5" />}
                >
                  {selectedCount > 0
                    ? `${t("common.done")} · ${selectedCount}`
                    : t("common.done")}
                </GreenPlayButton>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tapping a friend from the plain "add friends" entry opens who they
          are — there is no room to invite them to from here. */}
      <PlayerProfileModal
        isOpen={profileUserId !== null}
        onClose={() => setProfileUserId(null)}
        userId={profileUserId}
      />
    </AnimatePresence>
  , document.body);
}
