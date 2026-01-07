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

  const likeMutation = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user) throw new Error("Must be logged in");

      if (liked) {
        await supabase.from("quiz_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("quiz_post_likes").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-quiz-likes"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      if (!user) throw new Error("Must be logged in");

      if (saved) {
        await supabase.from("quiz_post_saves").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("quiz_post_saves").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-quiz-saves"] });
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
  const convertedDbPosts: SamplePost[] = dbPosts.map((post, index) => {
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
      questionCount: post.question_count,
      answerFormat: post.answer_format as "4_answers" | "true_false",
      likesCount: post.likes_count || 0,
      playsCount: post.plays_count || 0,
      commentsCount: 0,
      questions: questions.map((q: any) => ({
        question: q.question_text || q.question,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers || [],
        icon_slug: q.icon_slug || null,
      })),
      isUserPost: user?.id === post.user_id,
    };
  });

  const allPosts: SamplePost[] = [...convertedDbPosts, ...samplePosts];

  return {
    posts: allPosts,
    isLoading,
    userLikes,
    userSaves,
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

      if (!data || data.length === 0) return [];

      // Fetch saves count for user's posts
      const postIds = data.map(p => p.id);
      const { data: savesData } = await supabase
        .from("quiz_post_saves")
        .select("post_id")
        .in("post_id", postIds);

      // Fetch comments count for user's posts
      const { data: commentsData } = await supabase
        .from("quiz_post_comments")
        .select("post_id")
        .in("post_id", postIds);

      // Count saves per post
      const savesMap = (savesData || []).reduce((acc, save) => {
        acc[save.post_id] = (acc[save.post_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Count comments per post
      const commentsMap = (commentsData || []).reduce((acc, comment) => {
        acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Merge saves and comments count with posts
      return data.map(post => ({
        ...post,
        saves_count: savesMap[post.id] || 0,
        comments_count: commentsMap[post.id] || 0
      }));
    },
    enabled: !!user?.id,
  });
}
