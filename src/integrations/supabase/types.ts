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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
