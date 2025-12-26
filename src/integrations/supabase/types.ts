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
      avatar_generations: {
        Row: {
          avatar_url: string
          created_at: string
          id: string
          is_current: boolean | null
          source_image_url: string | null
          user_id: string
        }
        Insert: {
          avatar_url: string
          created_at?: string
          id?: string
          is_current?: boolean | null
          source_image_url?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          id?: string
          is_current?: boolean | null
          source_image_url?: string | null
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
      game_rooms: {
        Row: {
          category_id: string | null
          category_name: string | null
          completed_at: string | null
          created_at: string | null
          host_user_id: string
          id: string
          max_players: number | null
          min_players: number | null
          room_code: string
          started_at: string | null
          status: Database["public"]["Enums"]["room_status"] | null
          total_questions: number | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          host_user_id: string
          id?: string
          max_players?: number | null
          min_players?: number | null
          room_code: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_status"] | null
          total_questions?: number | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          host_user_id?: string
          id?: string
          max_players?: number | null
          min_players?: number | null
          room_code?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_status"] | null
          total_questions?: number | null
        }
        Relationships: []
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
      player_answers: {
        Row: {
          answer: string
          answered_at: string | null
          id: string
          is_correct: boolean
          points_earned: number
          question_index: number
          room_id: string
          time_remaining: number
          user_id: string
        }
        Insert: {
          answer: string
          answered_at?: string | null
          id?: string
          is_correct: boolean
          points_earned?: number
          question_index: number
          room_id: string
          time_remaining: number
          user_id: string
        }
        Update: {
          answer?: string
          answered_at?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_index?: number
          room_id?: string
          time_remaining?: number
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number | null
          country_code: string | null
          created_at: string
          current_streak: number | null
          games_played: number | null
          games_won: number | null
          id: string
          nickname: string
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number | null
          country_code?: string | null
          created_at?: string
          current_streak?: number | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          nickname: string
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number | null
          country_code?: string | null
          created_at?: string
          current_streak?: number | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          nickname?: string
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          current_question: number | null
          id: string
          is_host: boolean | null
          joined_at: string | null
          nickname: string
          room_id: string
          score: number | null
          status: Database["public"]["Enums"]["participant_status"] | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          current_question?: number | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          nickname: string
          room_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["participant_status"] | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          current_question?: number | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          nickname?: string
          room_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["participant_status"] | null
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
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          id: string
          incorrect_answers: Json
          question_index: number
          question_text: string
          room_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          incorrect_answers: Json
          question_index: number
          question_text: string
          room_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          incorrect_answers?: Json
          question_index?: number
          question_text?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_questions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
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
          reward_xp?: number
          target_value?: number
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_room_code: { Args: never; Returns: string }
    }
    Enums: {
      friendship_status: "pending" | "accepted" | "blocked"
      participant_status:
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
      friendship_status: ["pending", "accepted", "blocked"],
      participant_status: [
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
