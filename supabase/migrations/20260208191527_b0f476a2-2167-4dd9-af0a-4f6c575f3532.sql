
-- Delete all data for user Mako (79fa0a90-eef4-444b-b8e4-4e29490d6613)
-- and user hhjjh (62cdca87-5781-4ce1-b9e5-b5f54800357c)

DO $$
DECLARE
  user_ids uuid[] := ARRAY[
    '79fa0a90-eef4-444b-b8e4-4e29490d6613'::uuid,
    '62cdca87-5781-4ce1-b9e5-b5f54800357c'::uuid
  ];
  uid uuid;
BEGIN
  FOREACH uid IN ARRAY user_ids LOOP
    -- Delete from all user-related tables
    DELETE FROM public.player_answers WHERE user_id = uid;
    DELETE FROM public.room_participants WHERE user_id = uid;
    DELETE FROM public.room_chat_messages WHERE user_id = uid;
    DELETE FROM public.game_sessions WHERE user_id = uid;
    DELETE FROM public.game_invitations WHERE sender_id = uid OR receiver_id = uid;
    DELETE FROM public.user_achievements WHERE user_id = uid;
    DELETE FROM public.user_avatar_frames WHERE user_id = uid;
    DELETE FROM public.user_category_progress WHERE user_id = uid;
    DELETE FROM public.user_country_progress WHERE user_id = uid;
    DELETE FROM public.user_daily_plays WHERE user_id = uid;
    DELETE FROM public.user_daily_rewards WHERE user_id = uid;
    DELETE FROM public.user_daily_spins WHERE user_id = uid;
    DELETE FROM public.user_favorites WHERE user_id = uid;
    DELETE FROM public.user_league_data WHERE user_id = uid;
    DELETE FROM public.user_level_progress WHERE user_id = uid;
    DELETE FROM public.user_mission_streaks WHERE user_id = uid;
    DELETE FROM public.user_missions WHERE user_id = uid;
    DELETE FROM public.user_power_ups WHERE user_id = uid;
    DELETE FROM public.user_presence WHERE user_id = uid;
    DELETE FROM public.user_rewards WHERE user_id = uid;
    DELETE FROM public.user_roles WHERE user_id = uid;
    DELETE FROM public.vip_subscriptions WHERE user_id = uid;
    DELETE FROM public.chat_messages WHERE sender_id = uid OR receiver_id = uid;
    DELETE FROM public.friendships WHERE user_id = uid OR friend_id = uid;
    DELETE FROM public.notifications WHERE user_id = uid;
    DELETE FROM public.category_stats WHERE user_id = uid;
    DELETE FROM public.category_leaderboard WHERE user_id = uid;
    DELETE FROM public.avatar_generations WHERE user_id = uid;
    DELETE FROM public.game_plays WHERE user_id = uid;
    DELETE FROM public.game_rooms WHERE host_user_id = uid;
    DELETE FROM public.push_tokens WHERE user_id = uid;
    DELETE FROM public.category_weekly_rewards WHERE user_id = uid;
    DELETE FROM public.friend_invites WHERE inviter_id = uid;
    DELETE FROM public.gem_purchases WHERE user_id = uid;
    DELETE FROM public.purchase_transactions WHERE user_id = uid;
    DELETE FROM public.quiz_post_comments WHERE user_id = uid;
    DELETE FROM public.quiz_post_likes WHERE user_id = uid;
    DELETE FROM public.quiz_post_plays WHERE user_id = uid;
    DELETE FROM public.quiz_post_saves WHERE user_id = uid;
    DELETE FROM public.trivia_drafts WHERE user_id = uid;
    DELETE FROM public.collection_drafts WHERE user_id = uid;
    DELETE FROM public.cover_image_generations WHERE user_id = uid;
    DELETE FROM public.user_quiz_posts WHERE user_id = uid;
    DELETE FROM public.quiz_collections WHERE user_id = uid;
    DELETE FROM public.tv_players WHERE user_id = uid;
    DELETE FROM public.profiles WHERE user_id = uid;
    
    -- Delete the auth user
    DELETE FROM auth.users WHERE id = uid;
  END LOOP;
END $$;
