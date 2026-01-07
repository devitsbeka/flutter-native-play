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

  // Convert db posts to SamplePost format and merge with sample posts
  const convertedDbPosts: SamplePost[] = dbPosts.map((post) => {
    const questions = (post.questions as Json[]) || [];
    const profileData = post.profile;
    
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
      coverGradient: post.cover_gradient,
      questionCount: post.question_count,
      answerFormat: post.answer_format as "4_answers" | "true_false",
      likesCount: post.likes_count || 0,
      playsCount: post.plays_count || 0,
      commentsCount: 0,
      questions: questions.map((q: any) => ({
        question: q.question_text || q.question,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers || [],
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
      return data || [];
    },
    enabled: !!user?.id,
  });
}
