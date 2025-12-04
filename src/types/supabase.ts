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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_options: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_discount: boolean
          is_enabled: boolean
          label: string
          price: number
          updated_at: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_discount?: boolean
          is_enabled?: boolean
          label: string
          price?: number
          updated_at?: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_discount?: boolean
          is_enabled?: boolean
          label?: string
          price?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_timetable_orders: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          deadline: string | null
          depositor_name: string | null
          design_keywords: string | null
          email_discord: string
          has_character_images: boolean
          id: string
          order_requirements: string
          price_quoted: number | null
          selected_options: Json | null
          status: string | null
          updated_at: string | null
          user_id: number
          wants_omakase: boolean
          youtube_sns_address: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          deadline?: string | null
          depositor_name?: string | null
          design_keywords?: string | null
          email_discord: string
          has_character_images?: boolean
          id?: string
          order_requirements: string
          price_quoted?: number | null
          selected_options?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: number
          wants_omakase?: boolean
          youtube_sns_address: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          deadline?: string | null
          depositor_name?: string | null
          design_keywords?: string | null
          email_discord?: string
          has_character_images?: boolean
          id?: string
          order_requirements?: string
          price_quoted?: number | null
          selected_options?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: number
          wants_omakase?: boolean
          youtube_sns_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_timetable_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          created_by: number | null
          file_category: string | null
          file_key: string
          file_size: number
          id: string
          mime_type: string
          order_id: string | null
          original_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: number | null
          file_category?: string | null
          file_key: string
          file_size: number
          id?: string
          mime_type: string
          order_id?: string | null
          original_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: number | null
          file_category?: string | null
          file_key?: string
          file_size?: number
          id?: string
          mime_type?: string
          order_id?: string | null
          original_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "custom_timetable_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_custom_orders: {
        Row: {
          created_at: string | null
          deadline: string | null
          email: string
          id: string
          nickname: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          email: string
          id?: string
          nickname: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          email?: string
          id?: string
          nickname?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      price_options: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_discount: boolean
          is_enabled: boolean
          label: string
          price: number
          updated_at: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_discount?: boolean
          is_enabled?: boolean
          label: string
          price?: number
          updated_at?: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_discount?: boolean
          is_enabled?: boolean
          label?: string
          price?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          message: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          message?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          message?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      relations_team_template_and_team: {
        Row: {
          created_at: string
          id: string
          team_id: string
          team_template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          team_template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          team_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relations_team_template_and_team_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relations_team_template_and_team_team_template_id_fkey"
            columns: ["team_template_id"]
            isOneToOne: false
            referencedRelation: "team_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_templates: {
        Row: {
          created_at: string | null
          detailed_description: string | null
          features: string[] | null
          id: string
          is_artist: boolean | null
          is_guerrilla: boolean | null
          is_memo: boolean | null
          is_multi_schedule: boolean | null
          is_offline_memo: boolean | null
          is_shop_visible: boolean | null
          purchase_instructions: string | null
          requirements: string | null
          template_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          detailed_description?: string | null
          features?: string[] | null
          id?: string
          is_artist?: boolean | null
          is_guerrilla?: boolean | null
          is_memo?: boolean | null
          is_multi_schedule?: boolean | null
          is_offline_memo?: boolean | null
          is_shop_visible?: boolean | null
          purchase_instructions?: string | null
          requirements?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          detailed_description?: string | null
          features?: string[] | null
          id?: string
          is_artist?: boolean | null
          is_guerrilla?: boolean | null
          is_memo?: boolean | null
          is_multi_schedule?: boolean | null
          is_offline_memo?: boolean | null
          is_shop_visible?: boolean | null
          purchase_instructions?: string | null
          requirements?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          role: string | null
          team_id: string
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id: string
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_schedules: {
        Row: {
          created_at: string | null
          id: string
          schedule_data: Json
          updated_at: string | null
          user_id: number
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          schedule_data?: Json
          updated_at?: string | null
          user_id: number
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          schedule_data?: Json
          updated_at?: string | null
          user_id?: number
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_templates: {
        Row: {
          created_at: string
          descriptions: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descriptions?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descriptions?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_access: {
        Row: {
          access_level: string
          granted_at: string
          granted_by: number
          id: string
          template_id: string
          template_plan_id: string | null
          user_id: number
        }
        Insert: {
          access_level?: string
          granted_at?: string
          granted_by: number
          id?: string
          template_id: string
          template_plan_id?: string | null
          user_id: number
        }
        Update: {
          access_level?: string
          granted_at?: string
          granted_by?: number
          id?: string
          template_id?: string
          template_plan_id?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_access_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_access_template_plan_id_fkey"
            columns: ["template_plan_id"]
            isOneToOne: false
            referencedRelation: "template_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_plans: {
        Row: {
          created_at: string | null
          id: string
          is_artist: boolean | null
          is_guerrilla: boolean | null
          is_memo: boolean | null
          is_multi_schedule: boolean | null
          is_offline_memo: boolean | null
          plan: string
          price: number | null
          shop_template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_artist?: boolean | null
          is_guerrilla?: boolean | null
          is_memo?: boolean | null
          is_multi_schedule?: boolean | null
          is_offline_memo?: boolean | null
          plan?: string
          price?: number | null
          shop_template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_artist?: boolean | null
          is_guerrilla?: boolean | null
          is_memo?: boolean | null
          is_multi_schedule?: boolean | null
          is_offline_memo?: boolean | null
          plan?: string
          price?: number | null
          shop_template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_template_plans_shop_template"
            columns: ["shop_template_id"]
            isOneToOne: false
            referencedRelation: "shop_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_products: {
        Row: {
          created_at: string | null
          features: string[] | null
          id: string
          price: number
          purchase_instructions: string | null
          requirements: string | null
          template_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: string[] | null
          id?: string
          price: number
          purchase_instructions?: string | null
          requirements?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: string[] | null
          id?: string
          price?: number
          purchase_instructions?: string | null
          requirements?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_products_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_purchase_requests: {
        Row: {
          created_at: string | null
          customer_phone: string | null
          depositor_name: string | null
          id: string
          message: string | null
          plan_id: string | null
          status: string
          template_id: string
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          customer_phone?: string | null
          depositor_name?: string | null
          id?: string
          message?: string | null
          plan_id?: string | null
          status?: string
          template_id: string
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          customer_phone?: string | null
          depositor_name?: string | null
          id?: string
          message?: string | null
          plan_id?: string | null
          status?: string
          template_id?: string
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_purchase_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "template_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_purchase_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_purchase_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          description: string
          detailed_description: string | null
          id: string
          is_public: boolean
          is_shop_visible: boolean
          name: string
          thumbnail_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          detailed_description?: string | null
          id?: string
          is_public?: boolean
          is_shop_visible?: boolean
          name: string
          thumbnail_url?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          detailed_description?: string | null
          id?: string
          is_public?: boolean
          is_shop_visible?: boolean
          name?: string
          thumbnail_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      thumbnails: {
        Row: {
          created_at: string
          description: string
          detailed_description: string | null
          id: string
          is_public: boolean
          is_shop_visible: boolean
          name: string
          thumbnail_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          detailed_description?: string | null
          id?: string
          is_public?: boolean
          is_shop_visible?: boolean
          name: string
          thumbnail_url?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          detailed_description?: string | null
          id?: string
          is_public?: boolean
          is_shop_visible?: boolean
          name?: string
          thumbnail_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          type: string
          updated_at: string | null
          used: boolean | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          type: string
          updated_at?: string | null
          used?: boolean | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          type?: string
          updated_at?: string | null
          used?: boolean | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: number
          name: string
          password: string
          role: string | null
          twitter_access_token: string | null
          twitter_access_token_secret: string | null
          twitter_connected_at: string | null
          twitter_user_id: string | null
          twitter_username: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          name: string
          password: string
          role?: string | null
          twitter_access_token?: string | null
          twitter_access_token_secret?: string | null
          twitter_connected_at?: string | null
          twitter_user_id?: string | null
          twitter_username?: string | null
          updated_at: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          name?: string
          password?: string
          role?: string | null
          twitter_access_token?: string | null
          twitter_access_token_secret?: string | null
          twitter_connected_at?: string | null
          twitter_user_id?: string | null
          twitter_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_tokens: { Args: never; Returns: undefined }
      get_current_user_id: { Args: never; Returns: number }
      has_template_access: {
        Args: { p_template_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
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
