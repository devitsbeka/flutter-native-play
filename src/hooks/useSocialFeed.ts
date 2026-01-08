import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { samplePosts, SamplePost } from "@/data/samplePosts";
import { Json } from "@/integrations/supabase/types";

export function useSocialFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: dbPosts = [], isLoading } = useQuery({
    queryKey: ["quiz-posts-with-profiles"],
    queryFn: async () => {
      // First get all posts
      const { data: posts, error: postsError } = await supabase
        .from("user_quiz_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      if (!posts || posts.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(posts.map(p => p.user_id))];

      // Fetch profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Create a map of user_id to profile
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Merge posts with profiles
      return posts.map(post => ({
        ...post,
        profile: profileMap.get(post.user_id) || null
      }));
    },
  });

  const { data: userLikes = [] } = useQuery({
    queryKey: ["user-quiz-likes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quiz_post_likes")
        .select("post_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((l) => l.post_id);
    },
    enabled: !!user,
  });

  const { data: userSaves = [] } = useQuery({
    queryKey: ["user-quiz-saves", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quiz_post_saves")
        .select("post_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((s) => s.post_id);
    },
    enabled: !!user,
  });

  const { data: userPlays = [] } = useQuery({
    queryKey: ["user-quiz-plays", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quiz_post_plays")
        .select("post_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((p) => p.post_id);
    },
    enabled: !!user,
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user) throw new Error("Must be logged in");

      if (liked) {
        // Remove like
        await supabase.from("quiz_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        // Decrement likes count
        const { data } = await supabase.from("user_quiz_posts").select("likes_count").eq("id", postId).single();
        if (data) {
          await supabase.from("user_quiz_posts").update({ likes_count: Math.max(0, (data.likes_count || 0) - 1) }).eq("id", postId);
        }
      } else {
        // Add like
        await supabase.from("quiz_post_likes").insert({ post_id: postId, user_id: user.id });
        // Increment likes count
        const { data } = await supabase.from("user_quiz_posts").select("likes_count").eq("id", postId).single();
        if (data) {
          await supabase.from("user_quiz_posts").update({ likes_count: (data.likes_count || 0) + 1 }).eq("id", postId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-posts-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["user-quiz-likes"] });
      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      if (!user) throw new Error("Must be logged in");

      if (saved) {
        // Remove save
        await supabase.from("quiz_post_saves").delete().eq("post_id", postId).eq("user_id", user.id);
        // Decrement saves count
        const { data } = await supabase.from("user_quiz_posts").select("saves_count").eq("id", postId).single();
        if (data) {
          await supabase.from("user_quiz_posts").update({ saves_count: Math.max(0, (data.saves_count || 0) - 1) }).eq("id", postId);
        }
      } else {
        // Add save
        await supabase.from("quiz_post_saves").insert({ post_id: postId, user_id: user.id });
        // Increment saves count
        const { data } = await supabase.from("user_quiz_posts").select("saves_count").eq("id", postId).single();
        if (data) {
          await supabase.from("user_quiz_posts").update({ saves_count: (data.saves_count || 0) + 1 }).eq("id", postId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-quiz-saves"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-posts-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
    },
  });

  // Fallback gradients for posts without valid gradients
  const fallbackGradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)",
  ];

  // Convert db posts to SamplePost format and merge with sample posts
  const convertedDbPosts: (SamplePost & { collectionId?: string | null })[] = dbPosts.map((post, index) => {
    const questions = (post.questions as Json[]) || [];
    const profileData = post.profile;
    
    // Ensure we have a valid gradient - use the stored one or fallback
    const storedGradient = post.cover_gradient;
    const hasValidGradient = storedGradient && storedGradient.includes('gradient');
    const coverGradient = hasValidGradient 
      ? storedGradient 
      : fallbackGradients[index % fallbackGradients.length];
    
    return {
      id: post.id,
      username: profileData?.nickname || "user",
      displayName: profileData?.nickname || "User",
      avatarUrl: profileData?.avatar_url || "",
      verified: false,
      createdAt: post.created_at || new Date().toISOString(),
      title: post.title,
      description: post.description || "",
      subject: post.subject,
      hashtags: post.hashtags || [],
      coverGradient,
      coverImage: post.cover_image || undefined,
      questionCount: post.question_count,
      answerFormat: post.answer_format as "4_answers" | "true_false",
      likesCount: post.likes_count || 0,
      playsCount: post.plays_count || 0,
      savesCount: post.saves_count || 0,
      commentsCount: 0,
      questions: questions.map((q: any) => ({
        question: q.question_text || q.question,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers || [],
        icon_slug: q.icon_slug || null,
      })),
      isUserPost: user?.id === post.user_id,
      collectionId: post.collection_id,
      roundNumber: post.round_number,
    };
  });

  // Group posts by collection_id
  const collectionMap = new Map<string, (SamplePost & { collectionId?: string | null })[]>();
  const standalonePosts: SamplePost[] = [];

  convertedDbPosts.forEach(post => {
    if (post.collectionId) {
      const existing = collectionMap.get(post.collectionId) || [];
      existing.push(post);
      collectionMap.set(post.collectionId, existing);
    } else {
      standalonePosts.push(post);
    }
  });

  // Sort posts within each collection by round_number
  collectionMap.forEach((posts, collectionId) => {
    posts.sort((a, b) => ((a as any).roundNumber || 0) - ((b as any).roundNumber || 0));
  });

  // Create feed items - collections as groups, standalone as individual
  type FeedItem = { type: 'standalone'; post: SamplePost } | { type: 'collection'; posts: SamplePost[]; collectionId: string };
  
  const feedItems: FeedItem[] = [];
  
  // Add collections first (by earliest post date)
  const sortedCollections = Array.from(collectionMap.entries()).sort((a, b) => {
    const dateA = new Date(a[1][0]?.createdAt || 0).getTime();
    const dateB = new Date(b[1][0]?.createdAt || 0).getTime();
    return dateB - dateA;
  });

  sortedCollections.forEach(([collectionId, posts]) => {
    feedItems.push({ type: 'collection', posts, collectionId });
  });

  // Add standalone posts
  standalonePosts.forEach(post => {
    feedItems.push({ type: 'standalone', post });
  });

  // Sort all by date (use first post date for collections)
  feedItems.sort((a, b) => {
    const dateA = a.type === 'collection' 
      ? new Date(a.posts[0]?.createdAt || 0).getTime()
      : new Date(a.post.createdAt).getTime();
    const dateB = b.type === 'collection' 
      ? new Date(b.posts[0]?.createdAt || 0).getTime()
      : new Date(b.post.createdAt).getTime();
    return dateB - dateA;
  });

  // Flatten for backward compatibility - but also export feedItems
  const allPosts: SamplePost[] = [...standalonePosts, ...samplePosts];

  return {
    posts: allPosts,
    feedItems,
    isLoading,
    userLikes,
    userSaves,
    userPlays,
    toggleLike: (postId: string) => {
      const isLiked = userLikes.includes(postId);
      likeMutation.mutate({ postId, liked: isLiked });
    },
    toggleSave: (postId: string) => {
      const isSaved = userSaves.includes(postId);
      saveMutation.mutate({ postId, saved: isSaved });
    },
  };
}

// Export the FeedItem type for use in components
export type FeedItem = { type: 'standalone'; post: SamplePost } | { type: 'collection'; posts: SamplePost[]; collectionId: string };

export function useMyQuizPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-quiz-posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_quiz_posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching my quiz posts:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.id,
  });
}
