export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      onboarding_flows: {
        Row: {
          amount: string
          created_at: string | null
          from_chain_id: number
          from_token_address: string
          id: string
          lifi_route: Json | null
          status: string | null
          to_token_address: string
          tx_hashes: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: string
          created_at?: string | null
          from_chain_id: number
          from_token_address: string
          id?: string
          lifi_route?: Json | null
          status?: string | null
          to_token_address: string
          tx_hashes?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: string
          created_at?: string | null
          from_chain_id?: number
          from_token_address?: string
          id?: string
          lifi_route?: Json | null
          status?: string | null
          to_token_address?: string
          tx_hashes?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_flows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      salt_accounts: {
        Row: {
          created_at: string | null
          id: string
          salt_account_address: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          salt_account_address: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          salt_account_address?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salt_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      salt_policies: {
        Row: {
          allowed_pairs: Json | null
          created_at: string | null
          id: string
          max_daily_notional_usd: number | null
          max_drawdown_pct: number | null
          max_leverage: number | null
          salt_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_pairs?: Json | null
          created_at?: string | null
          id?: string
          max_daily_notional_usd?: number | null
          max_drawdown_pct?: number | null
          max_leverage?: number | null
          salt_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_pairs?: Json | null
          created_at?: string | null
          id?: string
          max_daily_notional_usd?: number | null
          max_drawdown_pct?: number | null
          max_leverage?: number | null
          salt_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salt_policies_salt_account_id_fkey"
            columns: ["salt_account_id"]
            isOneToOne: false
            referencedRelation: "salt_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      salt_strategies: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          params: Json | null
          salt_account_id: string | null
          strategy_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          params?: Json | null
          salt_account_id?: string | null
          strategy_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          params?: Json | null
          salt_account_id?: string | null
          strategy_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salt_strategies_salt_account_id_fkey"
            columns: ["salt_account_id"]
            isOneToOne: false
            referencedRelation: "salt_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_runs: {
        Row: {
          completed_at: string | null
          error: string | null
          id: string
          result: Json | null
          started_at: string | null
          status: string | null
          strategy_id: string | null
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
          strategy_id?: string | null
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
          strategy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_runs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "salt_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          mode: string
          narrative_id: string
          pear_order_payload: Json | null
          pear_response: Json | null
          risk_profile: string
          stake_usd: number
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          mode: string
          narrative_id: string
          pear_order_payload?: Json | null
          pear_response?: Json | null
          risk_profile: string
          stake_usd: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          mode?: string
          narrative_id?: string
          pear_order_payload?: Json | null
          pear_response?: Json | null
          risk_profile?: string
          stake_usd?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          wallet_address?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
