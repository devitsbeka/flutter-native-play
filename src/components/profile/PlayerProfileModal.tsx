import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, UserPlus, Swords, Gamepad2, Check, Clock, Heart, Play, Send, ArrowRight, Users, Loader2, Camera, Plus, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import iconTrophy from "@/assets/icon-trophy.png";
import iconTrivia from "@/assets/trivia-buzzer.png";
import iconInfo from "@/assets/icon-info.png";
import iconCollections from "@/assets/icon-collections.png";

import { ChunkyButton } from "@/components/ui/chunky-button";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { usePlayerProfile as usePlayerProfileData, InteractionLogItem } from "@/hooks/usePlayerProfile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/contexts/FriendsContext";
import { toast } from "@/lib/toast";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PlayerOverflowMenu } from "@/components/social/PlayerOverflowMenu";
import { VersusPanel, hasVersusContent } from "@/components/profile/VersusPanel";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useResponsiveVideo } from "@/hooks/useResponsiveVideo";
import { MASCOT_USER_IDS } from "@/lib/excludedUsers";
import { CreateQuizModal } from "@/components/social/CreateQuizModal";
import { AdminProfileEditor } from "@/components/profile/AdminProfileEditor";
import { SCENE_AVATAR_PROMPT } from "@/config/sceneAvatarPrompt";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogPortal,
  AlertDialogOverlay,
} from "@/components/ui/alert-dialog";

// Time formatter using translation keys
const formatProfileTimeAgo = (date: Date, t: (key: string, params?: Record<string, string | number>) => string) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t("extra.timeNow");
  if (diffMins < 60) return t("extra.timeMinutesAgo", { count: diffMins });
  if (diffHours < 24) return t("extra.timeHoursAgo", { count: diffHours });
  if (diffDays < 7) return t("extra.timeDaysAgo", { count: diffDays });
  if (diffDays < 30) return t("extra.timeWeeksAgo", { count: Math.floor(diffDays / 7) });
  return t("extra.timeMonthsAgo", { count: Math.floor(diffDays / 30) });
};

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_win: "🏆",
  streak_5: "🔥",
  streak_10: "⚡",
  games_10: "🎮",
  games_50: "🎯",
  games_100: "👑",
  perfect_game: "💎",
  social_butterfly: "🦋",
  trivia_master: "🧠",
};

/**
 * The profile's tab buttons.
 *
 * `data-[state=...]` rather than a prop: Radix puts the state on the trigger
 * itself, so the open tab and the closed ones can differ by more than one
 * shade — a raised white card against flat, dimmed, desaturated ones. The
 * shadcn default separated them by a hair of background, which is invisible
 * on a lavender sheet.
 */
const TAB_TRIGGER_CLASS = [
  "group flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all",
  "data-[state=active]:bg-background data-[state=active]:text-primary",
  "data-[state=active]:font-semibold data-[state=active]:shadow-md",
  "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-background/40",
].join(" ");

/** Desaturated and faded while its tab is closed, full colour when open. */
const TAB_ICON_CLASS =
  "w-9 h-9 transition-all group-data-[state=inactive]:opacity-60";

