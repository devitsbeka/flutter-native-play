import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SamplePost } from "@/data/samplePosts";
import { Json } from "@/integrations/supabase/types";
import { ExploreFilter, ExploreSort } from "@/components/team/UnifiedFiltersBar";

export interface PlayerInfo {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  trivia_count: number;
  total_plays: number;
  friendship_status: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  friendship_id?: string;
}

export interface CollectionItem {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  cover_gradient: string;
  plays_count: number;
  likes_count: number;
  saves_count: number;
  created_at: string;
  user_id: string;
}

export interface PlayerFeedItem {
  id: string;
  player: PlayerInfo;
  item: SamplePost | CollectionItem;
  itemType: 'trivia' | 'collection';
  createdAt: string;
}

// Exported so useExplorePrefetch can warm the exact same query
export async function fetchPlayerFeedItems(
  userId: string | undefined,
  searchQuery: string,
  filter: ExploreFilter,
  sort: ExploreSort
): Promise<PlayerFeedItem[]> {
      // Fetch recent public posts
      const { data: posts, error: postsError } = await supabase
        .from("user_quiz_posts")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      // Fetch recent public collections
      const { data: collections, error: collectionsError } = await supabase
        .from("quiz_collections")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (collectionsError) throw collectionsError;

      // Get unique user IDs from both posts and collections
      const postUserIds = (posts || []).map(p => p.user_id);
      const collectionUserIds = (collections || []).map(c => c.user_id);
      const userIds = [...new Set([...postUserIds, ...collectionUserIds])];

      // Fetch profiles for those users
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profileData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, nickname, avatar_url, country_code")
          .in("user_id", userIds);
        if (profilesError) throw profilesError;
        profiles = profileData || [];
      }

      // Fetch friendship status for current user
      let friendships: { id: string; user_id: string; friend_id: string; status: string }[] = [];
      if (userId) {
        const { data: friendshipData } = await supabase
          .from("friendships")
          .select("id, user_id, friend_id, status")
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        friendships = friendshipData || [];
      }

      // Create profile map
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      // Count trivias and plays per user
      const userTriviaStats = new Map<string, { count: number; plays: number }>();
      (posts || []).forEach(post => {
        const stats = userTriviaStats.get(post.user_id) || { count: 0, plays: 0 };
        stats.count += 1;
        stats.plays += post.plays_count || 0;
        userTriviaStats.set(post.user_id, stats);
      });

      // Helper to get friendship status
      const getFriendshipInfo = (userId: string): { status: PlayerInfo['friendship_status']; id?: string } => {
        const friendship = friendships.find(f => f.user_id === userId || f.friend_id === userId);
        if (!friendship) return { status: 'none' };
        
        if (friendship.status === 'accepted') {
          return { status: 'friends', id: friendship.id };
        } else if (friendship.status === 'pending') {
          return {
            status: friendship.user_id === userId ? 'pending_sent' : 'pending_received',
            id: friendship.id
          };
        }
        return { status: 'none' };
      };

      // Helper to create PlayerInfo
      const createPlayerInfo = (userId: string): PlayerInfo | null => {
        const profile = profileMap.get(userId);
        if (!profile) return null;

        const stats = userTriviaStats.get(userId) || { count: 0, plays: 0 };
        const friendshipInfo = getFriendshipInfo(userId);

        return {
          user_id: userId,
          nickname: profile.nickname || "User",
          avatar_url: profile.avatar_url,
          country_code: profile.country_code,
          trivia_count: stats.count,
          total_plays: stats.plays,
          friendship_status: friendshipInfo.status,
          friendship_id: friendshipInfo.id,
        };
      };

      // Build feed items from posts
      const feedItems: PlayerFeedItem[] = [];

      (posts || []).forEach(post => {
        const player = createPlayerInfo(post.user_id);
        if (!player) return;

        const profile = profileMap.get(post.user_id);

        const samplePost: SamplePost = {
          id: post.id,
          username: profile?.nickname || "user",
          displayName: profile?.nickname || "User",
          avatarUrl: profile?.avatar_url || "",
          verified: false,
          createdAt: post.created_at || new Date().toISOString(),
          title: post.title || "Untitled",
          description: post.description || "",
          subject: post.subject || "",
          hashtags: (post.hashtags as string[]) || [],
          coverGradient: post.cover_gradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          coverImage: post.cover_image || undefined,
          questionCount: Array.isArray(post.questions) ? post.questions.length : 0,
          answerFormat: "4_answers",
          likesCount: post.likes_count || 0,
          savesCount: post.saves_count || 0,
          playsCount: post.plays_count || 0,
          commentsCount: 0,
          questions: ((post.questions as Json[]) || []).map((q: any) => ({
            question: q.question_text || q.question || "",
            correct_answer: q.correct_answer || "",
            incorrect_answers: q.incorrect_answers || [],
            icon_slug: q.icon_slug || q.iconSlug || null,
          })),
          isUserPost: false,
          isPublic: post.is_public ?? true,
        };

        feedItems.push({
          id: `trivia-${post.id}`,
          player,
          item: samplePost,
          itemType: 'trivia',
          createdAt: post.created_at || new Date().toISOString(),
        });
      });

      // Build feed items from collections
      (collections || []).forEach(collection => {
        const player = createPlayerInfo(collection.user_id);
        if (!player) return;

        const collectionItem: CollectionItem = {
          id: collection.id,
          title: collection.title,
          description: collection.description,
          cover_image: collection.cover_image,
          cover_gradient: collection.cover_gradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          plays_count: collection.plays_count || 0,
          likes_count: collection.likes_count || 0,
          saves_count: collection.saves_count || 0,
          created_at: collection.created_at || new Date().toISOString(),
          user_id: collection.user_id,
        };

        feedItems.push({
          id: `collection-${collection.id}`,
          player,
          item: collectionItem,
          itemType: 'collection',
          createdAt: collection.created_at || new Date().toISOString(),
        });
      });

      // Get friend IDs for friends filter
      const friendIds = new Set(
        friendships
          .filter(f => f.status === 'accepted')
          .map(f => f.user_id === userId ? f.friend_id : f.user_id)
      );

      // Apply type filter (trivias/collections/friends)
      let filteredItems = feedItems;
      switch (filter) {
        case "friends":
          filteredItems = feedItems.filter(item => friendIds.has(item.player.user_id));
          break;
        case "trivias":
          filteredItems = feedItems.filter(item => item.itemType === 'trivia');
          break;
        case "collections":
          filteredItems = feedItems.filter(item => item.itemType === 'collection');
          break;
        // "all" - no filtering needed
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredItems = filteredItems.filter(feedItem => {
          // Search in player nickname
          if (feedItem.player.nickname.toLowerCase().includes(query)) return true;

          // Search in item title
          if (feedItem.itemType === 'trivia') {
            const trivia = feedItem.item as SamplePost;
            if (trivia.title.toLowerCase().includes(query)) return true;
            if (trivia.subject.toLowerCase().includes(query)) return true;
            if (trivia.hashtags.some(h => h.toLowerCase().includes(query))) return true;
          } else {
            const collection = feedItem.item as CollectionItem;
            if (collection.title.toLowerCase().includes(query)) return true;
            if (collection.description?.toLowerCase().includes(query)) return true;
          }

          return false;
        });
      }

      // Helper to interleave items from different creators (round-robin)
      const interleaveByCreator = (items: PlayerFeedItem[]): PlayerFeedItem[] => {
        const byCreator = new Map<string, PlayerFeedItem[]>();
        items.forEach(item => {
          const userId = item.player.user_id;
          if (!byCreator.has(userId)) {
            byCreator.set(userId, []);
          }
          byCreator.get(userId)!.push(item);
        });

        const result: PlayerFeedItem[] = [];
        const queues = Array.from(byCreator.values());
        
        while (queues.some(q => q.length > 0)) {
          for (const queue of queues) {
            if (queue.length > 0) {
              result.push(queue.shift()!);
            }
          }
        }
        
        return result;
      };

      // Apply sorting
      switch (sort) {
        case "most_played":
          filteredItems.sort((a, b) => {
            const aPlays = a.itemType === 'trivia'
              ? (a.item as SamplePost).playsCount
              : (a.item as CollectionItem).plays_count;
            const bPlays = b.itemType === 'trivia'
              ? (b.item as SamplePost).playsCount
              : (b.item as CollectionItem).plays_count;
            return bPlays - aPlays;
          });
          break;
        case "most_liked":
          filteredItems.sort((a, b) => {
            const aLikes = a.itemType === 'trivia'
              ? (a.item as SamplePost).likesCount
              : (a.item as CollectionItem).likes_count;
            const bLikes = b.itemType === 'trivia'
              ? (b.item as SamplePost).likesCount
              : (b.item as CollectionItem).likes_count;
            return bLikes - aLikes;
          });
          break;
        case "recent":
        default:
          filteredItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          // Interleave to prevent same-creator clustering
          filteredItems = interleaveByCreator(filteredItems);
          break;
      }

      return filteredItems;
}

export function usePlayerFeedItems(
  searchQuery: string = "",
  filter: ExploreFilter = "all",
  sort: ExploreSort = "recent",
  enabled: boolean = true
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["player-feed-items", user?.id, searchQuery, filter, sort],
    queryFn: () => fetchPlayerFeedItems(user?.id, searchQuery, filter, sort),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - content doesn't change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}
