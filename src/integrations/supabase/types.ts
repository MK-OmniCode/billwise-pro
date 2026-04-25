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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bills: {
        Row: {
          bill_date: string
          bill_no: string
          cgst_amount: number
          cgst_percent: number
          challan_ids: Json
          created_at: string
          id: string
          igst_amount: number
          igst_percent: number
          items: Json
          notes: string | null
          party_id: string | null
          party_snapshot: Json
          sgst_amount: number
          sgst_percent: number
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_date?: string
          bill_no: string
          cgst_amount?: number
          cgst_percent?: number
          challan_ids?: Json
          created_at?: string
          id?: string
          igst_amount?: number
          igst_percent?: number
          items?: Json
          notes?: string | null
          party_id?: string | null
          party_snapshot?: Json
          sgst_amount?: number
          sgst_percent?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_date?: string
          bill_no?: string
          cgst_amount?: number
          cgst_percent?: number
          challan_ids?: Json
          created_at?: string
          id?: string
          igst_amount?: number
          igst_percent?: number
          items?: Json
          notes?: string | null
          party_id?: string | null
          party_snapshot?: Json
          sgst_amount?: number
          sgst_percent?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      bills_given: {
        Row: {
          amount: number
          bill_no: string
          created_at: string
          given_date: string
          id: string
          notes: string | null
          party_id: string | null
          party_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          bill_no?: string
          created_at?: string
          given_date?: string
          id?: string
          notes?: string | null
          party_id?: string | null
          party_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_no?: string
          created_at?: string
          given_date?: string
          id?: string
          notes?: string | null
          party_id?: string | null
          party_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challans: {
        Row: {
          billed: boolean
          challan_date: string
          challan_no: string
          created_at: string
          id: string
          items: Json
          party_id: string | null
          party_snapshot: Json
          remark: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billed?: boolean
          challan_date?: string
          challan_no: string
          created_at?: string
          id?: string
          items?: Json
          party_id?: string | null
          party_snapshot?: Json
          remark?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billed?: boolean
          challan_date?: string
          challan_no?: string
          created_at?: string
          id?: string
          items?: Json
          party_id?: string | null
          party_snapshot?: Json
          remark?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challans_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          bill_prefix: string
          cgst_percent: number
          challan_prefix: string
          company_name: string
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          igst_percent: number
          phone: string | null
          sgst_percent: number
          signature_label: string | null
          updated_at: string
          use_igst: boolean
          user_id: string
        }
        Insert: {
          address?: string | null
          bill_prefix?: string
          cgst_percent?: number
          challan_prefix?: string
          company_name?: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          igst_percent?: number
          phone?: string | null
          sgst_percent?: number
          signature_label?: string | null
          updated_at?: string
          use_igst?: boolean
          user_id: string
        }
        Update: {
          address?: string | null
          bill_prefix?: string
          cgst_percent?: number
          challan_prefix?: string
          company_name?: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          igst_percent?: number
          phone?: string | null
          sgst_percent?: number
          signature_label?: string | null
          updated_at?: string
          use_igst?: boolean
          user_id?: string
        }
        Relationships: []
      }
      parties: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments_received: {
        Row: {
          amount: number
          created_at: string
          id: string
          mode: string
          notes: string | null
          party_id: string | null
          party_name: string
          payment_date: string
          reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          mode?: string
          notes?: string | null
          party_id?: string | null
          party_name?: string
          payment_date?: string
          reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mode?: string
          notes?: string | null
          party_id?: string | null
          party_name?: string
          payment_date?: string
          reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          created_at: string
          exact_weight: number | null
          id: string
          label: string | null
          match_type: string
          max_weight: number
          min_weight: number
          rate_per_kg: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exact_weight?: number | null
          id?: string
          label?: string | null
          match_type?: string
          max_weight: number
          min_weight: number
          rate_per_kg: number
          user_id: string
        }
        Update: {
          created_at?: string
          exact_weight?: number | null
          id?: string
          label?: string | null
          match_type?: string
          max_weight?: number
          min_weight?: number
          rate_per_kg?: number
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