export function PlayerProfileModal({ isOpen, onClose, userId }: PlayerProfileModalProps) {
  const { user, profile } = useAuth();
  const bubbleVideo = useResponsiveVideo("/videos/floating-blob.mp4");
  const { isAdmin } = useAdminRole();
  const { removeFriend } = useFriends();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, loading, refetch } = usePlayerProfileData(userId);
  const [addingFriend, setAddingFriend] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingFriend, setDeletingFriend] = useState(false);
  const [showCreateTrivia, setShowCreateTrivia] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isMascotAccount = userId ? MASCOT_USER_IDS.has(userId) : false;
  const showAdminControls = isAdmin && isMascotAccount;

  // Non-friends can only see avatar, name, add friend button, and public content
  const canSeePrivateInfo = data?.isFriend || data?.isCurrentUser;

  // The Info tab exists only when it has something in it — which now includes
  // your own profile. It carries two different things: the record between the
  // two of you, which only a stranger's profile has, and the three facts —
  // answered, success rate, strongest category — which every player has,
  // yourself included. Hiding the tab from you hid your own numbers with it.
  const showInfoTab = !!data && hasVersusContent(data.headToHead, data.facts);

  /**
   * Which tab is open, once the reader has picked one.
   *
   * The tabs cannot be left uncontrolled. `defaultValue` is read once, at
   * mount, and at that moment the record and the facts are still in flight —
   * so it always resolved to "trivias", and Info then appeared beside it
   * already unselected. Null means "nobody has chosen", which is what lets
   * the default below land late without overriding a real choice.
   */
  const [chosenTab, setChosenTab] = useState<string | null>(null);

  // Opening a different player must not inherit the last one's tab. The modal
  // renders null while closed rather than unmounting, so this state outlives
  // both a close and a change of profile.
  useEffect(() => {
    setChosenTab(null);
  }, [userId]);

  // A chosen tab only counts while it still exists. Info can go away under
  // the reader — a refetch that comes back with nothing to put in it — and a
  // Tabs whose value names no trigger renders an empty panel with nothing
  // selected, which is what "switching tabs is broken" looks like.
  const fallbackTab = showInfoTab ? "info" : "trivias";
  const activeTab =
    chosenTab && (chosenTab !== "info" || showInfoTab) ? chosenTab : fallbackTab;

  // Navigate to trivia/collection lobby pages
  const handlePlayTrivia = (triviaId: string) => {
    onClose();
    navigate(`/trivia/${triviaId}`);
  };

  const handlePlayCollection = (collectionId: string) => {
    onClose();
    navigate(`/collection/${collectionId}`);
  };

  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const handleAddFriend = async () => {
    if (!user || !userId) return;
    
    setAddingFriend(true);
    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: userId,
        status: "pending",
      });

      if (error) throw error;
      toast.success(t("extra.friendRequestSentToast"));
      // Refetch profile to update button state
      refetch();
    } catch (err) {
      toast.error(t("extra.errorOccurredToast"));
    } finally {
      setAddingFriend(false);
    }
  };

  const handleChallenge = () => {
    onClose();
    navigate(`/team?challenge=${userId}&type=create-room`);
  };

  const handleDeleteFriend = async () => {
    console.log('[handleDeleteFriend] Called, friendshipId:', data?.friendshipId);
    
    if (!data?.friendshipId) {
      console.error('[handleDeleteFriend] No friendshipId available!');
      toast.error(t("extra.friendshipIdNotFound"));
      setShowDeleteConfirm(false);
      return;
    }
    
    setDeletingFriend(true);
    try {
      // Through the context, not straight at the table. Deleting the row here
      // left FriendsContext holding the friend it had already fetched, so the
      // home friends row kept them until something else happened to refetch —
      // "I have to refresh for them to disappear". removeFriend does the same
      // delete and then refreshes the list everything else reads from.
      //
      // The realtime subscription now covers deletes as well, so this is the
      // second of two paths rather than the only one; it is the one that does
      // not depend on the socket being up.
      const ok = await removeFriend(data.friendshipId);
      if (!ok) return;

      setShowDeleteConfirm(false);
      refetch();
    } finally {
      setDeletingFriend(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingAvatar(true);
    try {
      // Step 1: Upload raw photo to storage
      const rawPath = `${userId}/avatar_raw_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(rawPath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(rawPath);

      const rawPublicUrl = urlData.publicUrl;

      // Step 2: Generate AI avatar from the uploaded photo
      toast.info(t("extra.aiAvatarGenerating"), { duration: 10000 });

      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-avatar", {
        body: { imageUrl: rawPublicUrl, prompt: SCENE_AVATAR_PROMPT },
      });

      if (aiError || !aiData?.success) {
        console.warn("AI generation failed, falling back to raw photo:", aiError || aiData?.error);
        toast.warning(t("extra.aiGenerationFallback"));
        
        // Fallback: use raw photo
        const fallbackUrl = `${rawPublicUrl}?t=${Date.now()}`;
        await supabase.from("profiles").update({ avatar_url: fallbackUrl }).eq("user_id", userId);
        refetch();
        return;
      }

      // Step 3: Convert base64 AI avatar to blob and upload to storage
      const avatarBase64 = aiData.avatarUrl;
      const base64Data = avatarBase64.includes(",") ? avatarBase64.split(",")[1] : avatarBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const aiBlob = new Blob([byteArray], { type: "image/png" });

      const aiPath = `${userId}/avatar_ai_${Date.now()}.png`;
      const { error: aiUploadError } = await supabase.storage
        .from("avatars")
        .upload(aiPath, aiBlob, { upsert: true });

      if (aiUploadError) throw aiUploadError;

      const { data: aiUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(aiPath);

      const finalUrl = `${aiUrlData.publicUrl}?t=${Date.now()}`;

      // Step 4: Update profile with AI-generated avatar
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      toast.success(t("extra.aiAvatarCreated"));
      refetch();
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(t("extra.avatarUploadFailed"));
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
          >
            {/* Bubble background video + soft wash, same as the room page */}
            <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
              <BackgroundVideo
                sources={[
                  { src: bubbleVideo.webm, type: "video/webm" },
                  { src: bubbleVideo.mp4, type: "video/mp4" },
                ]}
                still="/videos/floating-blob-still.jpg"
                className="absolute inset-0"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(249,219,255,0.5) 0%, rgba(249,219,255,0.3) 45%, rgba(249,219,255,0.5) 100%)",
                }}
              />
            </div>

            {/* Frosted popup panel wrapping header + profile content */}
            <div className="relative m-auto flex max-h-full w-full max-w-[740px] md:max-w-[640px] flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/60 backdrop-blur-xl shadow-[0_12px_40px_rgba(104,71,204,0.18)]">

            {/* Fixed Header.
                z-30, and the scrolling content below is `isolate`. The
                overflow menu hangs out of this header, and the avatar's
                animated layer carries z-10 of its own (SmartAvatar) — with
                the header also at z-10 the avatar won on document order and
                covered the menu. Reproduced in a browser: either change fixes
                it, and `isolate` is what stops the next z-index added inside
                the scroll area from doing it again. */}
            <div className="flex-shrink-0 sticky top-0 z-30 border-b border-border/40">
              <div className="flex items-center h-14 px-4 max-w-[700px] md:max-w-[600px] mx-auto w-full">
                <motion.button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronLeft className="w-6 h-6 text-foreground" />
                </motion.button>
                
                <h1 className="flex-1 text-center font-display text-lg font-bold text-foreground">
                  {t("extra.profileTitle")}
                </h1>
                
                {/* One three-dots menu for any profile that isn't yours (1.2):
                    report + block always, and — on an accepted friend —
                    remove-friend in the same dropdown. Two dot buttons side
                    by side read as a rendering bug, not two menus. */}
                {!data?.isCurrentUser && userId ? (
                  <PlayerOverflowMenu
                    userId={userId}
                    displayName={data?.profile?.nickname}
                    triggerClassName="w-10 h-10 p-0 flex items-center justify-center bg-muted text-foreground [&_svg]:w-5 [&_svg]:h-5"
                    onRemoveFriend={
                      data?.friendshipStatus === 'accepted'
                        ? () => setShowDeleteConfirm(true)
                        : undefined
                    }
                  />
                ) : (
                  <div className="w-10" />
                )}
              </div>
            </div>

            {loading ? (
              /* Skeleton in the final layout's shape — a bare spinner made
                 the content-hugging panel open as a tiny card and then jump
                 to full size when the data arrived */
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-[700px] md:max-w-[600px] mx-auto animate-pulse">
                  <div className="p-4 flex flex-col items-center">
                    <div className="w-[120px] h-[120px] rounded-full bg-slate-200/70" />
                    <div className="mt-4 h-6 w-40 rounded-full bg-slate-200/70" />
                    <div className="mt-3 h-4 w-24 rounded-full bg-slate-200/70" />
                    <div className="mt-5 h-12 w-full max-w-[420px] rounded-full bg-slate-200/70" />
                  </div>
                  <div className="px-4 pb-8">
                    <div className="h-24 rounded-2xl bg-slate-200/50" />
                    <div className="mt-6 space-y-3">
                      <div className="h-16 rounded-2xl bg-slate-200/50" />
                      <div className="h-16 rounded-2xl bg-slate-200/50" />
                      <div className="h-16 rounded-2xl bg-slate-200/50" />
                    </div>
                  </div>
                </div>
              </div>
            ) : !data?.profile ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">{t("extra.profileNotFound")}</p>
              </div>
            ) : data.profile.nickname === '[წაშლილი]' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                <div className="w-[100px] h-[100px] rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">{t("extra.deletedUser")}</p>
                <p className="text-sm text-muted-foreground/70">{t("extra.accountDeleted")}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto isolate">
                <div className="max-w-[700px] md:max-w-[600px] mx-auto">
                {/* Profile Header */}
                <div className="p-4 flex flex-col items-center">
                  <SmartAvatar
                    avatarUrl={data.profile.avatar_url}
                    animatedAvatarUrl={data.profile.animated_avatar_url}
                    fallback={data.profile.nickname}
                    size="2xl"
                    className="w-[124px] h-[124px] [&>span]:bg-transparent [&>span]:w-full [&>span]:h-full"
                    showSparkle={false}
                    autoPlay={true}
                  />

                  <h3 className="mt-4 text-xl font-bold text-foreground flex items-center gap-2">
                    {data.profile.country_code && (
                      <span>{getFlagEmoji(data.profile.country_code)}</span>
                    )}
                    {data.profile.nickname}
                  </h3>
                  
                  {/* Points - only visible to friends/self */}
                  {canSeePrivateInfo && (
                    <div className="mt-1">
                      <span className="text-sm text-muted-foreground">
                        {data.stats.totalPoints.toLocaleString()} {t("extra.pointsLabel", { count: "" }).trim()}
                      </span>
                    </div>
                  )}

                  {/* The games/wins/win-rate/streak row used to sit here,
                      shown to friends and to yourself. Removed from the public
                      profile: a visitor is here to see who someone is and what
                      they have made, not to be handed a scoreboard on them.
                      Your own stats still live on your own profile page.

                      What replaced it is about the two of you rather than a
                      dump of their numbers — and it lives in the Info tab
                      below, not here, so the header stays the person and the
                      panels stay the detail. */}

                  {/* The primary-action slot: exactly one of these renders,
                      chosen by friendship status. 52px rather than the
                      size="sm" default of 40 — measured, not guessed. All four
                      carry it so the panel does not change height when a
                      request is sent or accepted.

                      min-h rather than a padding override: py-2.5 and py-4 are
                      the same property, and Tailwind's emission order decides
                      which wins, not the order in the class string. */}
                  {!data.isCurrentUser && (
                    <div className="flex items-center justify-center gap-3 mt-4 w-full max-w-xs">
                      {data.friendshipStatus === 'none' && (
                        <ChunkyButton
                          onClick={handleAddFriend}
                          disabled={addingFriend}
                          variant="secondary"
                          size="sm"
                          className="flex-1 min-h-[52px]"
                        >
                          {addingFriend ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              {t("extra.sendingLabel")}
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              {t("extra.addBtn")}
                            </>
                          )}
                        </ChunkyButton>
                      )}
                      {data.friendshipStatus === 'sent' && (
                         <ChunkyButton disabled variant="secondary" size="sm" className="flex-1 min-h-[52px]">
                          <Clock className="w-4 h-4 mr-1" />
                          {t("extra.sentStatusLabel")}
                        </ChunkyButton>
                      )}
                      {data.friendshipStatus === 'pending' && (
                        <ChunkyButton variant="primary" size="sm" className="flex-1 min-h-[52px]">
                          <Check className="w-4 h-4 mr-1" />
                          {t("extra.acceptBtn")}
                        </ChunkyButton>
                      )}
                      {data.friendshipStatus === 'accepted' && (
                        <ChunkyButton onClick={handleChallenge} variant="primary" size="sm" className="flex-1 min-h-[52px]">
                          <Swords className="w-4 h-4 mr-1" />
                          {t("extra.challengeBtn")}
                        </ChunkyButton>
                      )}
                    </div>
                  )}

                  {/* Admin Toolbar for Mascot Accounts */}
                  {showAdminControls && (
                    <div className="flex items-center justify-center gap-2 mt-3 w-full max-w-xs">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <ChunkyButton
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        <span className="ml-1 text-xs">{t("extra.avatarBtn")}</span>
                      </ChunkyButton>
                      <ChunkyButton
                        onClick={() => setShowCreateTrivia(true)}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="ml-1 text-xs">{t("extra.triviaLabel")}</span>
                      </ChunkyButton>
                      <ChunkyButton
                        onClick={() => setShowEditProfile(true)}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                      >
                        <Pencil className="w-4 h-4" />
                        <span className="ml-1 text-xs">{t("extra.editBtn")}</span>
                      </ChunkyButton>
                    </div>
                  )}
                </div>

                {/* Tabs - Trivias and Trophies (both visible to everyone) */}
                {/* Info leads when there is something in it — the record
                    between you and what they are best at is what a visitor
                    came for. It is dropped entirely rather than opened onto
                    an empty panel: a player who has answered nothing has
                    nothing to say here yet.

                    The strip is styled here rather than left at the shadcn
                    default. That default is a white pill on a near-white
                    track, which on this lavender sheet made the open tab and
                    the closed one all but the same object — you could not see
                    which one you were on, or that pressing the other had done
                    anything. The open one is now a white card with a shadow
                    and its label in the brand colour; the closed ones sit flat
                    and dimmed on a tinted track. */}
                <Tabs value={activeTab} onValueChange={setChosenTab} className="px-4 pb-4">
                  <TabsList
                    className={`grid w-full mb-4 h-auto gap-1 rounded-2xl bg-primary/[0.07] p-1.5 ${
                      showInfoTab ? "grid-cols-3" : "grid-cols-2"
                    }`}
                  >
                    {showInfoTab && (
                      <TabsTrigger value="info" className={TAB_TRIGGER_CLASS}>
                        {/* The same 3D art the other two tabs use, rather than
                            a lucide glyph — crossed swords beside a tab
                            labelled "info" read as a second Challenge button.
                            128px like its siblings, which covers w-9 at 3x. */}
                        <img src={iconInfo} alt="" className={TAB_ICON_CLASS} />
                        <span className="text-xs">{t("extra.infoTab")}</span>
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="trivias" className={TAB_TRIGGER_CLASS}>
                      <img src={iconTrivia} alt="" className={TAB_ICON_CLASS} />
                      <span className="text-xs">{t("extra.triviasTab")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="trophies" className={TAB_TRIGGER_CLASS}>
                      <img src={iconTrophy} alt="" className={TAB_ICON_CLASS} />
                      <span className="text-xs">{t("extra.trophiesTab")}</span>
                    </TabsTrigger>
                  </TabsList>

                  {showInfoTab && (
                    <TabsContent value="info">
                      <VersusPanel
                        headToHead={data.headToHead}
                        facts={data.facts}
                        isSelf={data.isCurrentUser}
                        me={{ nickname: profile?.nickname, avatarUrl: profile?.avatar_url }}
                        them={{
                          nickname: data.profile.nickname,
                          avatarUrl: data.profile.avatar_url,
                        }}
                      />
                    </TabsContent>
                  )}

                  <TabsContent value="trophies">
                    {data.achievements.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>{t("extra.noTrophiesYet")}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3">
                        {data.achievements.map((achievement) => (
                          <motion.div
                            key={achievement.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="aspect-square rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center text-2xl"
                          >
                            {ACHIEVEMENT_ICONS[achievement.achievement_id] || "🏅"}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="trivias">
                    {data.trivias.length === 0 && data.collections.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>{t("extra.noTriviasProfileYet")}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Trivias */}
                        {data.trivias.length > 0 && (
                          <div className="space-y-3">
                            {data.trivias.map((trivia) => (
                              <motion.div
                                key={trivia.id}
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                onClick={() => handlePlayTrivia(trivia.id)}
                                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
                              >
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
                                  {trivia.cover_image ? (
                                    <img src={trivia.cover_image} alt="" className="w-full h-full object-cover rounded-lg" />
                                  ) : trivia.icon_slug ? (
                                    <DynamicIcon slug={trivia.icon_slug} size={32} hideIfEmpty />
                                  ) : (
                                    <Gamepad2 className="w-6 h-6 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">{trivia.title}</p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Play className="w-3 h-3" /> {trivia.plays_count || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Heart className="w-3 h-3" /> {trivia.likes_count || 0}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                        
                        {/* Collections */}
                        {data.collections.length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            {data.collections.map((collection) => (
                              <motion.div
                                key={collection.id}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                onClick={() => handlePlayCollection(collection.id)}
                                className="rounded-xl overflow-hidden border border-border cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
                              >
                                <div 
                                  className="aspect-video"
                                  style={{ background: collection.cover_gradient }}
                                >
                                  {collection.cover_image && (
                                    <img src={collection.cover_image} alt="" className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <div className="p-2 bg-card">
                                  <p className="font-medium text-sm text-foreground truncate">{collection.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Play className="w-3 h-3" /> {collection.plays_count || 0}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Recent Interactions - only for friends */}
                {canSeePrivateInfo && !data.isCurrentUser && data.interactions.length > 0 && (
                  <div className="px-4 pb-6">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {t("extra.recentActivityTitle")}
                    </h4>
                    <div className="space-y-2">
                      {data.interactions.slice(0, 3).map((interaction) => (
                        <motion.div
                          key={interaction.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-card/50 border border-border/50"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            interaction.type === 'invitation_sent' 
                              ? 'bg-primary/20 text-primary'
                              : interaction.type === 'invitation_received'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-amber-500/20 text-amber-500'
                          }`}>
                            {interaction.type === 'invitation_sent' && <Send className="w-4 h-4" />}
                            {interaction.type === 'invitation_received' && <ArrowRight className="w-4 h-4" />}
                            {interaction.type === 'room_together' && <Users className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Name the room or category. Every entry already
                                carried it and none of them showed it, so the
                                line stopped at "invited you to" and left the
                                reader to guess what. The bare label is still
                                the fallback for an invitation with no room
                                left to name. */}
                            <p className="text-sm text-foreground truncate">
                              {interaction.details
                                ? t(`extra.${interaction.message}Named`, { name: interaction.details })
                                : t(`extra.${interaction.message}`)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatProfileTimeAgo(new Date(interaction.timestamp), t)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* End of frosted popup panel */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Delete Friend Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="z-[140]" />
          <AlertDialogContent className="z-[150]">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("extra.deleteFriendTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("extra.deleteFriendDesc", { name: data?.profile?.nickname || "" })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingFriend}>{t("extra.cancelBtn")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteFriend();
                }}
                disabled={deletingFriend}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingFriend ? t("extra.deletingLabel") : t("extra.deleteBtn")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {/* Admin: Create Trivia Modal */}
      {showAdminControls && userId && (
        <CreateQuizModal
          open={showCreateTrivia}
          onOpenChange={setShowCreateTrivia}
          overrideUserId={userId}
          onQuizCreated={() => refetch()}
        />
      )}

      {/* Admin: Edit Profile Dialog */}
      {showAdminControls && userId && data?.profile && (
        <AdminProfileEditor
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          userId={userId}
          currentNickname={data.profile.nickname}
          currentCountryCode={data.profile.country_code}
          currentAvatarUrl={data.profile.avatar_url}
          currentAnimatedAvatarUrl={data.profile.animated_avatar_url}
          onSaved={() => refetch()}
        />
      )}
    </>
  );
}
