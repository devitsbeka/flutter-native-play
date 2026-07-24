import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SamplePost } from "@/data/samplePosts";
import { Json } from "@/integrations/supabase/types";
import { ExploreFilter, ExploreSort } from "@/components/team/UnifiedFiltersBar";

export interface Creator {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  trivia_count: number;
  total_plays: number;
  trivias: SamplePost[];
  friendship_status: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  friendship_id?: string;
}

export function useExploreCreators(
  searchQuery: string = "",
  filter: ExploreFilter = "all",
  sort: ExploreSort = "recent",
  enabled: boolean = true
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["explore-creators", user?.id, searchQuery, filter, sort],
    queryFn: async (): Promise<Creator[]> => {
      // Fetch recent public posts
      const { data: posts, error: postsError } = await supabase
        .from("user_quiz_posts")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      // Get unique user IDs
      const userIds = [...new Set((posts || []).map(p => p.user_id))];

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
      if (user) {
        const { data: friendshipData } = await supabase
          .from("friendships")
          .select("id, user_id, friend_id, status")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
        
        friendships = friendshipData || [];
      }

      // Create a map of user_id to profile
      const profileMap = new Map(
        profiles.map(p => [p.user_id, p])
      );

      // Group posts by user_id
      const creatorMap = new Map<string, SamplePost[]>();
      
      (posts || []).forEach(post => {
        const profile = profileMap.get(post.user_id);
        if (!profile) return;

        const samplePost: SamplePost = {
          id: post.id,
          username: profile.nickname || "user",
          displayName: profile.nickname || "User",
          avatarUrl: profile.avatar_url || "",
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
            icon_slug: q.icon_slug,
          })),
          isUserPost: false,
          isPublic: post.is_public ?? true,
        };

        if (!creatorMap.has(post.user_id)) {
          creatorMap.set(post.user_id, []);
        }
        creatorMap.get(post.user_id)!.push(samplePost);
      });

      // Build creator list
      const creators: Creator[] = [];
      
      creatorMap.forEach((trivias, userId) => {
        const profile = profileMap.get(userId);
        if (!profile) return;

        // Determine friendship status
        let friendshipStatus: Creator['friendship_status'] = 'none';
        let friendshipId: string | undefined;
        
        const friendship = friendships.find(
          f => (f.user_id === userId || f.friend_id === userId)
        );
        
        if (friendship) {
          friendshipId = friendship.id;
          if (friendship.status === 'accepted') {
            friendshipStatus = 'friends';
          } else if (friendship.status === 'pending') {
            friendshipStatus = friendship.user_id === user?.id ? 'pending_sent' : 'pending_received';
          }
        }

        const totalPlays = trivias.reduce((sum, t) => sum + t.playsCount, 0);

        creators.push({
          user_id: userId,
          nickname: profile.nickname || "User",
          avatar_url: profile.avatar_url,
          country_code: profile.country_code,
          trivia_count: trivias.length,
          total_plays: totalPlays,
          trivias,
          friendship_status: friendshipStatus,
          friendship_id: friendshipId,
        });
      });

      // Get friend IDs for friends filter
      const friendIds = new Set(
        friendships
          .filter(f => f.status === 'accepted')
          .map(f => f.user_id === user?.id ? f.friend_id : f.user_id)
      );

      // Apply filter
      let filteredCreators = creators;
      switch (filter) {
        case "friends":
          filteredCreators = creators.filter(c => friendIds.has(c.user_id));
          break;
        case "trivias":
        case "collections":
          // For desktop grouped view, we still show creators but the filter
          // affects which items are shown - this is handled in the mobile view
          // For grouped view, show all creators
          break;
        // "all" - no filtering needed
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredCreators = filteredCreators.filter(creator =>
          creator.nickname.toLowerCase().includes(query) ||
          creator.trivias.some(t =>
            t.title.toLowerCase().includes(query) ||
            t.subject.toLowerCase().includes(query) ||
            t.hashtags.some(h => h.toLowerCase().includes(query))
          )
        );
      }

      // Apply sorting
      switch (sort) {
        case "most_played":
          filteredCreators.sort((a, b) => b.total_plays - a.total_plays);
          break;
        case "most_liked":
          filteredCreators.sort((a, b) => {
            const aLikes = a.trivias.reduce((sum, t) => sum + t.likesCount, 0);
            const bLikes = b.trivias.reduce((sum, t) => sum + t.likesCount, 0);
            return bLikes - aLikes;
          });
          break;
        case "recent":
        default:
          // Sort by most recent trivia from each creator
          filteredCreators.sort((a, b) => {
            const aLatest = Math.max(...a.trivias.map(t => new Date(t.createdAt).getTime()));
            const bLatest = Math.max(...b.trivias.map(t => new Date(t.createdAt).getTime()));
            return bLatest - aLatest;
          });
          break;
      }

      return filteredCreators;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - content doesn't change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}
