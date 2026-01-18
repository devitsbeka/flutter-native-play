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

// Sample creators data for when real data is sparse
const SAMPLE_CREATORS: Omit<Creator, 'friendship_status' | 'friendship_id'>[] = [
  {
    user_id: 'sample-1',
    nickname: 'TriviaGio',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=TriviaGio&backgroundColor=b6e3f4',
    country_code: 'GE',
    trivia_count: 5,
    total_plays: 1247,
    trivias: [
      { id: 'sample-t1', title: 'საქართველოს ისტორია', subject: 'ისტორია', questionCount: 10, playsCount: 423, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t2', title: 'მსოფლიო გეოგრაფია', subject: 'გეოგრაფია', questionCount: 15, playsCount: 312, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t3', title: 'პოპ მუსიკა 2024', subject: 'მუსიკა', questionCount: 12, playsCount: 289, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t4', title: 'ფილმების ციტატები', subject: 'ფილმები', questionCount: 8, playsCount: 145, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t5', title: 'მეცნიერების საფუძვლები', subject: 'მეცნიერება', questionCount: 20, playsCount: 78, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-2',
    nickname: 'QuizNino',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=QuizNino&backgroundColor=ffd5dc',
    country_code: 'GE',
    trivia_count: 4,
    total_plays: 892,
    trivias: [
      { id: 'sample-t6', title: 'ქართული ლიტერატურა', subject: 'ლიტერატურა', questionCount: 15, playsCount: 356, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t7', title: 'სპორტის ვარსკვლავები', subject: 'სპორტი', questionCount: 10, playsCount: 267, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t8', title: 'ტექნოლოგიები დღეს', subject: 'ტექნოლოგია', questionCount: 12, playsCount: 189, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t9', title: 'ხელოვნების ისტორია', subject: 'ხელოვნება', questionCount: 8, playsCount: 80, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-3',
    nickname: 'BrainMaster',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=BrainMaster&backgroundColor=c0aede',
    country_code: 'US',
    trivia_count: 6,
    total_plays: 2156,
    trivias: [
      { id: 'sample-t10', title: 'World Capitals', subject: 'geography', questionCount: 20, playsCount: 567, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t11', title: 'Movie Soundtracks', subject: 'music', questionCount: 15, playsCount: 445, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t12', title: 'Science Facts', subject: 'science', questionCount: 12, playsCount: 389, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t13', title: 'History Mysteries', subject: 'history', questionCount: 10, playsCount: 312, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t14', title: 'Sports Champions', subject: 'sports', questionCount: 15, playsCount: 267, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t15', title: 'Tech Giants', subject: 'technology', questionCount: 8, playsCount: 176, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-4',
    nickname: 'QuizLena',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=QuizLena&backgroundColor=d1d4f9',
    country_code: 'UK',
    trivia_count: 3,
    total_plays: 634,
    trivias: [
      { id: 'sample-t16', title: 'British History', subject: 'history', questionCount: 12, playsCount: 289, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t17', title: 'Classic Literature', subject: 'literature', questionCount: 15, playsCount: 234, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t18', title: 'Art Movements', subject: 'art', questionCount: 10, playsCount: 111, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-5',
    nickname: 'MindChallenger',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=MindChallenger&backgroundColor=ffc9c9',
    country_code: 'DE',
    trivia_count: 5,
    total_plays: 1523,
    trivias: [
      { id: 'sample-t19', title: 'European Geography', subject: 'geography', questionCount: 18, playsCount: 445, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t20', title: 'Classical Music', subject: 'music', questionCount: 12, playsCount: 378, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t21', title: 'Physics Fun', subject: 'science', questionCount: 15, playsCount: 312, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t22', title: 'Football Legends', subject: 'sports', questionCount: 10, playsCount: 234, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t23', title: 'Nature Wonders', subject: 'nature', questionCount: 12, playsCount: 154, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-6',
    nickname: 'TriviaKing',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=TriviaKing&backgroundColor=b8f7d4',
    country_code: 'FR',
    trivia_count: 4,
    total_plays: 978,
    trivias: [
      { id: 'sample-t24', title: 'French Cuisine', subject: 'art', questionCount: 10, playsCount: 345, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t25', title: 'Cinema Classics', subject: 'movies', questionCount: 15, playsCount: 289, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t26', title: 'World Wars', subject: 'history', questionCount: 20, playsCount: 234, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t27', title: 'Music Genres', subject: 'music', questionCount: 12, playsCount: 110, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-7',
    nickname: 'SmartDato',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=SmartDato&backgroundColor=ffeaa7',
    country_code: 'GE',
    trivia_count: 3,
    total_plays: 567,
    trivias: [
      { id: 'sample-t28', title: 'თბილისის ისტორია', subject: 'ისტორია', questionCount: 12, playsCount: 234, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t29', title: 'ქართული კინო', subject: 'ფილმები', questionCount: 10, playsCount: 189, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t30', title: 'საქართველოს ბუნება', subject: 'ბუნება', questionCount: 15, playsCount: 144, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-8',
    nickname: 'QuizPro',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=QuizPro&backgroundColor=74b9ff',
    country_code: 'ES',
    trivia_count: 5,
    total_plays: 1345,
    trivias: [
      { id: 'sample-t31', title: 'Spanish Football', subject: 'sports', questionCount: 15, playsCount: 456, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t32', title: 'Latin Music', subject: 'music', questionCount: 12, playsCount: 345, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t33', title: 'Art History', subject: 'art', questionCount: 10, playsCount: 234, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t34', title: 'Geography Challenge', subject: 'geography', questionCount: 18, playsCount: 189, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t35', title: 'Science Quiz', subject: 'science', questionCount: 15, playsCount: 121, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-9',
    nickname: 'TriviaQueen',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=TriviaQueen&backgroundColor=fab1a0',
    country_code: 'IT',
    trivia_count: 4,
    total_plays: 823,
    trivias: [
      { id: 'sample-t36', title: 'Italian Art', subject: 'art', questionCount: 15, playsCount: 312, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t37', title: 'Opera & Music', subject: 'music', questionCount: 10, playsCount: 234, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t38', title: 'Roman History', subject: 'history', questionCount: 12, playsCount: 178, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t39', title: 'Mediterranean Nature', subject: 'nature', questionCount: 8, playsCount: 99, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
  {
    user_id: 'sample-10',
    nickname: 'BrainWiz',
    avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=BrainWiz&backgroundColor=a29bfe',
    country_code: 'JP',
    trivia_count: 6,
    total_plays: 1876,
    trivias: [
      { id: 'sample-t40', title: 'Anime & Manga', subject: 'art', questionCount: 20, playsCount: 567, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t41', title: 'Japanese History', subject: 'history', questionCount: 15, playsCount: 423, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t42', title: 'Technology Trends', subject: 'technology', questionCount: 12, playsCount: 345, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t43', title: 'J-Pop Music', subject: 'music', questionCount: 10, playsCount: 267, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t44', title: 'Japanese Nature', subject: 'nature', questionCount: 15, playsCount: 178, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
      { id: 'sample-t45', title: 'Video Games', subject: 'technology', questionCount: 18, playsCount: 96, username: '', displayName: '', avatarUrl: '', verified: false, createdAt: '', description: '', hashtags: [], coverGradient: '', answerFormat: '4_answers', likesCount: 0, savesCount: 0, commentsCount: 0, questions: [], isUserPost: false, isPublic: true },
    ]
  },
];

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

      // Add sample creators if we have less than 5 real ones
      let allCreators = creators;
      if (creators.length < 5) {
        const sampleCreatorsWithStatus = SAMPLE_CREATORS.map(sample => ({
          ...sample,
          friendship_status: 'none' as const,
          friendship_id: undefined
        }));
        allCreators = [...creators, ...sampleCreatorsWithStatus];
      }

      // Apply search filter
      let filteredCreators = allCreators;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredCreators = allCreators.filter(creator => 
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
