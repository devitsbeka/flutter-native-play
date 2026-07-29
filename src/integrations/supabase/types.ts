export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_generation_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model: string | null
          model_settings: Json | null
          name: string
          negative_prompt: string | null
          prompt: string
          setting_type: string
          style_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          model_settings?: Json | null
          name: string
          negative_prompt?: string | null
          prompt: string
          setting_type: string
          style_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          model_settings?: Json | null
          name?: string
          negative_prompt?: string | null
          prompt?: string
          setting_type?: string
          style_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          is_secret: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          is_secret?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          is_secret?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      avatar_generations: {
        Row: {
          animated_avatar_url: string | null
          avatar_url: string
          created_at: string
          id: string
          is_current: boolean | null
          source_image_url: string | null
          user_id: string
        }
        Insert: {
          animated_avatar_url?: string | null
          avatar_url: string
          created_at?: string
          id?: string
          is_current?: boolean | null
          source_image_url?: string | null
          user_id: string
        }
        Update: {
          animated_avatar_url?: string | null
          avatar_url?: string
          created_at?: string
          id?: string
          is_current?: boolean | null
          source_image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          category_id: string
          color: string
          created_at: string | null
          description: string | null
          icon: string
          icon_slug: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_language_specific: boolean | null
          language: string | null
          levels_updated_at: string | null
          name: string
          sort_order: number | null
          total_levels: number
          type: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          icon_slug?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_language_specific?: boolean | null
          language?: string | null
          levels_updated_at?: string | null
          name: string
          sort_order?: number | null
          total_levels?: number
          type?: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          color?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          icon_slug?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_language_specific?: boolean | null
          language?: string | null
          levels_updated_at?: string | null
          name?: string
          sort_order?: number | null
          total_levels?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      category_leaderboard: {
        Row: {
          best_streak: number
          category_id: string
          created_at: string
          games_played: number
          id: string
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          category_id: string
          created_at?: string
          games_played?: number
          id?: string
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          category_id?: string
          created_at?: string
          games_played?: number
          id?: string
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      category_stats: {
        Row: {
          category: string
          correct_answers: number | null
          created_at: string
          id: string
          total_answers: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          correct_answers?: number | null
          created_at?: string
          id?: string
          total_answers?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          correct_answers?: number | null
          created_at?: string
          id?: string
          total_answers?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      category_translations: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          language: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          language: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          language?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_weekly_rewards: {
        Row: {
          badge_rewarded: string | null
          category_id: string
          claimed_at: string | null
          coins_rewarded: number
          created_at: string
          final_rank: number
          frame_rewarded: string | null
          gems_rewarded: number
          id: string
          total_stars: number
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          badge_rewarded?: string | null
          category_id: string
          claimed_at?: string | null
          coins_rewarded?: number
          created_at?: string
          final_rank: number
          frame_rewarded?: string | null
          gems_rewarded?: number
          id?: string
          total_stars?: number
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          badge_rewarded?: string | null
          category_id?: string
          claimed_at?: string | null
          coins_rewarded?: number
          created_at?: string
          final_rank?: number
          frame_rewarded?: string | null
          gems_rewarded?: number
          id?: string
          total_stars?: number
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_weekly_rewards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_attempts: {
        Row: {
          challenge_link_id: string
          created_at: string
          id: string
          player_name: string
          player_score: number
          user_id: string | null
        }
        Insert: {
          challenge_link_id: string
          created_at?: string
          id?: string
          player_name: string
          player_score?: number
          user_id?: string | null
        }
        Update: {
          challenge_link_id?: string
          created_at?: string
          id?: string
          player_name?: string
          player_score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_attempts_challenge_link_id_fkey"
            columns: ["challenge_link_id"]
            isOneToOne: false
            referencedRelation: "challenge_links"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_links: {
        Row: {
          category_icon_slug: string | null
          category_name: string | null
          challenger_avatar_url: string | null
          challenger_id: string
          challenger_nickname: string
          challenger_score: number
          code: string
          created_at: string
          expires_at: string
          id: string
          questions: Json
          room_id: string | null
          total_questions: number
        }
        Insert: {
          category_icon_slug?: string | null
          category_name?: string | null
          challenger_avatar_url?: string | null
          challenger_id: string
          challenger_nickname: string
          challenger_score?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          questions?: Json
          room_id?: string | null
          total_questions?: number
        }
        Update: {
          category_icon_slug?: string | null
          category_name?: string | null
          challenger_avatar_url?: string | null
          challenger_id?: string
          challenger_nickname?: string
          challenger_score?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          questions?: Json
          room_id?: string | null
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_links_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      collection_drafts: {
        Row: {
          cover_gradient: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          generated_data: Json | null
          id: string
          is_public: boolean | null
          rounds_config: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_gradient?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          generated_data?: Json | null
          id?: string
          is_public?: boolean | null
          rounds_config?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_gradient?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          generated_data?: Json | null
          id?: string
          is_public?: boolean | null
          rounds_config?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cover_image_generations: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_selected: boolean | null
          round_id: string | null
          subject: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_selected?: boolean | null
          round_id?: string | null
          subject?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_selected?: boolean | null
          round_id?: string | null
          subject?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_image_generations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_config: {
        Row: {
          category: string
          description: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
          value: number
        }
        Insert: {
          category: string
          description?: string | null
          id: string
          updated_at?: string | null
          updated_by?: string | null
          value: number
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "economy_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      friend_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          invited_email: string
          invited_user_id: string | null
          inviter_id: string
          referral_code: string | null
          status: string | null
          tier_granted: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_email: string
          invited_user_id?: string | null
          inviter_id: string
          referral_code?: string | null
          status?: string | null
          tier_granted: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_email?: string
          invited_user_id?: string | null
          inviter_id?: string
          referral_code?: string | null
          status?: string | null
          tier_granted?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          friend_id: string
          id: string
          status: Database["public"]["Enums"]["friendship_status"] | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"] | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: Database["public"]["Enums"]["friendship_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      game_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          receiver_id: string
          room_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          receiver_id: string
          room_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          receiver_id?: string
          room_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_invitations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_plays: {
        Row: {
          category_id: string | null
          game_type: string
          id: string
          level_number: number | null
          played_at: string
          room_id: string | null
          score: number | null
          stars_earned: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          game_type?: string
          id?: string
          level_number?: number | null
          played_at?: string
          room_id?: string | null
          score?: number | null
          stars_earned?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          game_type?: string
          id?: string
          level_number?: number | null
          played_at?: string
          room_id?: string | null
          score?: number | null
          stars_earned?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      game_rooms: {
        Row: {
          background_gradient: string | null
          category_id: string | null
          category_name: string | null
          challenge_expires_at: string | null
          challenged_user_id: string | null
          challenger_completed_at: string | null
          completed_at: string | null
          cover_image: string | null
          created_at: string | null
          current_game_id: string | null
          game_mode: string | null
          game_type: Database["public"]["Enums"]["game_type"]
          has_unread_activity: boolean | null
          host_is_observer: boolean | null
          host_user_id: string
          id: string
          is_archived: boolean | null
          is_permanent: boolean | null
          last_activity_at: string | null
          max_players: number | null
          min_players: number | null
          room_code: string
          room_icon: string | null
          room_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["room_status"] | null
          total_questions: number | null
          tv_session_id: string | null
          used_question_ids: string[] | null
          user_trivia_id: string | null
        }
        Insert: {
          background_gradient?: string | null
          category_id?: string | null
          category_name?: string | null
          challenge_expires_at?: string | null
          challenged_user_id?: string | null
          challenger_completed_at?: string | null
          completed_at?: string | null
          cover_image?: string | null
          created_at?: string | null
          current_game_id?: string | null
          game_mode?: string | null
          game_type?: Database["public"]["Enums"]["game_type"]
          has_unread_activity?: boolean | null
          host_is_observer?: boolean | null
          host_user_id: string
          id?: string
          is_archived?: boolean | null
          is_permanent?: boolean | null
          last_activity_at?: string | null
          max_players?: number | null
          min_players?: number | null
          room_code: string
          room_icon?: string | null
          room_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_status"] | null
          total_questions?: number | null
          tv_session_id?: string | null
          used_question_ids?: string[] | null
          user_trivia_id?: string | null
        }
        Update: {
          background_gradient?: string | null
          category_id?: string | null
          category_name?: string | null
          challenge_expires_at?: string | null
          challenged_user_id?: string | null
          challenger_completed_at?: string | null
          completed_at?: string | null
          cover_image?: string | null
          created_at?: string | null
          current_game_id?: string | null
          game_mode?: string | null
          game_type?: Database["public"]["Enums"]["game_type"]
          has_unread_activity?: boolean | null
          host_is_observer?: boolean | null
          host_user_id?: string
          id?: string
          is_archived?: boolean | null
          is_permanent?: boolean | null
          last_activity_at?: string | null
          max_players?: number | null
          min_players?: number | null
          room_code?: string
          room_icon?: string | null
          room_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_status"] | null
          total_questions?: number | null
          tv_session_id?: string | null
          used_question_ids?: string[] | null
          user_trivia_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_current_game_id_fkey"
            columns: ["current_game_id"]
            isOneToOne: false
            referencedRelation: "room_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_tv_session_id_fkey"
            columns: ["tv_session_id"]
            isOneToOne: false
            referencedRelation: "tv_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_user_trivia_id_fkey"
            columns: ["user_trivia_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          opponent_country: string
          opponent_name: string
          opponent_points: number
          opponent_score: number | null
          status: string | null
          total_questions: number | null
          user_id: string | null
          user_score: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          opponent_country: string
          opponent_name: string
          opponent_points: number
          opponent_score?: number | null
          status?: string | null
          total_questions?: number | null
          user_id?: string | null
          user_score?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          opponent_country?: string
          opponent_name?: string
          opponent_points?: number
          opponent_score?: number | null
          status?: string | null
          total_questions?: number | null
          user_id?: string | null
          user_score?: number | null
        }
        Relationships: []
      }
      gem_purchases: {
        Row: {
          amount_gel: number
          checkout_session_id: string | null
          completed_at: string | null
          created_at: string | null
          gems_received: number
          id: string
          payment_intent_id: string | null
          payment_provider: string | null
          product_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount_gel: number
          checkout_session_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          gems_received: number
          id?: string
          payment_intent_id?: string | null
          payment_provider?: string | null
          product_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount_gel?: number
          checkout_session_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          gems_received?: number
          id?: string
          payment_intent_id?: string | null
          payment_provider?: string | null
          product_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generation_job_questions: {
        Row: {
          category_id: string | null
          category_name: string | null
          correct_answer: string
          created_at: string | null
          difficulty: string
          duplicate_of: string | null
          icon_slug: string | null
          id: string
          incorrect_answers: Json
          is_duplicate: boolean | null
          job_id: string | null
          question_text: string
          status: string | null
          validation_warnings: string[] | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          correct_answer: string
          created_at?: string | null
          difficulty: string
          duplicate_of?: string | null
          icon_slug?: string | null
          id?: string
          incorrect_answers: Json
          is_duplicate?: boolean | null
          job_id?: string | null
          question_text: string
          status?: string | null
          validation_warnings?: string[] | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          correct_answer?: string
          created_at?: string | null
          difficulty?: string
          duplicate_of?: string | null
          icon_slug?: string | null
          id?: string
          incorrect_answers?: Json
          is_duplicate?: boolean | null
          job_id?: string | null
          question_text?: string
          status?: string | null
          validation_warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_job_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_job_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          approved_count: number | null
          auto_approve: boolean | null
          batch_size: number | null
          categories: Json
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_category_index: number | null
          current_category_progress: number | null
          difficulty_distribution: Json | null
          duplicate_count: number | null
          error_count: number | null
          error_log: string[] | null
          generated_count: number | null
          id: string
          interval_minutes: number | null
          language: string | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          started_at: string | null
          status: string | null
          target_count: number
          updated_at: string | null
        }
        Insert: {
          approved_count?: number | null
          auto_approve?: boolean | null
          batch_size?: number | null
          categories: Json
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_category_index?: number | null
          current_category_progress?: number | null
          difficulty_distribution?: Json | null
          duplicate_count?: number | null
          error_count?: number | null
          error_log?: string[] | null
          generated_count?: number | null
          id?: string
          interval_minutes?: number | null
          language?: string | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          started_at?: string | null
          status?: string | null
          target_count: number
          updated_at?: string | null
        }
        Update: {
          approved_count?: number | null
          auto_approve?: boolean | null
          batch_size?: number | null
          categories?: Json
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_category_index?: number | null
          current_category_progress?: number | null
          difficulty_distribution?: Json | null
          duplicate_count?: number | null
          error_count?: number | null
          error_log?: string[] | null
          generated_count?: number | null
          id?: string
          interval_minutes?: number | null
          language?: string | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          started_at?: string | null
          status?: string | null
          target_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      iap_products: {
        Row: {
          bonus_percentage: number | null
          coins_value: number | null
          created_at: string | null
          description: string | null
          gems_value: number | null
          id: string
          is_active: boolean | null
          is_subscription: boolean | null
          name: string
          platform: string | null
          price_gel: number | null
          price_usd: number
          sort_order: number | null
          subscription_duration_days: number | null
          updated_at: string | null
        }
        Insert: {
          bonus_percentage?: number | null
          coins_value?: number | null
          created_at?: string | null
          description?: string | null
          gems_value?: number | null
          id: string
          is_active?: boolean | null
          is_subscription?: boolean | null
          name: string
          platform?: string | null
          price_gel?: number | null
          price_usd: number
          sort_order?: number | null
          subscription_duration_days?: number | null
          updated_at?: string | null
        }
        Update: {
          bonus_percentage?: number | null
          coins_value?: number | null
          created_at?: string | null
          description?: string | null
          gems_value?: number | null
          id?: string
          is_active?: boolean | null
          is_subscription?: boolean | null
          name?: string
          platform?: string | null
          price_gel?: number | null
          price_usd?: number
          sort_order?: number | null
          subscription_duration_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      icon_assignment_history: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_method: string
          category_id: string | null
          category_name: string | null
          id: string
          new_icon_slug: string | null
          old_icon_slug: string | null
          question_id: string | null
          question_text: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_method: string
          category_id?: string | null
          category_name?: string | null
          id?: string
          new_icon_slug?: string | null
          old_icon_slug?: string | null
          question_id?: string | null
          question_text?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_method?: string
          category_id?: string | null
          category_name?: string | null
          id?: string
          new_icon_slug?: string | null
          old_icon_slug?: string | null
          question_id?: string | null
          question_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icon_assignment_history_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      icon_fix_history: {
        Row: {
          fixed_at: string
          fixed_by: string | null
          icon_slug: string
          id: string
          new_url: string
          old_url: string | null
        }
        Insert: {
          fixed_at?: string
          fixed_by?: string | null
          icon_slug: string
          id?: string
          new_url: string
          old_url?: string | null
        }
        Update: {
          fixed_at?: string
          fixed_by?: string | null
          icon_slug?: string
          id?: string
          new_url?: string
          old_url?: string | null
        }
        Relationships: []
      }
      icon_library: {
        Row: {
          category: string
          created_at: string | null
          file_name: string
          icon_url: string | null
          id: string
          slug: string
          tags: string[]
          title: string
          volume: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          file_name: string
          icon_url?: string | null
          id?: string
          slug: string
          tags?: string[]
          title: string
          volume?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          file_name?: string
          icon_url?: string | null
          id?: string
          slug?: string
          tags?: string[]
          title?: string
          volume?: number | null
        }
        Relationships: []
      }
      icon_verification_results: {
        Row: {
          created_at: string | null
          error_message: string | null
          icon_url: string
          id: string
          is_valid: boolean
          last_checked_at: string | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          icon_url: string
          id?: string
          is_valid?: boolean
          last_checked_at?: string | null
          slug: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          icon_url?: string
          id?: string
          is_valid?: boolean
          last_checked_at?: string | null
          slug?: string
        }
        Relationships: []
      }
      knowledge_sources: {
        Row: {
          content_summary: string | null
          created_at: string | null
          favicon_url: string | null
          id: string
          is_active: boolean | null
          title: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          content_summary?: string | null
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          content_summary?: string | null
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      leaderboard_badges: {
        Row: {
          badge_id: string
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          rank_requirement: number
        }
        Insert: {
          badge_id: string
          color: string
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          name: string
          rank_requirement: number
        }
        Update: {
          badge_id?: string
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          rank_requirement?: number
        }
        Relationships: []
      }
      leaderboard_exclusive_frames: {
        Row: {
          animation_class: string | null
          border_style: string
          created_at: string
          description: string | null
          frame_id: string
          gradient: string
          id: string
          name: string
          rank_requirement: number
          rarity: string
        }
        Insert: {
          animation_class?: string | null
          border_style: string
          created_at?: string
          description?: string | null
          frame_id: string
          gradient: string
          id?: string
          name: string
          rank_requirement: number
          rarity?: string
        }
        Update: {
          animation_class?: string | null
          border_style?: string
          created_at?: string
          description?: string | null
          frame_id?: string
          gradient?: string
          id?: string
          name?: string
          rank_requirement?: number
          rarity?: string
        }
        Relationships: []
      }
      level_positions: {
        Row: {
          created_at: string
          id: string
          level_id: number
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          id?: string
          level_id: number
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          id?: string
          level_id?: number
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_attempts: {
        Row: {
          attempted_at: string
          id: string
          success: boolean
          username: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          success?: boolean
          username: string
        }
        Update: {
          attempted_at?: string
          id?: string
          success?: boolean
          username?: string
        }
        Relationships: []
      }
      player_answers: {
        Row: {
          answer: string
          answered_at: string | null
          id: string
          is_correct: boolean
          points_earned: number
          question_index: number
          room_id: string | null
          time_remaining: number
          tv_session_id: string | null
          user_id: string
        }
        Insert: {
          answer: string
          answered_at?: string | null
          id?: string
          is_correct: boolean
          points_earned?: number
          question_index: number
          room_id?: string | null
          time_remaining: number
          tv_session_id?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          answered_at?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_index?: number
          room_id?: string | null
          time_remaining?: number
          tv_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_answers_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_answers_tv_session_id_fkey"
            columns: ["tv_session_id"]
            isOneToOne: false
            referencedRelation: "tv_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_group: string | null
          animated_avatar_url: string | null
          avatar_url: string | null
          best_streak: number | null
          coins: number
          country_code: string | null
          created_at: string
          current_streak: number | null
          games_played: number | null
          games_won: number | null
          gems: number
          has_face_photo: boolean | null
          id: string
          last_play_regen_at: string | null
          nickname: string
          preferred_language: string
          referral_code: string | null
          referred_by_invite_id: string | null
          region: string | null
          security_answer_hash: string | null
          security_question_id: number | null
          total_correct_answers: number | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: string | null
          animated_avatar_url?: string | null
          avatar_url?: string | null
          best_streak?: number | null
          coins?: number
          country_code?: string | null
          created_at?: string
          current_streak?: number | null
          games_played?: number | null
          games_won?: number | null
          gems?: number
          has_face_photo?: boolean | null
          id?: string
          last_play_regen_at?: string | null
          nickname: string
          preferred_language?: string
          referral_code?: string | null
          referred_by_invite_id?: string | null
          region?: string | null
          security_answer_hash?: string | null
          security_question_id?: number | null
          total_correct_answers?: number | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: string | null
          animated_avatar_url?: string | null
          avatar_url?: string | null
          best_streak?: number | null
          coins?: number
          country_code?: string | null
          created_at?: string
          current_streak?: number | null
          games_played?: number | null
          games_won?: number | null
          gems?: number
          has_face_photo?: boolean | null
          id?: string
          last_play_regen_at?: string | null
          nickname?: string
          preferred_language?: string
          referral_code?: string | null
          referred_by_invite_id?: string | null
          region?: string | null
          security_answer_hash?: string | null
          security_question_id?: number | null
          total_correct_answers?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_invite_id_fkey"
            columns: ["referred_by_invite_id"]
            isOneToOne: false
            referencedRelation: "friend_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_transactions: {
        Row: {
          amount_paid: number
          created_at: string | null
          currency_used: string
          id: string
          platform: string | null
          product_id: string | null
          product_type: string
          user_id: string | null
          value_received: Json
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          currency_used: string
          id?: string
          platform?: string | null
          product_id?: string | null
          product_type: string
          user_id?: string | null
          value_received: Json
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          currency_used?: string
          id?: string
          platform?: string | null
          product_id?: string | null
          product_type?: string
          user_id?: string | null
          value_received?: Json
        }
        Relationships: [
          {
            foreignKeyName: "purchase_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          ai_review_data: Json | null
          ai_review_grade: string | null
          ai_review_score: number | null
          answer_shorten_status: string | null
          audio_url: string | null
          category_id: string
          correct_answer: string
          created_at: string | null
          difficulty: string
          icon_slug: string | null
          id: string
          image_url: string | null
          in_production: boolean | null
          incorrect_answers: Json
          is_active: boolean | null
          language: string
          last_ai_review: string | null
          last_quality_check: string | null
          level_number: number | null
          original_correct_answer: string | null
          original_incorrect_answers: Json | null
          original_question_text: string | null
          pending_correct_answer: string | null
          pending_incorrect_answers: Json | null
          pending_question_text: string | null
          quality_issues: Json | null
          quality_status: string | null
          question_text: string
          shorten_status: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          ai_review_data?: Json | null
          ai_review_grade?: string | null
          ai_review_score?: number | null
          answer_shorten_status?: string | null
          audio_url?: string | null
          category_id: string
          correct_answer: string
          created_at?: string | null
          difficulty?: string
          icon_slug?: string | null
          id?: string
          image_url?: string | null
          in_production?: boolean | null
          incorrect_answers?: Json
          is_active?: boolean | null
          language?: string
          last_ai_review?: string | null
          last_quality_check?: string | null
          level_number?: number | null
          original_correct_answer?: string | null
          original_incorrect_answers?: Json | null
          original_question_text?: string | null
          pending_correct_answer?: string | null
          pending_incorrect_answers?: Json | null
          pending_question_text?: string | null
          quality_issues?: Json | null
          quality_status?: string | null
          question_text: string
          shorten_status?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          ai_review_data?: Json | null
          ai_review_grade?: string | null
          ai_review_score?: number | null
          answer_shorten_status?: string | null
          audio_url?: string | null
          category_id?: string
          correct_answer?: string
          created_at?: string | null
          difficulty?: string
          icon_slug?: string | null
          id?: string
          image_url?: string | null
          in_production?: boolean | null
          incorrect_answers?: Json
          is_active?: boolean | null
          language?: string
          last_ai_review?: string | null
          last_quality_check?: string | null
          level_number?: number | null
          original_correct_answer?: string | null
          original_incorrect_answers?: Json | null
          original_question_text?: string | null
          pending_correct_answer?: string | null
          pending_incorrect_answers?: Json | null
          pending_question_text?: string | null
          quality_issues?: Json | null
          quality_status?: string | null
          question_text?: string
          shorten_status?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_collections: {
        Row: {
          cover_gradient: string
          cover_image: string | null
          created_at: string | null
          description: string | null
          hashtags: string[] | null
          id: string
          is_public: boolean
          likes_count: number | null
          plays_count: number | null
          saves_count: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_gradient?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          hashtags?: string[] | null
          id?: string
          is_public?: boolean
          likes_count?: number | null
          plays_count?: number | null
          saves_count?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_gradient?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          hashtags?: string[] | null
          id?: string
          is_public?: boolean
          likes_count?: number | null
          plays_count?: number | null
          saves_count?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_post_plays: {
        Row: {
          id: string
          played_at: string
          post_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          id?: string
          played_at?: string
          post_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          id?: string
          played_at?: string
          post_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_post_plays_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_post_saves: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "user_quiz_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      room_category_queue: {
        Row: {
          category_id: string | null
          category_name: string | null
          created_at: string | null
          icon_slug: string | null
          id: string
          position: number
          room_id: string
          source_type: string
          user_trivia_id: string | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          icon_slug?: string | null
          id?: string
          position: number
          room_id: string
          source_type: string
          user_trivia_id?: string | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string | null
          icon_slug?: string | null
          id?: string
          position?: number
          room_id?: string
          source_type?: string
          user_trivia_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_category_queue_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_chat_messages: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          message: string
          nickname: string
          room_id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          message: string
          nickname: string
          room_id: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          message?: string
          nickname?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_games: {
        Row: {
          completed_at: string | null
          created_at: string
          game_number: number
          id: string
          player_scores: Json
          questions_data: Json
          room_id: string
          started_at: string
          winner_user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          game_number?: number
          id?: string
          player_scores?: Json
          questions_data?: Json
          room_id: string
          started_at?: string
          winner_user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          game_number?: number
          id?: string
          player_scores?: Json
          questions_data?: Json
          room_id?: string
          started_at?: string
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_match_history: {
        Row: {
          id: string
          played_at: string | null
          player_scores: Json
          room_id: string
          winner_user_id: string | null
        }
        Insert: {
          id?: string
          played_at?: string | null
          player_scores?: Json
          room_id: string
          winner_user_id?: string | null
        }
        Update: {
          id?: string
          played_at?: string | null
          player_scores?: Json
          room_id?: string
          winner_user_id?: string | null
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          current_question: number | null
          has_seen_results: boolean | null
          id: string
          is_host: boolean | null
          joined_at: string | null
          last_played_at: string | null
          last_read_at: string | null
          nickname: string
          room_id: string
          score: number | null
          status: Database["public"]["Enums"]["participant_status"] | null
          total_rounds_played: number | null
          total_score: number | null
          total_wins: number | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          current_question?: number | null
          has_seen_results?: boolean | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          last_played_at?: string | null
          last_read_at?: string | null
          nickname: string
          room_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["participant_status"] | null
          total_rounds_played?: number | null
          total_score?: number | null
          total_wins?: number | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          current_question?: number | null
          has_seen_results?: boolean | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          last_played_at?: string | null
          last_read_at?: string | null
          nickname?: string
          room_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["participant_status"] | null
          total_rounds_played?: number | null
          total_score?: number | null
          total_wins?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_questions: {
        Row: {
          audio_url: string | null
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          game_id: string | null
          icon_slug: string | null
          id: string
          image_url: string | null
          incorrect_answers: Json
          question_index: number
          question_text: string
          room_id: string
          shuffled_answers: string[] | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          game_id?: string | null
          icon_slug?: string | null
          id?: string
          image_url?: string | null
          incorrect_answers: Json
          question_index: number
          question_text: string
          room_id: string
          shuffled_answers?: string[] | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          game_id?: string | null
          icon_slug?: string | null
          id?: string
          image_url?: string | null
          incorrect_answers?: Json
          question_index?: number
          question_text?: string
          room_id?: string
          shuffled_answers?: string[] | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_questions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "room_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_questions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          badge: string | null
          category: string
          created_at: string | null
          currency: string
          description_key: string | null
          gradient: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_popular: boolean | null
          name_key: string
          original_price: number | null
          price: number
          sort_order: number | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          badge?: string | null
          category: string
          created_at?: string | null
          currency: string
          description_key?: string | null
          gradient?: string | null
          icon_url?: string | null
          id: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
          name_key: string
          original_price?: number | null
          price: number
          sort_order?: number | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string | null
          currency?: string
          description_key?: string | null
          gradient?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
          name_key?: string
          original_price?: number | null
          price?: number
          sort_order?: number | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      trivia_drafts: {
        Row: {
          created_at: string
          draft_type: string | null
          id: string
          questions: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_type?: string | null
          id?: string
          questions?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_type?: string | null
          id?: string
          questions?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trivia_facts: {
        Row: {
          created_at: string | null
          fact_text: string
          id: string
          image_type: string | null
          is_active: boolean | null
          source: string | null
          votes_didnt_know: number | null
          votes_knew: number | null
        }
        Insert: {
          created_at?: string | null
          fact_text: string
          id?: string
          image_type?: string | null
          is_active?: boolean | null
          source?: string | null
          votes_didnt_know?: number | null
          votes_knew?: number | null
        }
        Update: {
          created_at?: string | null
          fact_text?: string
          id?: string
          image_type?: string | null
          is_active?: boolean | null
          source?: string | null
          votes_didnt_know?: number | null
          votes_knew?: number | null
        }
        Relationships: []
      }
      tv_answer_rejections: {
        Row: {
          attempted_index: number
          id: number
          live_index: number | null
          live_status: string | null
          player_id: string
          reason: string
          rejected_at: string
          tv_session_id: string
        }
        Insert: {
          attempted_index: number
          id?: number
          live_index?: number | null
          live_status?: string | null
          player_id: string
          reason: string
          rejected_at?: string
          tv_session_id: string
        }
        Update: {
          attempted_index?: number
          id?: number
          live_index?: number | null
          live_status?: string | null
          player_id?: string
          reason?: string
          rejected_at?: string
          tv_session_id?: string
        }
        Relationships: []
      }
      tv_observer_awards: {
        Row: {
          awarded_at: string
          points: number
          question_index: number
          suggester_id: string
          tv_session_id: string
        }
        Insert: {
          awarded_at?: string
          points?: number
          question_index: number
          suggester_id: string
          tv_session_id: string
        }
        Update: {
          awarded_at?: string
          points?: number
          question_index?: number
          suggester_id?: string
          tv_session_id?: string
        }
        Relationships: []
      }
      tv_phase_events: {
        Row: {
          answer_count: number | null
          at: string
          from_status: string | null
          id: number
          question_index: number | null
          question_start_time: string | null
          reveal_start_time: string | null
          to_status: string | null
          tv_session_id: string
        }
        Insert: {
          answer_count?: number | null
          at?: string
          from_status?: string | null
          id?: number
          question_index?: number | null
          question_start_time?: string | null
          reveal_start_time?: string | null
          to_status?: string | null
          tv_session_id: string
        }
        Update: {
          answer_count?: number | null
          at?: string
          from_status?: string | null
          id?: number
          question_index?: number | null
          question_start_time?: string | null
          reveal_start_time?: string | null
          to_status?: string | null
          tv_session_id?: string
        }
        Relationships: []
      }
      tv_players: {
        Row: {
          avatar_url: string | null
          current_round_score: number | null
          id: string
          is_active: boolean | null
          is_authenticated: boolean | null
          is_host: boolean | null
          is_ready: boolean | null
          joined_at: string | null
          nickname: string
          player_id: string
          questions_answered: number | null
          rounds_played: number | null
          total_score: number | null
          tv_session_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          current_round_score?: number | null
          id?: string
          is_active?: boolean | null
          is_authenticated?: boolean | null
          is_host?: boolean | null
          is_ready?: boolean | null
          joined_at?: string | null
          nickname: string
          player_id: string
          questions_answered?: number | null
          rounds_played?: number | null
          total_score?: number | null
          tv_session_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          current_round_score?: number | null
          id?: string
          is_active?: boolean | null
          is_authenticated?: boolean | null
          is_host?: boolean | null
          is_ready?: boolean | null
          joined_at?: string | null
          nickname?: string
          player_id?: string
          questions_answered?: number | null
          rounds_played?: number | null
          total_score?: number | null
          tv_session_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_players_tv_session_id_fkey"
            columns: ["tv_session_id"]
            isOneToOne: false
            referencedRelation: "tv_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_poll_suggestions: {
        Row: {
          avatar_url: string | null
          category_id: string | null
          category_name: string
          cover_image: string | null
          created_at: string | null
          icon_slug: string | null
          id: string
          nickname: string
          session_id: string
          source_type: string
          user_id: string
          user_trivia_id: string | null
          vote_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          category_id?: string | null
          category_name: string
          cover_image?: string | null
          created_at?: string | null
          icon_slug?: string | null
          id?: string
          nickname: string
          session_id: string
          source_type: string
          user_id: string
          user_trivia_id?: string | null
          vote_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          category_id?: string | null
          category_name?: string
          cover_image?: string | null
          created_at?: string | null
          icon_slug?: string | null
          id?: string
          nickname?: string
          session_id?: string
          source_type?: string
          user_id?: string
          user_trivia_id?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_poll_suggestions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tv_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_poll_votes: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_poll_votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tv_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_poll_votes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "tv_poll_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_round_history: {
        Row: {
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          player_scores: Json
          round_number: number
          started_at: string | null
          total_questions: number | null
          tv_session_id: string
        }
        Insert: {
          category_icon?: string | null
          category_id?: string | null
          category_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          player_scores?: Json
          round_number: number
          started_at?: string | null
          total_questions?: number | null
          tv_session_id: string
        }
        Update: {
          category_icon?: string | null
          category_id?: string | null
          category_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          player_scores?: Json
          round_number?: number
          started_at?: string | null
          total_questions?: number | null
          tv_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_round_history_tv_session_id_fkey"
            columns: ["tv_session_id"]
            isOneToOne: false
            referencedRelation: "tv_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_score_events: {
        Row: {
          at: string
          id: number
          is_correct: boolean | null
          nickname: string | null
          player_id: string
          points: number | null
          prev_points: number | null
          question_index: number
          roster_missing: boolean
          round_number: number | null
          running_total: number | null
          tv_session_id: string
        }
        Insert: {
          at?: string
          id?: number
          is_correct?: boolean | null
          nickname?: string | null
          player_id: string
          points?: number | null
          prev_points?: number | null
          question_index: number
          roster_missing?: boolean
          round_number?: number | null
          running_total?: number | null
          tv_session_id: string
        }
        Update: {
          at?: string
          id?: number
          is_correct?: boolean | null
          nickname?: string | null
          player_id?: string
          points?: number | null
          prev_points?: number | null
          question_index?: number
          roster_missing?: boolean
          round_number?: number | null
          running_total?: number | null
          tv_session_id?: string
        }
        Relationships: []
      }
      tv_session_queue: {
        Row: {
          category_id: string | null
          category_name: string | null
          created_at: string
          icon_slug: string | null
          id: string
          position: number
          session_id: string
          source_type: string
          suggester_avatar_url: string | null
          suggester_nickname: string | null
          suggester_user_id: string | null
          user_trivia_id: string | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          icon_slug?: string | null
          id?: string
          position: number
          session_id: string
          source_type?: string
          suggester_avatar_url?: string | null
          suggester_nickname?: string | null
          suggester_user_id?: string | null
          user_trivia_id?: string | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          icon_slug?: string | null
          id?: string
          position?: number
          session_id?: string
          source_type?: string
          suggester_avatar_url?: string | null
          suggester_nickname?: string | null
          suggester_user_id?: string | null
          user_trivia_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_session_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tv_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_sessions: {
        Row: {
          accumulated_scores: Json | null
          active_player_count: number | null
          category_icon: string | null
          category_name: string | null
          created_at: string | null
          current_question_index: number | null
          current_round_suggester_avatar_url: string | null
          current_round_suggester_id: string | null
          current_round_suggester_nickname: string | null
          expires_at: string | null
          game_name: string | null
          host_user_id: string | null
          id: string
          is_paired: boolean | null
          pairing_code: string | null
          poll_duration: number | null
          poll_start_time: string | null
          question_start_time: string | null
          questions: Json | null
          reveal_answer_count: number | null
          reveal_start_time: string | null
          room_id: string | null
          room_name: string | null
          round_number: number | null
          status: string | null
          total_rounds: number | null
          total_rounds_played: number | null
          tv_pairing_code: string | null
        }
        Insert: {
          accumulated_scores?: Json | null
          active_player_count?: number | null
          category_icon?: string | null
          category_name?: string | null
          created_at?: string | null
          current_question_index?: number | null
          current_round_suggester_avatar_url?: string | null
          current_round_suggester_id?: string | null
          current_round_suggester_nickname?: string | null
          expires_at?: string | null
          game_name?: string | null
          host_user_id?: string | null
          id?: string
          is_paired?: boolean | null
          pairing_code?: string | null
          poll_duration?: number | null
          poll_start_time?: string | null
          question_start_time?: string | null
          questions?: Json | null
          reveal_answer_count?: number | null
          reveal_start_time?: string | null
          room_id?: string | null
          room_name?: string | null
          round_number?: number | null
          status?: string | null
          total_rounds?: number | null
          total_rounds_played?: number | null
          tv_pairing_code?: string | null
        }
        Update: {
          accumulated_scores?: Json | null
          active_player_count?: number | null
          category_icon?: string | null
          category_name?: string | null
          created_at?: string | null
          current_question_index?: number | null
          current_round_suggester_avatar_url?: string | null
          current_round_suggester_id?: string | null
          current_round_suggester_nickname?: string | null
          expires_at?: string | null
          game_name?: string | null
          host_user_id?: string | null
          id?: string
          is_paired?: boolean | null
          pairing_code?: string | null
          poll_duration?: number | null
          poll_start_time?: string | null
          question_start_time?: string | null
          questions?: Json | null
          reveal_answer_count?: number | null
          reveal_start_time?: string | null
          room_id?: string | null
          room_name?: string | null
          round_number?: number | null
          status?: string | null
          total_rounds?: number | null
          total_rounds_played?: number | null
          tv_pairing_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_avatar_frames: {
        Row: {
          created_at: string
          frame_id: string
          id: string
          is_equipped: boolean | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frame_id: string
          id?: string
          is_equipped?: boolean | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frame_id?: string
          id?: string
          is_equipped?: boolean | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      user_category_last_seen: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          last_notified_at: string | null
          last_seen_total_levels: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          last_notified_at?: string | null
          last_seen_total_levels?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          last_notified_at?: string | null
          last_seen_total_levels?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_last_seen_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_category_progress: {
        Row: {
          category_id: string
          completed: boolean | null
          completed_at: string | null
          country_code: string
          created_at: string
          id: string
          questions_answered: number | null
          questions_correct: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          completed?: boolean | null
          completed_at?: string | null
          country_code: string
          created_at?: string
          id?: string
          questions_answered?: number | null
          questions_correct?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          completed?: boolean | null
          completed_at?: string | null
          country_code?: string
          created_at?: string
          id?: string
          questions_answered?: number | null
          questions_correct?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_country_progress: {
        Row: {
          categories_completed: number | null
          continent_id: string
          country_code: string
          created_at: string
          id: string
          total_categories: number | null
          unlocked: boolean | null
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categories_completed?: number | null
          continent_id: string
          country_code: string
          created_at?: string
          id?: string
          total_categories?: number | null
          unlocked?: boolean | null
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categories_completed?: number | null
          continent_id?: string
          country_code?: string
          created_at?: string
          id?: string
          total_categories?: number | null
          unlocked?: boolean | null
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_plays: {
        Row: {
          ads_watched_today: number | null
          created_at: string
          id: string
          last_ad_watched_at: string | null
          last_regen_at: string | null
          play_date: string
          plays_from_ads: number
          plays_regenerated: number | null
          plays_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ads_watched_today?: number | null
          created_at?: string
          id?: string
          last_ad_watched_at?: string | null
          last_regen_at?: string | null
          play_date?: string
          plays_from_ads?: number
          plays_regenerated?: number | null
          plays_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ads_watched_today?: number | null
          created_at?: string
          id?: string
          last_ad_watched_at?: string | null
          last_regen_at?: string | null
          play_date?: string
          plays_from_ads?: number
          plays_regenerated?: number | null
          plays_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_rewards: {
        Row: {
          chest_claimed: boolean | null
          chest_claimed_at: string | null
          created_at: string | null
          daily_claimed: boolean | null
          daily_claimed_at: string | null
          id: string
          reward_date: string
          streak_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chest_claimed?: boolean | null
          chest_claimed_at?: string | null
          created_at?: string | null
          daily_claimed?: boolean | null
          daily_claimed_at?: string | null
          id?: string
          reward_date?: string
          streak_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chest_claimed?: boolean | null
          chest_claimed_at?: string | null
          created_at?: string | null
          daily_claimed?: boolean | null
          daily_claimed_at?: string | null
          id?: string
          reward_date?: string
          streak_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_daily_spins: {
        Row: {
          created_at: string
          id: string
          max_spins: number
          spin_date: string
          spins_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_spins?: number
          spin_date?: string
          spins_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_spins?: number
          spin_date?: string
          spins_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_vip_rewards: {
        Row: {
          created_at: string | null
          id: string
          powers_claimed: boolean | null
          reward_date: string
          spins_granted: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          powers_claimed?: boolean | null
          reward_date?: string
          spins_granted?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          powers_claimed?: boolean | null
          reward_date?: string
          spins_granted?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_fact_votes: {
        Row: {
          created_at: string | null
          fact_id: string
          id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          fact_id: string
          id?: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          fact_id?: string
          id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_fact_votes_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "trivia_facts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_leaderboard_badges: {
        Row: {
          badge_id: string
          category_id: string
          category_name: string | null
          created_at: string
          earned_at: string
          id: string
          times_earned: number
          user_id: string
          week_earned: string
        }
        Insert: {
          badge_id: string
          category_id: string
          category_name?: string | null
          created_at?: string
          earned_at?: string
          id?: string
          times_earned?: number
          user_id: string
          week_earned: string
        }
        Update: {
          badge_id?: string
          category_id?: string
          category_name?: string | null
          created_at?: string
          earned_at?: string
          id?: string
          times_earned?: number
          user_id?: string
          week_earned?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_leaderboard_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_badges"
            referencedColumns: ["badge_id"]
          },
          {
            foreignKeyName: "user_leaderboard_badges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_leaderboard_frames: {
        Row: {
          category_id: string
          created_at: string
          earned_at: string
          frame_id: string
          id: string
          is_equipped: boolean | null
          user_id: string
          week_earned: string
        }
        Insert: {
          category_id: string
          created_at?: string
          earned_at?: string
          frame_id: string
          id?: string
          is_equipped?: boolean | null
          user_id: string
          week_earned: string
        }
        Update: {
          category_id?: string
          created_at?: string
          earned_at?: string
          frame_id?: string
          id?: string
          is_equipped?: boolean | null
          user_id?: string
          week_earned?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_leaderboard_frames_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_leaderboard_frames_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_exclusive_frames"
            referencedColumns: ["frame_id"]
          },
        ]
      }
      user_league_data: {
        Row: {
          created_at: string | null
          current_rank: number | null
          current_xp: number | null
          id: string
          last_visited_at: string | null
          league_tier: number | null
          previous_rank: number | null
          updated_at: string | null
          user_id: string
          week_start_date: string | null
          weekly_xp: number | null
        }
        Insert: {
          created_at?: string | null
          current_rank?: number | null
          current_xp?: number | null
          id?: string
          last_visited_at?: string | null
          league_tier?: number | null
          previous_rank?: number | null
          updated_at?: string | null
          user_id: string
          week_start_date?: string | null
          weekly_xp?: number | null
        }
        Update: {
          created_at?: string | null
          current_rank?: number | null
          current_xp?: number | null
          id?: string
          last_visited_at?: string | null
          league_tier?: number | null
          previous_rank?: number | null
          updated_at?: string | null
          user_id?: string
          week_start_date?: string | null
          weekly_xp?: number | null
        }
        Relationships: []
      }
      user_level_progress: {
        Row: {
          category_id: string
          completed_at: string
          created_at: string
          id: string
          level_number: number
          score: number
          stars_earned: number
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          completed_at?: string
          created_at?: string
          id?: string
          level_number: number
          score?: number
          stars_earned?: number
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          level_number?: number
          score?: number
          stars_earned?: number
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mission_streaks: {
        Row: {
          best_streak: number
          created_at: string
          current_streak: number
          id: string
          last_completion_date: string | null
          streak_bonus_claimed: boolean
          total_completions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          streak_bonus_claimed?: boolean
          total_completions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_completion_date?: string | null
          streak_bonus_claimed?: boolean
          total_completions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_missions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          mission_date: string
          mission_description: string | null
          mission_id: string
          mission_title: string
          mission_type: string
          reward_claimed: boolean
          reward_coins: number
          reward_gems: number
          reward_power_up: string | null
          reward_power_up_count: number
          reward_xp: number
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          mission_date?: string
          mission_description?: string | null
          mission_id: string
          mission_title: string
          mission_type?: string
          reward_claimed?: boolean
          reward_coins?: number
          reward_gems?: number
          reward_power_up?: string | null
          reward_power_up_count?: number
          reward_xp?: number
          target_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          mission_date?: string
          mission_description?: string | null
          mission_id?: string
          mission_title?: string
          mission_type?: string
          reward_claimed?: boolean
          reward_coins?: number
          reward_gems?: number
          reward_power_up?: string | null
          reward_power_up_count?: number
          reward_xp?: number
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_power_ups: {
        Row: {
          created_at: string | null
          id: string
          power_up_type: string
          quantity: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          power_up_type: string
          quantity?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          power_up_type?: string
          quantity?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          country_code: string | null
          current_page: string | null
          id: string
          last_seen: string | null
          status: string
          user_id: string
        }
        Insert: {
          country_code?: string | null
          current_page?: string | null
          id?: string
          last_seen?: string | null
          status?: string
          user_id: string
        }
        Update: {
          country_code?: string | null
          current_page?: string | null
          id?: string
          last_seen?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_quiz_posts: {
        Row: {
          answer_format: string
          collection_id: string | null
          cover_gradient: string
          cover_image: string | null
          created_at: string | null
          description: string | null
          hashtags: string[] | null
          icon_slug: string | null
          id: string
          is_blind: boolean
          is_public: boolean
          likes_count: number | null
          plays_count: number | null
          question_count: number
          questions: Json
          round_number: number | null
          saves_count: number | null
          subject: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer_format: string
          collection_id?: string | null
          cover_gradient: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          hashtags?: string[] | null
          icon_slug?: string | null
          id?: string
          is_blind?: boolean
          is_public?: boolean
          likes_count?: number | null
          plays_count?: number | null
          question_count: number
          questions?: Json
          round_number?: number | null
          saves_count?: number | null
          subject: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answer_format?: string
          collection_id?: string | null
          cover_gradient?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          hashtags?: string[] | null
          icon_slug?: string | null
          id?: string
          is_blind?: boolean
          is_public?: boolean
          likes_count?: number | null
          plays_count?: number | null
          question_count?: number
          questions?: Json
          round_number?: number | null
          saves_count?: number | null
          subject?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_posts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "quiz_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          message_id: string | null
          report_type: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          room_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          message_id?: string | null
          report_type: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          message_id?: string | null
          report_type?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          claimed_at: string
          created_at: string
          id: string
          reward_type: string
          reward_value: Json
          user_id: string
        }
        Insert: {
          claimed_at?: string
          created_at?: string
          id?: string
          reward_type: string
          reward_value?: Json
          user_id: string
        }
        Update: {
          claimed_at?: string
          created_at?: string
          id?: string
          reward_type?: string
          reward_value?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          entry_page: string | null
          exit_page: string | null
          id: string
          is_bounce: boolean | null
          os: string | null
          pages_visited: number | null
          screen_height: number | null
          screen_width: number | null
          session_end: string | null
          session_start: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          is_bounce?: boolean | null
          os?: string | null
          pages_visited?: number | null
          screen_height?: number | null
          screen_width?: number | null
          session_end?: string | null
          session_start?: string
          user_id: string
        }
        Update: {
          browser?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          entry_page?: string | null
          exit_page?: string | null
          id?: string
          is_bounce?: boolean | null
          os?: string | null
          pages_visited?: number | null
          screen_height?: number | null
          screen_width?: number | null
          session_end?: string | null
          session_start?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_subscriptions: {
        Row: {
          apple_original_transaction_id: string | null
          apple_product_id: string | null
          auto_renew: boolean | null
          created_at: string
          expires_at: string
          friend_invites_remaining: number | null
          id: string
          purchase_platform: string | null
          started_at: string
          updated_at: string
          user_id: string
          vip_tier: string
        }
        Insert: {
          apple_original_transaction_id?: string | null
          apple_product_id?: string | null
          auto_renew?: boolean | null
          created_at?: string
          expires_at: string
          friend_invites_remaining?: number | null
          id?: string
          purchase_platform?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
          vip_tier?: string
        }
        Update: {
          apple_original_transaction_id?: string | null
          apple_product_id?: string | null
          auto_renew?: boolean | null
          created_at?: string
          expires_at?: string
          friend_invites_remaining?: number | null
          id?: string
          purchase_platform?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
          vip_tier?: string
        }
        Relationships: []
      }
      weekly_leaderboard_snapshots: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          created_at: string
          games_played: number
          games_won: number
          id: string
          nickname: string
          rank: number
          snapshot_date: string
          total_points: number
          user_id: string
          week_number: number
          year: number
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          games_played?: number
          games_won?: number
          id?: string
          nickname: string
          rank: number
          snapshot_date?: string
          total_points?: number
          user_id: string
          week_number: number
          year: number
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          games_played?: number
          games_won?: number
          id?: string
          nickname?: string
          rank?: number
          snapshot_date?: string
          total_points?: number
          user_id?: string
          week_number?: number
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_power_up: {
        Args: { p_delta: number; p_type: string }
        Returns: number
      }
      award_tv_observer_bonus: {
        Args: { p_question_index: number; p_session_id: string }
        Returns: Json
      }
      format_display_name: { Args: { full_name: string }; Returns: string }
      generate_challenge_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_room_code: { Args: never; Returns: string }
      get_category_question_counts: {
        Args: never
        Returns: {
          category_id: string
          production_count: number
          question_count: number
        }[]
      }
      get_league_leaderboard: {
        Args: { p_limit?: number; p_region?: string; p_tier: number }
        Returns: {
          avatar_url: string
          coins: number
          country_code: string
          current_rank: number
          nickname: string
          previous_rank: number
          user_id: string
          weekly_xp: number
        }[]
      }
      get_questions_sorted_by_length: {
        Args: {
          p_category_id?: string
          p_difficulty?: string
          p_has_icon?: string
          p_in_production?: boolean
          p_language?: string
          p_limit?: number
          p_offset?: number
          p_question_type?: string
          p_sort_mode?: string
        }
        Returns: {
          audio_url: string
          category_id: string
          correct_answer: string
          created_at: string
          difficulty: string
          icon_slug: string
          id: string
          image_url: string
          in_production: boolean
          incorrect_answers: Json
          is_active: boolean
          level_number: number
          question_text: string
          total_count: number
          updated_at: string
          video_url: string
        }[]
      }
      get_unread_counts_by_room: {
        Args: { p_rooms: Json; p_user_id: string }
        Returns: {
          room_id: string
          unread_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_participant_score: {
        Args: { p_delta: number; p_room_id: string }
        Returns: undefined
      }
      increment_quiz_plays: { Args: { post_id: string }; Returns: undefined }
      is_tv_session_participant: {
        Args: { p_player_identifier: string; p_session_id: string }
        Returns: boolean
      }
      process_referral_reward: {
        Args: { p_invite_id: string; p_new_user_id: string }
        Returns: undefined
      }
      reset_room_participants: {
        Args: { p_room_id: string; p_status?: string }
        Returns: undefined
      }
      reset_tv_session_scores: { Args: { p_session_id: string }; Returns: Json }
      search_questions: {
        Args: {
          p_category_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          audio_url: string
          category_id: string
          correct_answer: string
          created_at: string
          difficulty: string
          icon_slug: string
          id: string
          image_url: string
          in_production: boolean
          incorrect_answers: Json
          is_active: boolean
          level_number: number
          question_text: string
          total_count: number
          updated_at: string
          video_url: string
        }[]
      }
      submit_tv_answer: {
        Args: {
          p_answer: string
          p_avatar_url?: string
          p_is_correct: boolean
          p_nickname?: string
          p_player_id: string
          p_points: number
          p_question_index: number
          p_session_id: string
          p_time_remaining: number
        }
        Returns: Json
      }
      tv_advance_question: { Args: { p_session_id: string }; Returns: Json }
      tv_claim_session: {
        Args: {
          p_category_icon?: string
          p_category_name?: string
          p_pairing_code: string
          p_room_id?: string
          p_room_name?: string
        }
        Returns: Json
      }
      tv_expire_question: {
        Args: { p_question_time?: number; p_session_id: string }
        Returns: Json
      }
      update_user_currency: {
        Args: {
          p_coins_delta?: number
          p_gems_delta?: number
          p_user_id: string
        }
        Returns: {
          new_coins: number
          new_gems: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      friendship_status: "pending" | "accepted" | "blocked"
      game_type: "realtime" | "async"
      participant_status:
        | "invited"
        | "joined"
        | "ready"
        | "playing"
        | "finished"
        | "disconnected"
      room_status: "waiting" | "ready" | "playing" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      friendship_status: ["pending", "accepted", "blocked"],
      game_type: ["realtime", "async"],
      participant_status: [
        "invited",
        "joined",
        "ready",
        "playing",
        "finished",
        "disconnected",
      ],
      room_status: ["waiting", "ready", "playing", "completed", "cancelled"],
    },
  },
} as const
