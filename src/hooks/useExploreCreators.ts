import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SamplePost } from "@/data/samplePosts";
import { Json } from "@/integrations/supabase/types";

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

export function useExploreCreators(searchQuery: string = "") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["explore-creators", user?.id, searchQuery],
    queryFn: async (): Promise<Creator[]> => {
      // Fetch all public posts
      const { data: posts, error: postsError } = await supabase
        .from("user_quiz_posts")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      // Get unique user IDs - show ALL users including current user in Explore
      const userIds = [...new Set(posts.map(p => p.user_id))];

      if (userIds.length === 0) return [];

      // Fetch profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, country_code")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

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
        (profiles || []).map(p => [p.user_id, p])
      );

      // Group posts by user_id
      const creatorMap = new Map<string, SamplePost[]>();
      
      posts.forEach(post => {
        // Show all users' public posts in Explore
        
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
            question: q.question || "",
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

      // Apply search filter
      let filteredCreators = creators;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredCreators = creators.filter(creator => 
          creator.nickname.toLowerCase().includes(query) ||
          creator.trivias.some(t => 
            t.title.toLowerCase().includes(query) ||
            t.subject.toLowerCase().includes(query) ||
            t.hashtags.some(h => h.toLowerCase().includes(query))
          )
        );
      }

      // Sort by total plays (most popular first)
      filteredCreators.sort((a, b) => b.total_plays - a.total_plays);

      return filteredCreators;
    },
    staleTime: 30000,
  });
}
