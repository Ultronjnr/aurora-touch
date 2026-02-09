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
      handshakes: {
        Row: {
          amount: number
          amount_paid: number | null
          auto_payback: boolean | null
          completed_at: string | null
          created_at: string | null
          days_late: number | null
          grace_period_days: number | null
          id: string
          late_fee: number | null
          payback_day: string
          payment_completed_at: string | null
          payment_initiated_at: string | null
          payment_status: string | null
          penalty_accepted: boolean | null
          penalty_amount: number | null
          penalty_enabled: boolean | null
          penalty_type: string | null
          requester_id: string
          status: string | null
          supporter_id: string
          transaction_fee: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          auto_payback?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          days_late?: number | null
          grace_period_days?: number | null
          id?: string
          late_fee?: number | null
          payback_day: string
          payment_completed_at?: string | null
          payment_initiated_at?: string | null
          payment_status?: string | null
          penalty_accepted?: boolean | null
          penalty_amount?: number | null
          penalty_enabled?: boolean | null
          penalty_type?: string | null
          requester_id: string
          status?: string | null
          supporter_id: string
          transaction_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          auto_payback?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          days_late?: number | null
          grace_period_days?: number | null
          id?: string
          late_fee?: number | null
          payback_day?: string
          payment_completed_at?: string | null
          payment_initiated_at?: string | null
          payment_status?: string | null
          penalty_accepted?: boolean | null
          penalty_amount?: number | null
          penalty_enabled?: boolean | null
          penalty_type?: string | null
          requester_id?: string
          status?: string | null
          supporter_id?: string
          transaction_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handshakes_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handshakes_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          data: Json | null
          handshake_id: string | null
          id: string
          message: string
          read: boolean | null
          sent_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          data?: Json | null
          handshake_id?: string | null
          id?: string
          message: string
          read?: boolean | null
          sent_at?: string | null
          title?: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          data?: Json | null
          handshake_id?: string | null
          id?: string
          message?: string
          read?: boolean | null
          sent_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_handshake_id_fkey"
            columns: ["handshake_id"]
            isOneToOne: false
            referencedRelation: "handshakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          handshake_id: string
          id: string
          payment_method: string | null
          payment_status: string | null
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          handshake_id: string
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          handshake_id?: string
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_handshake_id_fkey"
            columns: ["handshake_id"]
            isOneToOne: false
            referencedRelation: "handshakes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_number: string | null
          account_type: string | null
          avatar_url: string | null
          branch_code: string | null
          cash_rating: number | null
          created_at: string | null
          full_name: string
          id: string
          id_document_url: string | null
          id_verified: boolean | null
          kyc_completed: boolean | null
          phone: string | null
          subscription_active: boolean | null
          unique_code: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          avatar_url?: string | null
          branch_code?: string | null
          cash_rating?: number | null
          created_at?: string | null
          full_name: string
          id: string
          id_document_url?: string | null
          id_verified?: boolean | null
          kyc_completed?: boolean | null
          phone?: string | null
          subscription_active?: boolean | null
          unique_code: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          avatar_url?: string | null
          branch_code?: string | null
          cash_rating?: number | null
          created_at?: string | null
          full_name?: string
          id?: string
          id_document_url?: string | null
          id_verified?: boolean | null
          kyc_completed?: boolean | null
          phone?: string | null
          subscription_active?: boolean | null
          unique_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_overdue_payments: { Args: never; Returns: undefined }
      check_payment_reminders: { Args: never; Returns: undefined }
      generate_unique_code: { Args: never; Returns: string }
      get_outstanding_balance: {
        Args: { handshake_id: string }
        Returns: number
      }
      get_safe_profile: {
        Args: { profile_id: string }
        Returns: {
          avatar_url: string
          cash_rating: number
          full_name: string
          id: string
          id_verified: boolean
          kyc_completed: boolean
          unique_code: string
        }[]
      }
      get_safe_profiles_batch: {
        Args: { profile_ids: string[] }
        Returns: {
          avatar_url: string
          cash_rating: number
          full_name: string
          id: string
          id_verified: boolean
          kyc_completed: boolean
          unique_code: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_profiles: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          cash_rating: number
          full_name: string
          id: string
          id_verified: boolean
          kyc_completed: boolean
          unique_code: string
        }[]
      }
      update_cash_rating: {
        Args: { days_late: number; user_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "requester" | "supporter"
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
      app_role: ["requester", "supporter"],
    },
  },
} as const
