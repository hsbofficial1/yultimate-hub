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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance_badges: {
        Row: {
          id: string
          child_id: string
          badge_type: string
          milestone_sessions: number
          earned_at: string
          notified: boolean
          notified_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          badge_type: string
          milestone_sessions: number
          earned_at?: string
          notified?: boolean
          notified_at?: string | null
        }
        Update: {
          id?: string
          child_id?: string
          badge_type?: string
          milestone_sessions?: number
          earned_at?: string
          notified?: boolean
          notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_streaks: {
        Row: {
          id: string
          child_id: string
          current_streak: number
          longest_streak: number
          last_session_date: string | null
          streak_started_date: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          current_streak?: number
          longest_streak?: number
          last_session_date?: string | null
          streak_started_date?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          current_streak?: number
          longest_streak?: number
          last_session_date?: string | null
          streak_started_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_streaks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      absence_alerts: {
        Row: {
          id: string
          child_id: string
          session_id: string | null
          consecutive_absences: number
          alert_type: string
          message: string | null
          created_at: string
          acknowledged: boolean
          acknowledged_by: string | null
          acknowledged_at: string | null
          resolved: boolean
          resolved_by: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          session_id?: string | null
          consecutive_absences?: number
          alert_type?: string
          message?: string | null
          created_at?: string
          acknowledged?: boolean
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
        }
        Update: {
          id?: string
          child_id?: string
          session_id?: string | null
          consecutive_absences?: number
          alert_type?: string
          message?: string | null
          created_at?: string
          acknowledged?: boolean
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absence_alerts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_alerts: {
        Row: {
          id: string
          child_id: string
          assessment_type: string
          days_overdue: number
          message: string | null
          created_at: string
          acknowledged: boolean
          acknowledged_by: string | null
          acknowledged_at: string | null
          resolved: boolean
          resolved_by: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          assessment_type: string
          days_overdue: number
          message?: string | null
          created_at?: string
          acknowledged?: boolean
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
        }
        Update: {
          id?: string
          child_id?: string
          assessment_type?: string
          days_overdue?: number
          message?: string | null
          created_at?: string
          acknowledged?: boolean
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_alerts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          child_id: string
          id: string
          marked_at: string
          present: boolean
          session_id: string
          synced: boolean
        }
        Insert: {
          child_id: string
          id?: string
          marked_at?: string
          present: boolean
          session_id: string
          synced?: boolean
        }
        Update: {
          child_id?: string
          id?: string
          marked_at?: string
          present?: boolean
          session_id?: string
          synced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          active: boolean
          age: number
          community: string | null
          created_at: string
          gender: string
          id: string
          join_date: string
          medical_notes: string | null
          name: string
          parent_name: string
          parent_phone: string
          parent_whatsapp: string | null
          photo_url: string | null
          school: string | null
        }
        Insert: {
          active?: boolean
          age: number
          community?: string | null
          created_at?: string
          gender: string
          id?: string
          join_date?: string
          medical_notes?: string | null
          name: string
          parent_name: string
          parent_phone: string
          parent_whatsapp?: string | null
          photo_url?: string | null
          school?: string | null
        }
        Update: {
          active?: boolean
          age?: number
          community?: string | null
          created_at?: string
          gender?: string
          id?: string
          join_date?: string
          medical_notes?: string | null
          name?: string
          parent_name?: string
          parent_phone?: string
          parent_whatsapp?: string | null
          photo_url?: string | null
          school?: string | null
        }
        Relationships: []
      }
      child_program_enrollments: {
        Row: {
          id: string
          child_id: string
          program_id: string | null
          program_type: string | null
          enrollment_date: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          program_id?: string | null
          program_type?: string | null
          enrollment_date?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          program_id?: string | null
          program_type?: string | null
          enrollment_date?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_program_enrollments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      child_transfer_history: {
        Row: {
          id: string
          child_id: string
          from_program_id: string | null
          to_program_id: string | null
          from_program_type: string | null
          to_program_type: string | null
          transfer_date: string
          reason: string | null
          transferred_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          from_program_id?: string | null
          to_program_id?: string | null
          from_program_type?: string | null
          to_program_type?: string | null
          transfer_date: string
          reason?: string | null
          transferred_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          from_program_id?: string | null
          to_program_id?: string | null
          from_program_type?: string | null
          to_program_type?: string | null
          transfer_date?: string
          reason?: string | null
          transferred_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_transfer_history_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_transfer_history_from_program_id_fkey"
            columns: ["from_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_transfer_history_to_program_id_fkey"
            columns: ["to_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_transfer_history_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          field: string
          id: string
          notes: string | null
          scheduled_time: string
          status: string
          team_a_id: string
          team_a_score: number
          team_b_id: string
          team_b_score: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          field: string
          id?: string
          notes?: string | null
          scheduled_time: string
          status?: string
          team_a_id: string
          team_a_score?: number
          team_b_id: string
          team_b_score?: number
          tournament_id: string
          updated_at?: string
        }
        Update: {
          field?: string
          id?: string
          notes?: string | null
          scheduled_time?: string
          status?: string
          team_a_id?: string
          team_a_score?: number
          team_b_id?: string
          team_b_score?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      lsas_assessments: {
        Row: {
          id: string
          child_id: string
          assessment_date: string
          assessment_type: string
          assessed_by: string | null
          physical_score: number
          physical_notes: string | null
          social_score: number
          social_notes: string | null
          emotional_score: number
          emotional_notes: string | null
          cognitive_score: number
          cognitive_notes: string | null
          overall_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          child_id: string
          assessment_date: string
          assessment_type: string
          assessed_by?: string | null
          physical_score: number
          physical_notes?: string | null
          social_score: number
          social_notes?: string | null
          emotional_score: number
          emotional_notes?: string | null
          cognitive_score: number
          cognitive_notes?: string | null
          overall_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          assessment_date?: string
          assessment_type?: string
          assessed_by?: string | null
          physical_score?: number
          physical_notes?: string | null
          social_score?: number
          social_notes?: string | null
          emotional_score?: number
          emotional_notes?: string | null
          cognitive_score?: number
          cognitive_notes?: string | null
          overall_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lsas_assessments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lsas_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          id: string
          name: string
          program_type: string
          description: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          program_type: string
          description?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          program_type?: string
          description?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          coach_id: string
          created_at: string
          date: string
          id: string
          location: string
          notes: string | null
          program_type: string
          time: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          date: string
          id?: string
          location: string
          notes?: string | null
          program_type: string
          time: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          date?: string
          id?: string
          location?: string
          notes?: string | null
          program_type?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spirit_scores: {
        Row: {
          attitude: number
          comments: string | null
          communication: number
          fairness: number
          fouls: number
          from_team_id: string
          id: string
          match_id: string
          rules: number
          submitted_at: string
          to_team_id: string
          total: number | null
        }
        Insert: {
          attitude: number
          comments?: string | null
          communication: number
          fairness: number
          fouls: number
          from_team_id: string
          id?: string
          match_id: string
          rules: number
          submitted_at?: string
          to_team_id: string
          total?: number | null
        }
        Update: {
          attitude?: number
          comments?: string | null
          communication?: number
          fairness?: number
          fouls?: number
          from_team_id?: string
          id?: string
          match_id?: string
          rules?: number
          submitted_at?: string
          to_team_id?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spirit_scores_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spirit_scores_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spirit_scores_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_players: {
        Row: {
          age: number
          email: string
          gender: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          age: number
          email: string
          gender: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          age?: number
          email?: string
          gender?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string
          created_at: string
          email: string
          id: string
          logo_url: string | null
          name: string
          phone: string
          status: string
          tournament_id: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          email: string
          id?: string
          logo_url?: string | null
          name: string
          phone: string
          status?: string
          tournament_id: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          location: string
          max_teams: number
          name: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          location: string
          max_teams?: number
          name: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          location?: string
          max_teams?: number
          name?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      child_assessment_timeline: {
        Row: {
          id: string
          child_id: string
          child_name: string
          assessment_date: string
          assessment_type: string
          physical_score: number
          social_score: number
          emotional_score: number
          cognitive_score: number
          average_score: number
          physical_notes: string | null
          social_notes: string | null
          emotional_notes: string | null
          cognitive_notes: string | null
          overall_notes: string | null
          assessed_by: string | null
          assessor_name: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
      cohort_assessment_averages: {
        Row: {
          assessment_date: string
          assessment_type: string
          age: number | null
          program_type: string | null
          avg_physical: number
          avg_social: number
          avg_emotional: number
          avg_cognitive: number
          avg_overall: number
          cohort_size: number
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      get_child_assessment_progress: {
        Args: { _child_id: string }
        Returns: {
          assessment_date: string
          assessment_type: string
          physical_score: number
          social_score: number
          emotional_score: number
          cognitive_score: number
          average_score: number
          cohort_physical: number | null
          cohort_social: number | null
          cohort_emotional: number | null
          cohort_cognitive: number | null
          cohort_average: number | null
        }[]
      }
    }
    Enums: {
      assessment_type:
        | "baseline"
        | "endline"
        | "periodic"
      user_role:
        | "admin"
        | "tournament_director"
        | "team_captain"
        | "player"
        | "coach"
        | "program_manager"
        | "volunteer"
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
      assessment_type: [
        "baseline",
        "endline",
        "periodic",
      ],
      user_role: [
        "admin",
        "tournament_director",
        "team_captain",
        "player",
        "coach",
        "program_manager",
        "volunteer",
      ],
    },
  },
} as const
