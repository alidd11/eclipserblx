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
      abandoned_carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          recovered: boolean
          recovered_at: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          recovered?: boolean
          recovered_at?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          recovered?: boolean
          recovered_at?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_ping_purchase_log: {
        Row: {
          created_at: string | null
          everyone_pings: number | null
          here_pings: number | null
          id: string
          reference_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          everyone_pings?: number | null
          here_pings?: number | null
          id?: string
          reference_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          everyone_pings?: number | null
          here_pings?: number | null
          id?: string
          reference_id?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_schedule_slots: {
        Row: {
          ad_id: string | null
          booked_at: string | null
          created_at: string
          id: string
          slot_date: string
          slot_time: string
          tier: string
          user_id: string | null
        }
        Insert: {
          ad_id?: string | null
          booked_at?: string | null
          created_at?: string
          id?: string
          slot_date: string
          slot_time: string
          tier?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string | null
          booked_at?: string | null
          created_at?: string
          id?: string
          slot_date?: string
          slot_time?: string
          tier?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_schedule_slots_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "discord_advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_pinned: boolean
          message: string
          pinned_by: string | null
          reply_to_id: string | null
          thread_parent_id: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          message: string
          pinned_by?: string | null
          reply_to_id?: string | null
          thread_parent_id?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          message?: string
          pinned_by?: string | null
          reply_to_id?: string | null
          thread_parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "admin_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_chat_messages_thread_parent_id_fkey"
            columns: ["thread_parent_id"]
            isOneToOne: false
            referencedRelation: "admin_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisement_clicks: {
        Row: {
          advertisement_id: string
          clicked_at: string
          country: string | null
          device_type: string | null
          id: string
          referrer: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          advertisement_id: string
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          advertisement_id?: string
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisement_clicks_advertisement_id_fkey"
            columns: ["advertisement_id"]
            isOneToOne: false
            referencedRelation: "discord_advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisement_subscriptions: {
        Row: {
          ads_reset_at: string | null
          ads_used_this_month: number | null
          billing_period: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          everyone_pings_balance: number | null
          here_pings_balance: number | null
          id: string
          partnership_pings_balance: number
          payment_method: string | null
          roblox_subscription_id: string | null
          roblox_user_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ads_reset_at?: string | null
          ads_used_this_month?: number | null
          billing_period?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          everyone_pings_balance?: number | null
          here_pings_balance?: number | null
          id?: string
          partnership_pings_balance?: number
          payment_method?: string | null
          roblox_subscription_id?: string | null
          roblox_user_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ads_reset_at?: string | null
          ads_used_this_month?: number | null
          billing_period?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          everyone_pings_balance?: number | null
          here_pings_balance?: number | null
          id?: string
          partnership_pings_balance?: number
          payment_method?: string | null
          roblox_subscription_id?: string | null
          roblox_user_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      advertisement_tiers: {
        Row: {
          ads_per_month: number
          annual_price_gbp: number
          created_at: string
          description: string | null
          display_order: number | null
          everyone_ping_price_gbp: number | null
          features: Json | null
          here_ping_price_gbp: number | null
          id: string
          is_active: boolean | null
          max_images: number
          monthly_price_gbp: number
          name: string
          stripe_annual_price_id: string | null
          stripe_monthly_price_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          ads_per_month?: number
          annual_price_gbp: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          everyone_ping_price_gbp?: number | null
          features?: Json | null
          here_ping_price_gbp?: number | null
          id?: string
          is_active?: boolean | null
          max_images?: number
          monthly_price_gbp: number
          name: string
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          ads_per_month?: number
          annual_price_gbp?: number
          created_at?: string
          description?: string | null
          display_order?: number | null
          everyone_ping_price_gbp?: number | null
          features?: Json | null
          here_ping_price_gbp?: number | null
          id?: string
          is_active?: boolean | null
          max_images?: number
          monthly_price_gbp?: number
          name?: string
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_balances: {
        Row: {
          available_balance: number
          total_clicks: number | null
          total_earned: number
          total_paid: number
          total_signups: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          total_clicks?: number | null
          total_earned?: number
          total_paid?: number
          total_signups?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          total_clicks?: number | null
          total_earned?: number
          total_paid?: number
          total_signups?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          order_id: string
          order_total: number
          referred_user_id: string
          refund_id: string | null
          reversed_at: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          commission_amount: number
          commission_rate?: number
          created_at?: string
          id?: string
          order_id: string
          order_total: number
          referred_user_id: string
          refund_id?: string | null
          reversed_at?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          order_id?: string
          order_total?: number
          referred_user_id?: string
          refund_id?: string | null
          reversed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payout_method: string | null
          paypal_email: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          stripe_account_id: string | null
          stripe_transfer_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payout_method?: string | null
          paypal_email?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payout_method?: string | null
          paypal_email?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_response_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          function_name: string
          id: string
          response: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          function_name: string
          id?: string
          response: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          id?: string
          response?: Json
        }
        Relationships: []
      }
      app_version: {
        Row: {
          force_update: boolean
          id: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          force_update?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          force_update?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      applicant_messages: {
        Row: {
          application_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          sent_by: string | null
          subject: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          sent_by?: string | null
          subject: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          sent_by?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          action_category: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          action_category?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          action_category?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string
          display_order: number | null
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category: string
          color?: string
          created_at?: string
          description: string
          display_order?: number | null
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string
          display_order?: number | null
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      bot_afk_status: {
        Row: {
          afk_since: string
          guild_id: string
          id: string
          reason: string | null
          user_discord_id: string
        }
        Insert: {
          afk_since?: string
          guild_id: string
          id?: string
          reason?: string | null
          user_discord_id: string
        }
        Update: {
          afk_since?: string
          guild_id?: string
          id?: string
          reason?: string | null
          user_discord_id?: string
        }
        Relationships: []
      }
      bot_auto_roles: {
        Row: {
          created_at: string
          delay_seconds: number | null
          enabled: boolean
          guild_id: string
          id: string
          role_id: string
          role_name: string | null
        }
        Insert: {
          created_at?: string
          delay_seconds?: number | null
          enabled?: boolean
          guild_id: string
          id?: string
          role_id: string
          role_name?: string | null
        }
        Update: {
          created_at?: string
          delay_seconds?: number | null
          enabled?: boolean
          guild_id?: string
          id?: string
          role_id?: string
          role_name?: string | null
        }
        Relationships: []
      }
      bot_automod_heat: {
        Row: {
          created_at: string
          decay_at: string | null
          guild_id: string
          heat_points: number
          id: string
          last_infraction_at: string
          user_discord_id: string
        }
        Insert: {
          created_at?: string
          decay_at?: string | null
          guild_id: string
          heat_points?: number
          id?: string
          last_infraction_at?: string
          user_discord_id: string
        }
        Update: {
          created_at?: string
          decay_at?: string | null
          guild_id?: string
          heat_points?: number
          id?: string
          last_infraction_at?: string
          user_discord_id?: string
        }
        Relationships: []
      }
      bot_automod_rules: {
        Row: {
          action: string
          config: Json
          created_at: string
          enabled: boolean
          guild_id: string
          heat_points: number
          id: string
          name: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          action?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          guild_id: string
          heat_points?: number
          id?: string
          name: string
          rule_type?: string
          updated_at?: string
        }
        Update: {
          action?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          guild_id?: string
          heat_points?: number
          id?: string
          name?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_command_settings: {
        Row: {
          command_name: string
          description: string | null
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          command_name: string
          description?: string | null
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          command_name?: string
          description?: string | null
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_command_usage: {
        Row: {
          command_name: string
          guild_id: string | null
          id: string
          used_at: string
          user_discord_id: string | null
        }
        Insert: {
          command_name: string
          guild_id?: string | null
          id?: string
          used_at?: string
          user_discord_id?: string | null
        }
        Update: {
          command_name?: string
          guild_id?: string | null
          id?: string
          used_at?: string
          user_discord_id?: string | null
        }
        Relationships: []
      }
      bot_custom_commands: {
        Row: {
          allowed_roles: string[] | null
          cooldown_seconds: number | null
          created_at: string
          created_by: string | null
          embed_config: Json | null
          enabled: boolean
          guild_id: string
          id: string
          response: string
          trigger: string
          trigger_type: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          allowed_roles?: string[] | null
          cooldown_seconds?: number | null
          created_at?: string
          created_by?: string | null
          embed_config?: Json | null
          enabled?: boolean
          guild_id: string
          id?: string
          response: string
          trigger: string
          trigger_type?: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          allowed_roles?: string[] | null
          cooldown_seconds?: number | null
          created_at?: string
          created_by?: string | null
          embed_config?: Json | null
          enabled?: boolean
          guild_id?: string
          id?: string
          response?: string
          trigger?: string
          trigger_type?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      bot_error_logs: {
        Row: {
          context: string
          created_at: string
          error_message: string
          id: string
          metadata: Json | null
          stack_trace: string | null
        }
        Insert: {
          context: string
          created_at?: string
          error_message: string
          id?: string
          metadata?: Json | null
          stack_trace?: string | null
        }
        Update: {
          context?: string
          created_at?: string
          error_message?: string
          id?: string
          metadata?: Json | null
          stack_trace?: string | null
        }
        Relationships: []
      }
      bot_giveaways: {
        Row: {
          channel_id: string
          created_at: string
          created_by: string
          description: string | null
          ended: boolean | null
          ends_at: string
          entries: Json | null
          guild_id: string
          id: string
          message_id: string | null
          prize: string
          required_role_id: string | null
          title: string
          winner_ids: string[] | null
          winners_count: number
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ended?: boolean | null
          ends_at: string
          entries?: Json | null
          guild_id: string
          id?: string
          message_id?: string | null
          prize: string
          required_role_id?: string | null
          title: string
          winner_ids?: string[] | null
          winners_count?: number
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ended?: boolean | null
          ends_at?: string
          entries?: Json | null
          guild_id?: string
          id?: string
          message_id?: string | null
          prize?: string
          required_role_id?: string | null
          title?: string
          winner_ids?: string[] | null
          winners_count?: number
        }
        Relationships: []
      }
      bot_guild_settings: {
        Row: {
          bot_product_id: string
          created_at: string
          disabled_features: string[] | null
          enabled_features: string[] | null
          guild_id: string
          id: string
          installation_code_id: string
          prefix: string | null
          settings: Json
          updated_at: string
        }
        Insert: {
          bot_product_id: string
          created_at?: string
          disabled_features?: string[] | null
          enabled_features?: string[] | null
          guild_id: string
          id?: string
          installation_code_id: string
          prefix?: string | null
          settings?: Json
          updated_at?: string
        }
        Update: {
          bot_product_id?: string
          created_at?: string
          disabled_features?: string[] | null
          enabled_features?: string[] | null
          guild_id?: string
          id?: string
          installation_code_id?: string
          prefix?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_guild_settings_bot_product_id_fkey"
            columns: ["bot_product_id"]
            isOneToOne: false
            referencedRelation: "bot_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_guild_settings_installation_code_id_fkey"
            columns: ["installation_code_id"]
            isOneToOne: false
            referencedRelation: "bot_installation_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_installation_codes: {
        Row: {
          activated_at: string | null
          bot_product_id: string | null
          created_at: string
          discord_guild_icon: string | null
          discord_guild_name: string | null
          discord_invite: string | null
          discord_member_count: number | null
          expires_at: string
          guild_id: string | null
          id: string
          installation_code: string
          is_used: boolean
          license_expires_at: string | null
          license_status: Database["public"]["Enums"]["bot_license_status"]
          order_id: string
          order_item_id: string
          processed_at: string | null
          processed_by: string | null
          product_name: string
          status: string | null
          used_at: string | null
          used_by: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          bot_product_id?: string | null
          created_at?: string
          discord_guild_icon?: string | null
          discord_guild_name?: string | null
          discord_invite?: string | null
          discord_member_count?: number | null
          expires_at?: string
          guild_id?: string | null
          id?: string
          installation_code: string
          is_used?: boolean
          license_expires_at?: string | null
          license_status?: Database["public"]["Enums"]["bot_license_status"]
          order_id: string
          order_item_id: string
          processed_at?: string | null
          processed_by?: string | null
          product_name: string
          status?: string | null
          used_at?: string | null
          used_by?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          bot_product_id?: string | null
          created_at?: string
          discord_guild_icon?: string | null
          discord_guild_name?: string | null
          discord_invite?: string | null
          discord_member_count?: number | null
          expires_at?: string
          guild_id?: string | null
          id?: string
          installation_code?: string
          is_used?: boolean
          license_expires_at?: string | null
          license_status?: Database["public"]["Enums"]["bot_license_status"]
          order_id?: string
          order_item_id?: string
          processed_at?: string | null
          processed_by?: string | null
          product_name?: string
          status?: string | null
          used_at?: string | null
          used_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_installation_codes_bot_product_id_fkey"
            columns: ["bot_product_id"]
            isOneToOne: false
            referencedRelation: "bot_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_installation_codes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_installation_codes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_installation_codes_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_join_gate_config: {
        Row: {
          action: string
          block_bots: boolean | null
          created_at: string
          enabled: boolean
          guild_id: string
          id: string
          log_channel_id: string | null
          min_account_age_days: number | null
          require_avatar: boolean | null
          require_verified_email: boolean | null
          updated_at: string
          whitelist_role_id: string | null
        }
        Insert: {
          action?: string
          block_bots?: boolean | null
          created_at?: string
          enabled?: boolean
          guild_id: string
          id?: string
          log_channel_id?: string | null
          min_account_age_days?: number | null
          require_avatar?: boolean | null
          require_verified_email?: boolean | null
          updated_at?: string
          whitelist_role_id?: string | null
        }
        Update: {
          action?: string
          block_bots?: boolean | null
          created_at?: string
          enabled?: boolean
          guild_id?: string
          id?: string
          log_channel_id?: string | null
          min_account_age_days?: number | null
          require_avatar?: boolean | null
          require_verified_email?: boolean | null
          updated_at?: string
          whitelist_role_id?: string | null
        }
        Relationships: []
      }
      bot_join_leave_config: {
        Row: {
          created_at: string
          guild_id: string
          id: string
          join_channel_id: string | null
          join_embed_config: Json | null
          join_enabled: boolean | null
          join_message: string | null
          leave_channel_id: string | null
          leave_embed_config: Json | null
          leave_enabled: boolean | null
          leave_message: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          id?: string
          join_channel_id?: string | null
          join_embed_config?: Json | null
          join_enabled?: boolean | null
          join_message?: string | null
          leave_channel_id?: string | null
          leave_embed_config?: Json | null
          leave_enabled?: boolean | null
          leave_message?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          id?: string
          join_channel_id?: string | null
          join_embed_config?: Json | null
          join_enabled?: boolean | null
          join_message?: string | null
          leave_channel_id?: string | null
          leave_embed_config?: Json | null
          leave_enabled?: boolean | null
          leave_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bot_license_bundles: {
        Row: {
          bot_product_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string | null
          price_gbp: number
          quantity: number
          savings_percent: number | null
          updated_at: string | null
        }
        Insert: {
          bot_product_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          price_gbp: number
          quantity: number
          savings_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          bot_product_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          price_gbp?: number
          quantity?: number
          savings_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_license_bundles_bot_product_id_fkey"
            columns: ["bot_product_id"]
            isOneToOne: false
            referencedRelation: "bot_products"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_mod_actions: {
        Row: {
          action_type: string
          created_at: string
          duration: string | null
          guild_id: string | null
          id: string
          moderator_id: string
          moderator_username: string | null
          reason: string | null
          target_user_id: string
          target_username: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          duration?: string | null
          guild_id?: string | null
          id?: string
          moderator_id: string
          moderator_username?: string | null
          reason?: string | null
          target_user_id: string
          target_username?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          duration?: string | null
          guild_id?: string | null
          id?: string
          moderator_id?: string
          moderator_username?: string | null
          reason?: string | null
          target_user_id?: string
          target_username?: string | null
        }
        Relationships: []
      }
      bot_mod_log_config: {
        Row: {
          channel_id: string | null
          created_at: string
          enabled: boolean
          guild_id: string
          id: string
          log_bans: boolean | null
          log_kicks: boolean | null
          log_member_joins: boolean | null
          log_member_leaves: boolean | null
          log_message_deletes: boolean | null
          log_message_edits: boolean | null
          log_role_changes: boolean | null
          log_timeouts: boolean | null
          updated_at: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          enabled?: boolean
          guild_id: string
          id?: string
          log_bans?: boolean | null
          log_kicks?: boolean | null
          log_member_joins?: boolean | null
          log_member_leaves?: boolean | null
          log_message_deletes?: boolean | null
          log_message_edits?: boolean | null
          log_role_changes?: boolean | null
          log_timeouts?: boolean | null
          updated_at?: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          enabled?: boolean
          guild_id?: string
          id?: string
          log_bans?: boolean | null
          log_kicks?: boolean | null
          log_member_joins?: boolean | null
          log_member_leaves?: boolean | null
          log_message_deletes?: boolean | null
          log_message_edits?: boolean | null
          log_role_changes?: boolean | null
          log_timeouts?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      bot_products: {
        Row: {
          created_at: string
          discord_application_id: string
          discord_permissions: number
          id: string
          is_active: boolean
          oauth_scopes: string[]
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_application_id: string
          discord_permissions?: number
          id?: string
          is_active?: boolean
          oauth_scopes?: string[]
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_application_id?: string
          discord_permissions?: number
          id?: string
          is_active?: boolean
          oauth_scopes?: string[]
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_reaction_roles: {
        Row: {
          channel_id: string
          color: string | null
          created_at: string
          description: string | null
          guild_id: string
          id: string
          message_id: string | null
          roles: Json
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          guild_id: string
          id?: string
          message_id?: string | null
          roles?: Json
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          guild_id?: string
          id?: string
          message_id?: string | null
          roles?: Json
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_scheduled_messages: {
        Row: {
          channel_id: string
          content: string | null
          created_at: string
          created_by: string | null
          cron_expression: string | null
          embed_config: Json | null
          enabled: boolean
          guild_id: string
          id: string
          last_run_at: string | null
          next_run_at: string | null
          repeat: boolean | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          embed_config?: Json | null
          enabled?: boolean
          guild_id: string
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          repeat?: boolean | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          embed_config?: Json | null
          enabled?: boolean
          guild_id?: string
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          repeat?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bot_starboard_config: {
        Row: {
          channel_id: string | null
          created_at: string
          emoji: string
          enabled: boolean
          guild_id: string
          id: string
          ignored_channels: string[] | null
          self_star: boolean | null
          threshold: number
          updated_at: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          emoji?: string
          enabled?: boolean
          guild_id: string
          id?: string
          ignored_channels?: string[] | null
          self_star?: boolean | null
          threshold?: number
          updated_at?: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          emoji?: string
          enabled?: boolean
          guild_id?: string
          id?: string
          ignored_channels?: string[] | null
          self_star?: boolean | null
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      bot_starboard_entries: {
        Row: {
          author_id: string
          channel_id: string
          content: string | null
          created_at: string
          guild_id: string
          id: string
          source_message_id: string
          star_count: number
          starboard_message_id: string | null
        }
        Insert: {
          author_id: string
          channel_id: string
          content?: string | null
          created_at?: string
          guild_id: string
          id?: string
          source_message_id: string
          star_count?: number
          starboard_message_id?: string | null
        }
        Update: {
          author_id?: string
          channel_id?: string
          content?: string | null
          created_at?: string
          guild_id?: string
          id?: string
          source_message_id?: string
          star_count?: number
          starboard_message_id?: string | null
        }
        Relationships: []
      }
      bot_suggestions: {
        Row: {
          author_id: string
          author_username: string | null
          channel_id: string | null
          content: string
          created_at: string
          downvotes: number | null
          guild_id: string
          id: string
          message_id: string | null
          responded_by: string | null
          staff_response: string | null
          status: string
          updated_at: string
          upvotes: number | null
        }
        Insert: {
          author_id: string
          author_username?: string | null
          channel_id?: string | null
          content: string
          created_at?: string
          downvotes?: number | null
          guild_id: string
          id?: string
          message_id?: string | null
          responded_by?: string | null
          staff_response?: string | null
          status?: string
          updated_at?: string
          upvotes?: number | null
        }
        Update: {
          author_id?: string
          author_username?: string | null
          channel_id?: string | null
          content?: string
          created_at?: string
          downvotes?: number | null
          guild_id?: string
          id?: string
          message_id?: string | null
          responded_by?: string | null
          staff_response?: string | null
          status?: string
          updated_at?: string
          upvotes?: number | null
        }
        Relationships: []
      }
      bot_suggestions_config: {
        Row: {
          allow_anonymous: boolean | null
          channel_id: string | null
          created_at: string
          enabled: boolean
          guild_id: string
          id: string
          review_channel_id: string | null
          updated_at: string
        }
        Insert: {
          allow_anonymous?: boolean | null
          channel_id?: string | null
          created_at?: string
          enabled?: boolean
          guild_id: string
          id?: string
          review_channel_id?: string | null
          updated_at?: string
        }
        Update: {
          allow_anonymous?: boolean | null
          channel_id?: string | null
          created_at?: string
          enabled?: boolean
          guild_id?: string
          id?: string
          review_channel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bot_verification_config: {
        Row: {
          captcha_enabled: boolean | null
          channel_id: string | null
          created_at: string
          enabled: boolean
          guild_id: string
          id: string
          message_description: string | null
          message_title: string | null
          min_account_age_days: number | null
          type: string
          updated_at: string
          verified_role_id: string | null
        }
        Insert: {
          captcha_enabled?: boolean | null
          channel_id?: string | null
          created_at?: string
          enabled?: boolean
          guild_id: string
          id?: string
          message_description?: string | null
          message_title?: string | null
          min_account_age_days?: number | null
          type?: string
          updated_at?: string
          verified_role_id?: string | null
        }
        Update: {
          captcha_enabled?: boolean | null
          channel_id?: string | null
          created_at?: string
          enabled?: boolean
          guild_id?: string
          id?: string
          message_description?: string | null
          message_title?: string | null
          min_account_age_days?: number | null
          type?: string
          updated_at?: string
          verified_role_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          created_at: string
          id: string
          language_code: string
          translated_description: string | null
          translated_name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          language_code: string
          translated_description?: string | null
          translated_name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          language_code?: string
          translated_description?: string | null
          translated_name?: string
          updated_at?: string
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
      changelog_entries: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          id: string
          issue_category: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          issue_category?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          issue_category?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          message: string
          message_type: string | null
          secure_data: Json | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          secure_data?: Json | null
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          secure_data?: Json | null
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_receipts: {
        Row: {
          channel: string
          id: string
          last_read_at: string
          last_read_message_id: string | null
          user_id: string
        }
        Insert: {
          channel: string
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compliance_violations: {
        Row: {
          created_at: string
          description: string
          id: string
          is_auto_detected: boolean
          is_resolved: boolean
          related_product_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          store_id: string
          updated_at: string
          violation_type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_auto_detected?: boolean
          is_resolved?: boolean
          related_product_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          store_id: string
          updated_at?: string
          violation_type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_auto_detected?: boolean
          is_resolved?: boolean
          related_product_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          store_id?: string
          updated_at?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_violations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_violations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          action: string
          consent_version: string
          created_at: string
          id: string
          ip_address_hash: string | null
          preferences: Json
          user_agent: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          action?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address_hash?: string | null
          preferences: Json
          user_agent?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          action?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address_hash?: string | null
          preferences?: Json
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      contact_message_replies: {
        Row: {
          contact_message_id: string
          created_at: string
          email_message_id: string | null
          id: string
          reply_content: string
          sender_type: string
          sent_at: string
          sent_by: string
        }
        Insert: {
          contact_message_id: string
          created_at?: string
          email_message_id?: string | null
          id?: string
          reply_content: string
          sender_type?: string
          sent_at?: string
          sent_by: string
        }
        Update: {
          contact_message_id?: string
          created_at?: string
          email_message_id?: string | null
          id?: string
          reply_content?: string
          sender_type?: string
          sent_at?: string
          sent_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_message_replies_contact_message_id_fkey"
            columns: ["contact_message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          email_thread_id: string | null
          id: string
          message: string
          name: string
          notes: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          email_thread_id?: string | null
          id?: string
          message: string
          name: string
          notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          email_thread_id?: string | null
          id?: string
          message?: string
          name?: string
          notes?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      creator_ip_registry: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          proof_urls: string[] | null
          roblox_asset_ids: string[] | null
          roblox_universe_ids: string[] | null
          search_keywords: string[] | null
          store_id: string | null
          title: string
          updated_at: string
          work_type: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          proof_urls?: string[] | null
          roblox_asset_ids?: string[] | null
          roblox_universe_ids?: string[] | null
          search_keywords?: string[] | null
          store_id?: string | null
          title: string
          updated_at?: string
          work_type: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          proof_urls?: string[] | null
          roblox_asset_ids?: string[] | null
          roblox_universe_ids?: string[] | null
          search_keywords?: string[] | null
          store_id?: string | null
          title?: string
          updated_at?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_ip_registry_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_ip_registry_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balances: {
        Row: {
          balance: number
          created_at: string
          eclipse_plus_bonus_claimed: boolean
          total_gifted: number
          total_purchased: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          eclipse_plus_bonus_claimed?: boolean
          total_gifted?: number
          total_purchased?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          eclipse_plus_bonus_claimed?: boolean
          total_gifted?: number
          total_purchased?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          gifted_by: string | null
          id: string
          order_id: string | null
          reference_id: string | null
          type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          gifted_by?: string | null
          id?: string
          order_id?: string | null
          reference_id?: string | null
          type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          gifted_by?: string | null
          id?: string
          order_id?: string | null
          reference_id?: string | null
          type?: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          color: string
          created_at: string
          description: string | null
          display_name: string
          hierarchy_level: number
          icon: string
          id: string
          is_default: boolean
          is_status_role: boolean
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          display_name: string
          hierarchy_level?: number
          icon?: string
          id?: string
          is_default?: boolean
          is_status_role?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          display_name?: string
          hierarchy_level?: number
          icon?: string
          id?: string
          is_default?: boolean
          is_status_role?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      data_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          export_type: string
          file_path: string | null
          id: string
          record_count: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          export_type: string
          file_path?: string | null
          id?: string
          record_count?: number | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          export_type?: string
          file_path?: string | null
          id?: string
          record_count?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      developer_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          developer_id: string
          due_date: string | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          developer_id: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          developer_id?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "developer_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "developer_payments_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      developer_product_submissions: {
        Row: {
          approved_product_id: string | null
          category_id: string | null
          created_at: string
          developer_id: string
          files: Json | null
          id: string
          price: number
          product_description: string | null
          product_name: string
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_product_id?: string | null
          category_id?: string | null
          created_at?: string
          developer_id: string
          files?: Json | null
          id?: string
          price?: number
          product_description?: string | null
          product_name: string
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_product_id?: string | null
          category_id?: string | null
          created_at?: string
          developer_id?: string
          files?: Json | null
          id?: string
          price?: number
          product_description?: string | null
          product_name?: string
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "developer_product_submissions_approved_product_id_fkey"
            columns: ["approved_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_product_submissions_approved_product_id_fkey"
            columns: ["approved_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_product_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_product_submissions_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "developer_product_submissions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      discord_advertisements: {
        Row: {
          created_at: string
          description: string
          discord_message_id: string | null
          discord_username: string | null
          id: string
          image_url: string | null
          last_clicked_at: string | null
          link_url: string | null
          payment_id: string | null
          payment_method: string | null
          ping_price_paid: number | null
          ping_type: string | null
          posted_at: string | null
          price_paid: number | null
          robux_transaction_id: string | null
          scheduled_for: string | null
          status: string
          title: string
          total_clicks: number | null
          unique_clicks: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          discord_message_id?: string | null
          discord_username?: string | null
          id?: string
          image_url?: string | null
          last_clicked_at?: string | null
          link_url?: string | null
          payment_id?: string | null
          payment_method?: string | null
          ping_price_paid?: number | null
          ping_type?: string | null
          posted_at?: string | null
          price_paid?: number | null
          robux_transaction_id?: string | null
          scheduled_for?: string | null
          status?: string
          title: string
          total_clicks?: number | null
          unique_clicks?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          discord_message_id?: string | null
          discord_username?: string | null
          id?: string
          image_url?: string | null
          last_clicked_at?: string | null
          link_url?: string | null
          payment_id?: string | null
          payment_method?: string | null
          ping_price_paid?: number | null
          ping_type?: string | null
          posted_at?: string | null
          price_paid?: number | null
          robux_transaction_id?: string | null
          scheduled_for?: string | null
          status?: string
          title?: string
          total_clicks?: number | null
          unique_clicks?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discord_audit_log_cursor: {
        Row: {
          guild_id: string
          last_audit_log_id: string | null
          last_polled_at: string | null
          updated_at: string | null
        }
        Insert: {
          guild_id: string
          last_audit_log_id?: string | null
          last_polled_at?: string | null
          updated_at?: string | null
        }
        Update: {
          guild_id?: string
          last_audit_log_id?: string | null
          last_polled_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discord_boost_trials: {
        Row: {
          boost_count: number
          created_at: string
          discord_id: string
          id: string
          last_boost_at: string
          revoked_at: string | null
          trial_end: string
          trial_start: string
          user_id: string
        }
        Insert: {
          boost_count?: number
          created_at?: string
          discord_id: string
          id?: string
          last_boost_at?: string
          revoked_at?: string | null
          trial_end: string
          trial_start?: string
          user_id: string
        }
        Update: {
          boost_count?: number
          created_at?: string
          discord_id?: string
          id?: string
          last_boost_at?: string
          revoked_at?: string | null
          trial_end?: string
          trial_start?: string
          user_id?: string
        }
        Relationships: []
      }
      discord_daily_claims: {
        Row: {
          bonus_earned: number
          claimed_at: string
          created_at: string
          discord_id: string
          id: string
          streak_day: number
          xp_earned: number
        }
        Insert: {
          bonus_earned?: number
          claimed_at?: string
          created_at?: string
          discord_id: string
          id?: string
          streak_day?: number
          xp_earned?: number
        }
        Update: {
          bonus_earned?: number
          claimed_at?: string
          created_at?: string
          discord_id?: string
          id?: string
          streak_day?: number
          xp_earned?: number
        }
        Relationships: []
      }
      discord_games: {
        Row: {
          channel_id: string
          created_at: string
          creator_discord_id: string
          creator_username: string
          expires_at: string
          game_state: Json
          game_type: string
          guild_id: string | null
          id: string
          message_id: string | null
          opponent_discord_id: string | null
          opponent_username: string | null
          status: string
          updated_at: string
          winner_discord_id: string | null
          xp_reward: number | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          creator_discord_id: string
          creator_username: string
          expires_at?: string
          game_state?: Json
          game_type: string
          guild_id?: string | null
          id?: string
          message_id?: string | null
          opponent_discord_id?: string | null
          opponent_username?: string | null
          status?: string
          updated_at?: string
          winner_discord_id?: string | null
          xp_reward?: number | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          creator_discord_id?: string
          creator_username?: string
          expires_at?: string
          game_state?: Json
          game_type?: string
          guild_id?: string | null
          id?: string
          message_id?: string | null
          opponent_discord_id?: string | null
          opponent_username?: string | null
          status?: string
          updated_at?: string
          winner_discord_id?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      discord_link_codes: {
        Row: {
          code: string
          created_at: string
          discord_user_id: string | null
          discord_username: string | null
          expires_at: string
          id: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discord_user_id?: string | null
          discord_username?: string | null
          expires_at?: string
          id?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discord_user_id?: string | null
          discord_username?: string | null
          expires_at?: string
          id?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      discord_modmail_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          discord_message_id: string | null
          id: string
          is_staff_reply: boolean
          staff_user_id: string | null
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          discord_message_id?: string | null
          id?: string
          is_staff_reply?: boolean
          staff_user_id?: string | null
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          discord_message_id?: string | null
          id?: string
          is_staff_reply?: boolean
          staff_user_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_modmail_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "discord_modmail_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_modmail_tickets: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          discord_avatar_url: string | null
          discord_user_id: string
          discord_username: string
          id: string
          priority: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          discord_avatar_url?: string | null
          discord_user_id: string
          discord_username: string
          id?: string
          priority?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          discord_avatar_url?: string | null
          discord_user_id?: string
          discord_username?: string
          id?: string
          priority?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      discord_outreach: {
        Row: {
          contact_discord: string | null
          contact_name: string | null
          contacted_at: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decision: string | null
          discord_invite: string | null
          id: string
          last_followup_at: string | null
          member_count: number | null
          notes: string | null
          server_id: string | null
          server_name: string
          server_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_discord?: string | null
          contact_name?: string | null
          contacted_at?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decision?: string | null
          discord_invite?: string | null
          id?: string
          last_followup_at?: string | null
          member_count?: number | null
          notes?: string | null
          server_id?: string | null
          server_name: string
          server_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_discord?: string | null
          contact_name?: string | null
          contacted_at?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decision?: string | null
          discord_invite?: string | null
          id?: string
          last_followup_at?: string | null
          member_count?: number | null
          notes?: string | null
          server_id?: string | null
          server_name?: string
          server_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      discord_outreach_activity: {
        Row: {
          activity_type: Database["public"]["Enums"]["outreach_activity_type"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          new_value: string | null
          old_value: string | null
          outreach_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["outreach_activity_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          outreach_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["outreach_activity_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          outreach_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_outreach_activity_outreach_id_fkey"
            columns: ["outreach_id"]
            isOneToOne: false
            referencedRelation: "discord_outreach"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_polls: {
        Row: {
          allow_multiple_answers: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          discord_message_id: string | null
          duration_hours: number | null
          ends_at: string | null
          id: string
          options: Json
          poll_type: string
          posted_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_multiple_answers?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discord_message_id?: string | null
          duration_hours?: number | null
          ends_at?: string | null
          id?: string
          options?: Json
          poll_type?: string
          posted_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_multiple_answers?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discord_message_id?: string | null
          duration_hours?: number | null
          ends_at?: string | null
          id?: string
          options?: Json
          poll_type?: string
          posted_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      discord_qotd: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          discord_message_id: string | null
          id: string
          is_auto_generated: boolean | null
          posted_at: string | null
          question: string
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          discord_message_id?: string | null
          id?: string
          is_auto_generated?: boolean | null
          posted_at?: string | null
          question: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          discord_message_id?: string | null
          id?: string
          is_auto_generated?: boolean | null
          posted_at?: string | null
          question?: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      discord_role_configs: {
        Row: {
          auto_assign_on_purchase: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_global: boolean
          min_order_amount: number | null
          min_order_count: number | null
          requires_subscription: boolean
          role_id: string
          role_name: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          auto_assign_on_purchase?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          min_order_amount?: number | null
          min_order_count?: number | null
          requires_subscription?: boolean
          role_id: string
          role_name: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_assign_on_purchase?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          min_order_amount?: number | null
          min_order_count?: number | null
          requires_subscription?: boolean
          role_id?: string
          role_name?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_role_configs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_role_configs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_trivia_questions: {
        Row: {
          category: string
          correct_answer: string
          created_at: string
          difficulty: string
          id: string
          question: string
          wrong_answers: string[]
        }
        Insert: {
          category: string
          correct_answer: string
          created_at?: string
          difficulty?: string
          id?: string
          question: string
          wrong_answers: string[]
        }
        Update: {
          category?: string
          correct_answer?: string
          created_at?: string
          difficulty?: string
          id?: string
          question?: string
          wrong_answers?: string[]
        }
        Relationships: []
      }
      discord_xp: {
        Row: {
          commands_used: number
          created_at: string
          current_streak: number
          discord_id: string
          discord_username: string | null
          games_played: number
          games_won: number
          id: string
          last_message_xp_at: string | null
          level: number
          longest_streak: number
          messages_count: number
          total_xp: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commands_used?: number
          created_at?: string
          current_streak?: number
          discord_id: string
          discord_username?: string | null
          games_played?: number
          games_won?: number
          id?: string
          last_message_xp_at?: string | null
          level?: number
          longest_streak?: number
          messages_count?: number
          total_xp?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commands_used?: number
          created_at?: string
          current_streak?: number
          discord_id?: string
          discord_username?: string | null
          games_played?: number
          games_won?: number
          id?: string
          last_message_xp_at?: string | null
          level?: number
          longest_streak?: number
          messages_count?: number
          total_xp?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          category_ids: string[] | null
          code: string
          created_at: string
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          product_ids: string[] | null
          restricted_to_user_id: string | null
          store_id: string | null
        }
        Insert: {
          category_ids?: string[] | null
          code: string
          created_at?: string
          current_uses?: number | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          product_ids?: string[] | null
          restricted_to_user_id?: string | null
          store_id?: string | null
        }
        Update: {
          category_ids?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          product_ids?: string[] | null
          restricted_to_user_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          created_at: string | null
          dispute_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          dispute_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          dispute_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      download_logs: {
        Row: {
          downloaded_at: string
          id: string
          ip_address: string | null
          order_item_id: string | null
          product_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          order_item_id?: string | null
          product_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          order_item_id?: string | null
          product_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_logs_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      download_tokens: {
        Row: {
          created_at: string
          creator_ip: string | null
          expires_at: string
          id: string
          order_item_id: string | null
          product_id: string
          signed_url: string
          temp_file_path: string | null
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_ip?: string | null
          expires_at: string
          id?: string
          order_item_id?: string | null
          product_id: string
          signed_url: string
          temp_file_path?: string | null
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          creator_ip?: string | null
          expires_at?: string
          id?: string
          order_item_id?: string | null
          product_id?: string
          signed_url?: string
          temp_file_path?: string | null
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_tokens_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_tokens_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "download_tokens_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          subscribed_to_discounts: boolean
          subscribed_to_newsletters: boolean
          subscribed_to_support_replies: boolean | null
          subscribed_to_updates: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          subscribed_to_discounts?: boolean
          subscribed_to_newsletters?: boolean
          subscribed_to_support_replies?: boolean | null
          subscribed_to_updates?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          subscribed_to_discounts?: boolean
          subscribed_to_newsletters?: boolean
          subscribed_to_support_replies?: boolean | null
          subscribed_to_updates?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          updated_at: string | null
          user_ids: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          updated_at?: string | null
          user_ids?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          updated_at?: string | null
          user_ids?: string[] | null
        }
        Relationships: []
      }
      file_hash_registry: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          file_hash: string
          first_seen_at: string
          hash_algorithm: string
          id: string
          is_blocked: boolean | null
          last_seen_at: string
          seen_count: number
          threat_details: string | null
          threat_type: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          file_hash: string
          first_seen_at?: string
          hash_algorithm?: string
          id?: string
          is_blocked?: boolean | null
          last_seen_at?: string
          seen_count?: number
          threat_details?: string | null
          threat_type?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          file_hash?: string
          first_seen_at?: string
          hash_algorithm?: string
          id?: string
          is_blocked?: boolean | null
          last_seen_at?: string
          seen_count?: number
          threat_details?: string | null
          threat_type?: string | null
        }
        Relationships: []
      }
      flash_sales: {
        Row: {
          apply_to_all: boolean
          created_at: string
          discount_type: string
          discount_value: number
          ends_at: string
          id: string
          is_active: boolean
          name: string
          product_ids: string[] | null
          starts_at: string
          store_id: string
          updated_at: string
        }
        Insert: {
          apply_to_all?: boolean
          created_at?: string
          discount_type?: string
          discount_value: number
          ends_at: string
          id?: string
          is_active?: boolean
          name: string
          product_ids?: string[] | null
          starts_at: string
          store_id: string
          updated_at?: string
        }
        Update: {
          apply_to_all?: boolean
          created_at?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_ids?: string[] | null
          starts_at?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      game_news_feeds: {
        Row: {
          check_interval_minutes: number
          created_at: string
          discord_channel_id: string
          embed_color: number | null
          enabled: boolean
          feed_type: string
          feed_url: string
          free_only: boolean
          icon_url: string | null
          id: string
          last_checked_at: string | null
          name: string
          ping_role_id: string | null
          updated_at: string
        }
        Insert: {
          check_interval_minutes?: number
          created_at?: string
          discord_channel_id: string
          embed_color?: number | null
          enabled?: boolean
          feed_type?: string
          feed_url: string
          free_only?: boolean
          icon_url?: string | null
          id?: string
          last_checked_at?: string | null
          name: string
          ping_role_id?: string | null
          updated_at?: string
        }
        Update: {
          check_interval_minutes?: number
          created_at?: string
          discord_channel_id?: string
          embed_color?: number | null
          enabled?: boolean
          feed_type?: string
          feed_url?: string
          free_only?: boolean
          icon_url?: string | null
          id?: string
          last_checked_at?: string | null
          name?: string
          ping_role_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      game_news_posted: {
        Row: {
          article_title: string | null
          article_url: string
          feed_id: string
          id: string
          posted_at: string
        }
        Insert: {
          article_title?: string | null
          article_url: string
          feed_id: string
          id?: string
          posted_at?: string
        }
        Update: {
          article_title?: string | null
          article_url?: string
          feed_id?: string
          id?: string
          posted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_news_posted_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "game_news_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      global_ban_logs: {
        Row: {
          action: string
          ban_id: string
          created_at: string
          details: Json | null
          guild_id: string | null
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          ban_id: string
          created_at?: string
          details?: Json | null
          guild_id?: string | null
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          ban_id?: string
          created_at?: string
          details?: Json | null
          guild_id?: string | null
          id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_ban_logs_ban_id_fkey"
            columns: ["ban_id"]
            isOneToOne: false
            referencedRelation: "global_bans"
            referencedColumns: ["id"]
          },
        ]
      }
      global_ban_sync_status: {
        Row: {
          ban_id: string
          created_at: string
          error_message: string | null
          guild_id: string
          guild_name: string | null
          id: string
          status: Database["public"]["Enums"]["global_ban_sync_status_type"]
          synced_at: string | null
        }
        Insert: {
          ban_id: string
          created_at?: string
          error_message?: string | null
          guild_id: string
          guild_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["global_ban_sync_status_type"]
          synced_at?: string | null
        }
        Update: {
          ban_id?: string
          created_at?: string
          error_message?: string | null
          guild_id?: string
          guild_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["global_ban_sync_status_type"]
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_ban_sync_status_ban_id_fkey"
            columns: ["ban_id"]
            isOneToOne: false
            referencedRelation: "global_bans"
            referencedColumns: ["id"]
          },
        ]
      }
      global_ban_templates: {
        Row: {
          ban_type: string
          created_at: string
          duration: string | null
          id: string
          name: string
          owner_user_id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          ban_type?: string
          created_at?: string
          duration?: string | null
          id?: string
          name: string
          owner_user_id: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          ban_type?: string
          created_at?: string
          duration?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      global_bans: {
        Row: {
          ban_type: Database["public"]["Enums"]["global_ban_type"]
          banned_avatar_url: string | null
          banned_discord_id: string
          banned_username: string | null
          created_at: string
          created_via: string
          evidence: Json | null
          expires_at: string | null
          id: string
          is_active: boolean
          owner_user_id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          ban_type?: Database["public"]["Enums"]["global_ban_type"]
          banned_avatar_url?: string | null
          banned_discord_id: string
          banned_username?: string | null
          created_at?: string
          created_via?: string
          evidence?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          owner_user_id: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          ban_type?: Database["public"]["Enums"]["global_ban_type"]
          banned_avatar_url?: string | null
          banned_discord_id?: string
          banned_username?: string | null
          created_at?: string
          created_via?: string
          evidence?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          owner_user_id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      global_guard_guild_permissions: {
        Row: {
          created_at: string
          discord_role_id: string
          discord_role_name: string | null
          guild_id: string
          guild_name: string | null
          id: string
          owner_user_id: string
          permission_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_role_id: string
          discord_role_name?: string | null
          guild_id: string
          guild_name?: string | null
          id?: string
          owner_user_id: string
          permission_level?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_role_id?: string
          discord_role_name?: string | null
          guild_id?: string
          guild_name?: string | null
          id?: string
          owner_user_id?: string
          permission_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_guard_guild_settings: {
        Row: {
          created_at: string | null
          guild_id: string
          id: string
          log_bans: boolean | null
          log_channel_id: string | null
          log_channel_name: string | null
          log_unbans: boolean | null
          owner_user_id: string
          ping_role_id: string | null
          ping_role_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          guild_id: string
          id?: string
          log_bans?: boolean | null
          log_channel_id?: string | null
          log_channel_name?: string | null
          log_unbans?: boolean | null
          owner_user_id: string
          ping_role_id?: string | null
          ping_role_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          guild_id?: string
          id?: string
          log_bans?: boolean | null
          log_channel_id?: string | null
          log_channel_name?: string | null
          log_unbans?: boolean | null
          owner_user_id?: string
          ping_role_id?: string | null
          ping_role_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      global_guard_server_usage: {
        Row: {
          additional_servers: number
          base_servers: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          current_server_count: number
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          total_servers: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_servers?: number
          base_servers?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          current_server_count?: number
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_servers?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_servers?: number
          base_servers?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          current_server_count?: number
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_servers?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_guard_settings: {
        Row: {
          auto_sync_new_servers: boolean
          created_at: string
          default_ban_reason: string | null
          has_ban_templates: boolean
          has_priority_sync: boolean
          id: string
          max_active_bans: number | null
          max_servers: number
          notify_on_sync_failure: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_new_servers?: boolean
          created_at?: string
          default_ban_reason?: string | null
          has_ban_templates?: boolean
          has_priority_sync?: boolean
          id?: string
          max_active_bans?: number | null
          max_servers?: number
          notify_on_sync_failure?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_new_servers?: boolean
          created_at?: string
          default_ban_reason?: string | null
          has_ban_templates?: boolean
          has_priority_sync?: boolean
          id?: string
          max_active_bans?: number | null
          max_servers?: number
          notify_on_sync_failure?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_guard_subscriptions: {
        Row: {
          billing_period: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_guard_subscriptions_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "global_guard_tiers"
            referencedColumns: ["tier"]
          },
        ]
      }
      global_guard_tiers: {
        Row: {
          annual_price_gbp: number
          created_at: string
          description: string | null
          display_order: number
          features: Json | null
          has_ban_templates: boolean
          has_priority_sync: boolean
          id: string
          is_active: boolean
          max_servers: number | null
          monthly_price_gbp: number
          name: string
          stripe_annual_price_id: string | null
          stripe_annual_product_id: string | null
          stripe_monthly_price_id: string | null
          stripe_monthly_product_id: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          annual_price_gbp?: number
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          has_ban_templates?: boolean
          has_priority_sync?: boolean
          id?: string
          is_active?: boolean
          max_servers?: number | null
          monthly_price_gbp?: number
          name: string
          stripe_annual_price_id?: string | null
          stripe_annual_product_id?: string | null
          stripe_monthly_price_id?: string | null
          stripe_monthly_product_id?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          annual_price_gbp?: number
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          has_ban_templates?: boolean
          has_priority_sync?: boolean
          id?: string
          is_active?: boolean
          max_servers?: number | null
          monthly_price_gbp?: number
          name?: string
          stripe_annual_price_id?: string | null
          stripe_annual_product_id?: string | null
          stripe_monthly_price_id?: string | null
          stripe_monthly_product_id?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      guild_command_permissions: {
        Row: {
          allowed_role_ids: string[]
          command_name: string
          created_at: string
          guild_id: string
          id: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          allowed_role_ids?: string[]
          command_name: string
          created_at?: string
          guild_id: string
          id?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          allowed_role_ids?: string[]
          command_name?: string
          created_at?: string
          guild_id?: string
          id?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_command_permissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_command_permissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          created_at: string
          id: string
          status: string
          stripe_session_id: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          stripe_session_id: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          stripe_session_id?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      incident_updates: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          message: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          message: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          message?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          affected_services: string[] | null
          created_at: string
          description: string | null
          id: string
          is_maintenance: boolean
          maintenance_end: string | null
          maintenance_start: string | null
          resolved_at: string | null
          severity: string
          started_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_services?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_maintenance?: boolean
          maintenance_end?: string | null
          maintenance_start?: string | null
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_services?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_maintenance?: boolean
          maintenance_end?: string | null
          maintenance_start?: string | null
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_note_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          note_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          note_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "internal_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          created_by: string
          id: string
          priority: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          priority?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          priority?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ip_bans: {
        Row: {
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ip_external_detections: {
        Row: {
          confidence_score: number | null
          created_at: string
          creator_id: string
          id: string
          match_type: string
          matched_content: string | null
          page_title: string | null
          registry_entry_id: string | null
          scraped_content: string | null
          screenshot_url: string | null
          source_url: string
          source_website: string
          status: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          creator_id: string
          id?: string
          match_type?: string
          matched_content?: string | null
          page_title?: string | null
          registry_entry_id?: string | null
          scraped_content?: string | null
          screenshot_url?: string | null
          source_url: string
          source_website: string
          status?: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          creator_id?: string
          id?: string
          match_type?: string
          matched_content?: string | null
          page_title?: string | null
          registry_entry_id?: string | null
          scraped_content?: string | null
          screenshot_url?: string | null
          source_url?: string
          source_website?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_external_detections_registry_entry_id_fkey"
            columns: ["registry_entry_id"]
            isOneToOne: false
            referencedRelation: "creator_ip_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_monitor_alerts: {
        Row: {
          alert_type: string
          asset_name: string | null
          created_at: string
          creator_id: string
          current_owner_id: string | null
          current_owner_name: string | null
          details: Json | null
          dismissed_at: string | null
          emailed_at: string | null
          id: string
          registry_entry_id: string
          roblox_asset_id: string
        }
        Insert: {
          alert_type?: string
          asset_name?: string | null
          created_at?: string
          creator_id: string
          current_owner_id?: string | null
          current_owner_name?: string | null
          details?: Json | null
          dismissed_at?: string | null
          emailed_at?: string | null
          id?: string
          registry_entry_id: string
          roblox_asset_id: string
        }
        Update: {
          alert_type?: string
          asset_name?: string | null
          created_at?: string
          creator_id?: string
          current_owner_id?: string | null
          current_owner_name?: string | null
          details?: Json | null
          dismissed_at?: string | null
          emailed_at?: string | null
          id?: string
          registry_entry_id?: string
          roblox_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_monitor_alerts_registry_entry_id_fkey"
            columns: ["registry_entry_id"]
            isOneToOne: false
            referencedRelation: "creator_ip_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_monitor_scan_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          total_alerts_generated: number | null
          total_assets_scanned: number | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          total_alerts_generated?: number | null
          total_assets_scanned?: number | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          total_alerts_generated?: number | null
          total_assets_scanned?: number | null
        }
        Relationships: []
      }
      ip_scan_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          creator_id: string
          custom_keywords: string[] | null
          error_message: string | null
          evidence_collected: number | null
          id: string
          registry_entry_id: string | null
          scan_type: string
          started_at: string
          status: string
          thumbnails_analyzed: number | null
          total_detected: number | null
          total_searches: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          creator_id: string
          custom_keywords?: string[] | null
          error_message?: string | null
          evidence_collected?: number | null
          id?: string
          registry_entry_id?: string | null
          scan_type?: string
          started_at?: string
          status?: string
          thumbnails_analyzed?: number | null
          total_detected?: number | null
          total_searches?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          creator_id?: string
          custom_keywords?: string[] | null
          error_message?: string | null
          evidence_collected?: number | null
          id?: string
          registry_entry_id?: string | null
          scan_type?: string
          started_at?: string
          status?: string
          thumbnails_analyzed?: number | null
          total_detected?: number | null
          total_searches?: number | null
        }
        Relationships: []
      }
      ip_shield_contact_messages: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          staff_notes: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          staff_notes?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          staff_notes?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ip_violation_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          evidence_urls: string[] | null
          id: string
          is_rights_holder: boolean
          original_work_url: string | null
          product_id: string
          reporter_email: string
          reporter_id: string | null
          reporter_name: string
          resolved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          violation_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          evidence_urls?: string[] | null
          id?: string
          is_rights_holder?: boolean
          original_work_url?: string | null
          product_id: string
          reporter_email: string
          reporter_id?: string | null
          reporter_name: string
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          violation_type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          evidence_urls?: string[] | null
          id?: string
          is_rights_holder?: boolean
          original_work_url?: string | null
          product_id?: string
          reporter_email?: string
          reporter_id?: string | null
          reporter_name?: string
          resolved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_violation_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_violation_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          access_token: string
          applicant_email: string
          applicant_name: string
          created_at: string
          discord_username: string | null
          experience: string | null
          id: string
          is_open: boolean
          message: string
          notes: string | null
          portfolio_url: string | null
          position: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          applicant_email: string
          applicant_name: string
          created_at?: string
          discord_username?: string | null
          experience?: string | null
          id?: string
          is_open?: boolean
          message: string
          notes?: string | null
          portfolio_url?: string | null
          position: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          applicant_email?: string
          applicant_name?: string
          created_at?: string
          discord_username?: string | null
          experience?: string | null
          id?: string
          is_open?: boolean
          message?: string
          notes?: string | null
          portfolio_url?: string | null
          position?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_channels: {
        Row: {
          created_at: string
          description: string
          display_order: number | null
          id: string
          is_active: boolean
          location: string
          requirements: string[]
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          location?: string
          requirements?: string[]
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          location?: string
          requirements?: string[]
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      leak_reports: {
        Row: {
          created_at: string
          extracted_fingerprint: string | null
          file_hash: string | null
          id: string
          matched_display_name: string | null
          matched_user_id: string | null
          notes: string | null
          product_id: string
          reported_by: string
          status: string
          store_id: string
        }
        Insert: {
          created_at?: string
          extracted_fingerprint?: string | null
          file_hash?: string | null
          id?: string
          matched_display_name?: string | null
          matched_user_id?: string | null
          notes?: string | null
          product_id: string
          reported_by: string
          status?: string
          store_id: string
        }
        Update: {
          created_at?: string
          extracted_fingerprint?: string | null
          file_hash?: string | null
          id?: string
          matched_display_name?: string | null
          matched_user_id?: string | null
          notes?: string | null
          product_id?: string
          reported_by?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leak_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leak_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leak_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leak_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      leak_scan_results: {
        Row: {
          ai_verdict: string | null
          confidence: string
          confidence_score: number | null
          created_at: string
          dismissed: boolean
          extracted_fingerprint: string | null
          id: string
          matched_display_name: string | null
          matched_query: string
          matched_user_id: string | null
          product_id: string
          snippet: string | null
          source_domain: string
          source_url: string
          status: string
          store_id: string
        }
        Insert: {
          ai_verdict?: string | null
          confidence?: string
          confidence_score?: number | null
          created_at?: string
          dismissed?: boolean
          extracted_fingerprint?: string | null
          id?: string
          matched_display_name?: string | null
          matched_query: string
          matched_user_id?: string | null
          product_id: string
          snippet?: string | null
          source_domain: string
          source_url: string
          status?: string
          store_id: string
        }
        Update: {
          ai_verdict?: string | null
          confidence?: string
          confidence_score?: number | null
          created_at?: string
          dismissed?: boolean
          extracted_fingerprint?: string | null
          id?: string
          matched_display_name?: string | null
          matched_query?: string
          matched_user_id?: string | null
          product_id?: string
          snippet?: string | null
          source_domain?: string
          source_url?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leak_scan_results_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leak_scan_results_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leak_scan_results_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leak_scan_results_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string
          lifetime_points: number
          points: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lifetime_points?: number
          points?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          lifetime_points?: number
          points?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_interest: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nsfw_scan_cache: {
        Row: {
          id: string
          image_hash: string
          is_nsfw: boolean
          reason: string | null
          scan_count: number
          scanned_at: string
        }
        Insert: {
          id?: string
          image_hash: string
          is_nsfw?: boolean
          reason?: string | null
          scan_count?: number
          scanned_at?: string
        }
        Update: {
          id?: string
          image_hash?: string
          is_nsfw?: boolean
          reason?: string | null
          scan_count?: number
          scanned_at?: string
        }
        Relationships: []
      }
      order_disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          order_id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          order_id: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          order_id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          download_count: number
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
        }
        Insert: {
          created_at?: string
          download_count?: number
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
        }
        Update: {
          created_at?: string
          download_count?: number
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          deleted_at: string | null
          discount_amount: number | null
          discount_code_id: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          refund_amount: number | null
          refund_id: string | null
          refunded_at: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          deleted_at?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refunded_at?: string | null
          status?: string
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          deleted_at?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refunded_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          ip_hash: string | null
          is_new_visitor: boolean
          page_path: string
          referrer: string | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          is_new_visitor?: boolean
          page_path: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          is_new_visitor?: boolean
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          attempts: number
          code_hash: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code_hash?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          created_at: string
          id: string
          notified_at: string | null
          original_price: number
          product_id: string
          target_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notified_at?: string | null
          original_price: number
          product_id: string
          target_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notified_at?: string | null
          original_price?: number
          product_id?: string
          target_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
      product_bundles: {
        Row: {
          bundle_price: number
          created_at: string
          current_purchases: number
          description: string | null
          id: string
          is_active: boolean
          max_purchases: number | null
          name: string
          original_price: number
          product_ids: string[]
          savings_percent: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          bundle_price: number
          created_at?: string
          current_purchases?: number
          description?: string | null
          id?: string
          is_active?: boolean
          max_purchases?: number | null
          name: string
          original_price: number
          product_ids: string[]
          savings_percent?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          bundle_price?: number
          created_at?: string
          current_purchases?: number
          description?: string | null
          id?: string
          is_active?: boolean
          max_purchases?: number | null
          name?: string
          original_price?: number
          product_ids?: string[]
          savings_percent?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_bundles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_bundles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_imports: {
        Row: {
          error_message: string | null
          id: string
          imported_at: string
          imported_by: string
          metadata: Json | null
          product_id: string | null
          source_name: string
          source_platform: string
          source_price: number | null
          source_url: string
          status: string
          store_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          imported_at?: string
          imported_by: string
          metadata?: Json | null
          product_id?: string | null
          source_name: string
          source_platform: string
          source_price?: number | null
          source_url: string
          status?: string
          store_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          imported_at?: string
          imported_by?: string
          metadata?: Json | null
          product_id?: string | null
          source_name?: string
          source_platform?: string
          source_price?: number | null
          source_url?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_imports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_imports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_imports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_imports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_promotions: {
        Row: {
          campaign_name: string | null
          category_id: string | null
          clicks: number
          cpc_bid: number | null
          cpm_bid: number | null
          created_at: string
          creative_images: string[] | null
          daily_budget_limit: number | null
          duration_days: number
          expires_at: string | null
          goal: string
          id: string
          impressions: number
          paused_at: string | null
          placement_zones: string[]
          pricing_model: string
          product_id: string
          started_at: string | null
          status: string
          store_id: string
          target_countries: string[] | null
          target_devices: string[] | null
          total_budget: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_name?: string | null
          category_id?: string | null
          clicks?: number
          cpc_bid?: number | null
          cpm_bid?: number | null
          created_at?: string
          creative_images?: string[] | null
          daily_budget_limit?: number | null
          duration_days?: number
          expires_at?: string | null
          goal?: string
          id?: string
          impressions?: number
          paused_at?: string | null
          placement_zones?: string[]
          pricing_model?: string
          product_id: string
          started_at?: string | null
          status?: string
          store_id: string
          target_countries?: string[] | null
          target_devices?: string[] | null
          total_budget?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_name?: string | null
          category_id?: string | null
          clicks?: number
          cpc_bid?: number | null
          cpm_bid?: number | null
          created_at?: string
          creative_images?: string[] | null
          daily_budget_limit?: number | null
          duration_days?: number
          expires_at?: string | null
          goal?: string
          id?: string
          impressions?: number
          paused_at?: string | null
          placement_zones?: string[]
          pricing_model?: string
          product_id?: string
          started_at?: string | null
          status?: string
          store_id?: string
          target_countries?: string[] | null
          target_devices?: string[] | null
          total_budget?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_promotions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          product_id: string
          translated_description: string | null
          translated_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          product_id: string
          translated_description?: string | null
          translated_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          product_id?: string
          translated_description?: string | null
          translated_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          last_viewed_at: string
          product_id: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          product_id: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          product_id?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additional_asset_files: string[] | null
          asset_file_url: string | null
          category_id: string | null
          created_at: string
          deleted_at: string | null
          delivery_type: string
          description: string | null
          discord_message_id: string | null
          discord_thread_id: string | null
          download_count: number | null
          early_access_hours: number | null
          eclipse_free_eligible: boolean
          external_link: string | null
          feed_notified_at: string | null
          file_review_consented_at: string | null
          file_review_requested_at: string | null
          id: string
          images: string[] | null
          ip_ownership_confirmed: boolean
          is_active: boolean | null
          is_featured: boolean | null
          is_pay_what_you_want: boolean
          is_resellable: boolean
          is_seller_product: boolean | null
          max_downloads_per_purchase: number | null
          min_price: number | null
          moderation_flags: Json | null
          moderation_notes: string | null
          moderation_status: string | null
          name: string
          price: number
          product_number: number
          release_at: string | null
          release_notified_at: string | null
          robux_enabled: boolean | null
          robux_price: number | null
          robux_product_id: string | null
          search_vector: unknown
          seller_price: number | null
          slug: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          additional_asset_files?: string[] | null
          asset_file_url?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_type?: string
          description?: string | null
          discord_message_id?: string | null
          discord_thread_id?: string | null
          download_count?: number | null
          early_access_hours?: number | null
          eclipse_free_eligible?: boolean
          external_link?: string | null
          feed_notified_at?: string | null
          file_review_consented_at?: string | null
          file_review_requested_at?: string | null
          id?: string
          images?: string[] | null
          ip_ownership_confirmed?: boolean
          is_active?: boolean | null
          is_featured?: boolean | null
          is_pay_what_you_want?: boolean
          is_resellable?: boolean
          is_seller_product?: boolean | null
          max_downloads_per_purchase?: number | null
          min_price?: number | null
          moderation_flags?: Json | null
          moderation_notes?: string | null
          moderation_status?: string | null
          name: string
          price: number
          product_number?: number
          release_at?: string | null
          release_notified_at?: string | null
          robux_enabled?: boolean | null
          robux_price?: number | null
          robux_product_id?: string | null
          search_vector?: unknown
          seller_price?: number | null
          slug: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          additional_asset_files?: string[] | null
          asset_file_url?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_type?: string
          description?: string | null
          discord_message_id?: string | null
          discord_thread_id?: string | null
          download_count?: number | null
          early_access_hours?: number | null
          eclipse_free_eligible?: boolean
          external_link?: string | null
          feed_notified_at?: string | null
          file_review_consented_at?: string | null
          file_review_requested_at?: string | null
          id?: string
          images?: string[] | null
          ip_ownership_confirmed?: boolean
          is_active?: boolean | null
          is_featured?: boolean | null
          is_pay_what_you_want?: boolean
          is_resellable?: boolean
          is_seller_product?: boolean | null
          max_downloads_per_purchase?: number | null
          min_price?: number | null
          moderation_flags?: Json | null
          moderation_notes?: string | null
          moderation_status?: string | null
          name?: string
          price?: number
          product_number?: number
          release_at?: string | null
          release_notified_at?: string | null
          robux_enabled?: boolean | null
          robux_price?: number | null
          robux_product_id?: string | null
          search_vector?: unknown
          seller_price?: number | null
          slug?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accounts_lock_reset_at: string | null
          accounts_lock_reset_by: string | null
          accounts_locked: boolean | null
          accounts_locked_at: string | null
          avatar_url: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          discord_id: string | null
          discord_username: string | null
          display_name: string | null
          display_name_changed_at: string | null
          email: string
          hide_from_leaderboard: boolean
          id: string
          last_seen: string | null
          referral_code: string | null
          roblox_user_id: string | null
          roblox_username: string | null
          staff_id: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          accounts_lock_reset_at?: string | null
          accounts_lock_reset_by?: string | null
          accounts_locked?: boolean | null
          accounts_locked_at?: string | null
          avatar_url?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          discord_id?: string | null
          discord_username?: string | null
          display_name?: string | null
          display_name_changed_at?: string | null
          email: string
          hide_from_leaderboard?: boolean
          id?: string
          last_seen?: string | null
          referral_code?: string | null
          roblox_user_id?: string | null
          roblox_username?: string | null
          staff_id?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          accounts_lock_reset_at?: string | null
          accounts_lock_reset_by?: string | null
          accounts_locked?: boolean | null
          accounts_locked_at?: string | null
          avatar_url?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          discord_id?: string | null
          discord_username?: string | null
          display_name?: string | null
          display_name_changed_at?: string | null
          email?: string
          hide_from_leaderboard?: boolean
          id?: string
          last_seen?: string | null
          referral_code?: string | null
          roblox_user_id?: string | null
          roblox_username?: string | null
          staff_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      promotion_claims: {
        Row: {
          claimed_at: string | null
          discount_code_id: string | null
          id: string
          promotion_id: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          discount_code_id?: string | null
          id?: string
          promotion_id: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          discount_code_id?: string | null
          id?: string
          promotion_id?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_claims_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_claims_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_claims_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_claims: number | null
          description: string | null
          discount_code_id: string | null
          eclipse_plus_days: number | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          max_claims: number | null
          name: string
          new_users_only: boolean | null
          promotion_type: string
          require_email_verified: boolean | null
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_claims?: number | null
          description?: string | null
          discount_code_id?: string | null
          eclipse_plus_days?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_claims?: number | null
          name: string
          new_users_only?: boolean | null
          promotion_type: string
          require_email_verified?: boolean | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_claims?: number | null
          description?: string | null
          discount_code_id?: string | null
          eclipse_plus_days?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_claims?: number | null
          name?: string
          new_users_only?: boolean | null
          promotion_type?: string
          require_email_verified?: boolean | null
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quarantined_files: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string | null
          id: string
          original_file_name: string
          original_file_path: string
          product_id: string | null
          quarantine_path: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scan_results: Json | null
          status: string
          store_id: string
          threat_details: Json | null
          threat_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          original_file_name: string
          original_file_path: string
          product_id?: string | null
          quarantine_path: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_results?: Json | null
          status?: string
          store_id: string
          threat_details?: Json | null
          threat_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          original_file_name?: string
          original_file_path?: string
          product_id?: string | null
          quarantine_path?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scan_results?: Json | null
          status?: string
          store_id?: string
          threat_details?: Json | null
          threat_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarantined_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarantined_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarantined_files_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarantined_files_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referrer_id: string
          user_agent: string | null
          visitor_ip_hash: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referrer_id: string
          user_agent?: string | null
          visitor_ip_hash?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referrer_id?: string
          user_agent?: string | null
          visitor_ip_hash?: string | null
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string | null
          discount_code_id: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          referral_id: string | null
          reward_type: string
          reward_value: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_code_id?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          referral_id?: string | null
          reward_type?: string
          reward_value?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_code_id?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          referral_id?: string | null
          reward_type?: string
          reward_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          order_id: string | null
          referral_code: string
          referred_id: string | null
          referrer_id: string
          reward_claimed: boolean | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          reward_claimed?: boolean | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          reward_claimed?: boolean | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_resolved_at: string | null
          admin_resolved_by: string | null
          admin_response: string | null
          amount: number
          created_at: string
          customer_id: string
          details: string | null
          dispute_number: string | null
          escalated_at: string | null
          escalation_reason: string | null
          id: string
          order_id: string
          order_item_id: string | null
          reason: string
          seller_responded_at: string | null
          seller_response: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          admin_resolved_at?: string | null
          admin_resolved_by?: string | null
          admin_response?: string | null
          amount: number
          created_at?: string
          customer_id: string
          details?: string | null
          dispute_number?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          order_id: string
          order_item_id?: string | null
          reason: string
          seller_responded_at?: string | null
          seller_response?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          admin_resolved_at?: string | null
          admin_resolved_by?: string | null
          admin_response?: string | null
          amount?: number
          created_at?: string
          customer_id?: string
          details?: string | null
          dispute_number?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          order_id?: string
          order_item_id?: string | null
          reason?: string
          seller_responded_at?: string | null
          seller_response?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reminders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          reminder_1h_sent: boolean
          reminder_24h_sent: boolean
          reminder_72h_sent: boolean
          review_submitted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          reminder_72h_sent?: boolean
          review_submitted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          reminder_72h_sent?: boolean
          review_submitted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reminders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reminders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reminders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reminders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          external_reviewer_name: string | null
          external_source: string | null
          id: string
          is_approved: boolean | null
          is_external: boolean | null
          is_featured: boolean | null
          is_verified_purchase: boolean | null
          product_id: string | null
          rating: number
          seller_replied_at: string | null
          seller_reply: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          external_reviewer_name?: string | null
          external_source?: string | null
          id?: string
          is_approved?: boolean | null
          is_external?: boolean | null
          is_featured?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating: number
          seller_replied_at?: string | null
          seller_reply?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          external_reviewer_name?: string | null
          external_source?: string | null
          id?: string
          is_approved?: boolean | null
          is_external?: boolean | null
          is_featured?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number
          seller_replied_at?: string | null
          seller_reply?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      robux_transactions: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_name: string
          roblox_user_id: string
          roblox_username: string
          robux_after_tax: number
          robux_amount: number
          transaction_id: string
          transaction_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          roblox_user_id: string
          roblox_username: string
          robux_after_tax: number
          robux_amount: number
          transaction_id: string
          transaction_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          roblox_user_id?: string
          roblox_username?: string
          robux_after_tax?: number
          robux_amount?: number
          transaction_id?: string
          transaction_type?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission_id: string
          role: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["name"]
          },
        ]
      }
      search_logs: {
        Row: {
          clicked_product_id: string | null
          created_at: string
          id: string
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          clicked_product_id?: string | null
          created_at?: string
          id?: string
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          clicked_product_id?: string | null
          created_at?: string
          id?: string
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_clicked_product_id_fkey"
            columns: ["clicked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_logs_clicked_product_id_fkey"
            columns: ["clicked_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_agreements: {
        Row: {
          agreement_version: string
          id: string
          ip_address: string | null
          signed_at: string
          signed_by: string
          store_id: string
          user_agent: string | null
        }
        Insert: {
          agreement_version?: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          signed_by: string
          store_id: string
          user_agent?: string | null
        }
        Update: {
          agreement_version?: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          signed_by?: string
          store_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_agreements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_agreements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_analytics: {
        Row: {
          country: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          product_id: string | null
          referrer: string | null
          store_id: string
          visitor_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          product_id?: string | null
          referrer?: string | null
          store_id: string
          visitor_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          product_id?: string | null
          referrer?: string | null
          store_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_balances: {
        Row: {
          available_balance: number | null
          pending_balance: number | null
          store_id: string | null
          total_earned: number | null
          total_paid: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          pending_balance?: number | null
          store_id?: string | null
          total_earned?: number | null
          total_paid?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          pending_balance?: number | null
          store_id?: string | null
          total_earned?: number | null
          total_paid?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_balances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_balances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      seller_campaigns: {
        Row: {
          apply_to_all: boolean
          category_ids: string[] | null
          created_at: string
          discount_percent: number
          ends_at: string
          id: string
          is_active: boolean
          name: string
          product_ids: string[] | null
          starts_at: string
          store_id: string
          updated_at: string
        }
        Insert: {
          apply_to_all?: boolean
          category_ids?: string[] | null
          created_at?: string
          discount_percent: number
          ends_at: string
          id?: string
          is_active?: boolean
          name: string
          product_ids?: string[] | null
          starts_at: string
          store_id: string
          updated_at?: string
        }
        Update: {
          apply_to_all?: boolean
          category_ids?: string[] | null
          created_at?: string
          discount_percent?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_ids?: string[] | null
          starts_at?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_discount_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount_percent: number | null
          max_uses: number | null
          min_order_amount: number | null
          product_ids: string[] | null
          starts_at: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_percent?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          product_ids?: string[] | null
          starts_at?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_percent?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          product_ids?: string[] | null
          starts_at?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_document_acknowledgements: {
        Row: {
          acknowledged_at: string
          acknowledged_by: string | null
          document_id: string
          id: string
          store_id: string
        }
        Insert: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          document_id: string
          id?: string
          store_id: string
        }
        Update: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          document_id?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_document_acknowledgements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "seller_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_document_acknowledgements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_document_acknowledgements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_document_notifications: {
        Row: {
          document_id: string
          id: string
          read_at: string | null
          sent_at: string
          store_id: string
        }
        Insert: {
          document_id: string
          id?: string
          read_at?: string | null
          sent_at?: string
          store_id: string
        }
        Update: {
          document_id?: string
          id?: string
          read_at?: string | null
          sent_at?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_document_notifications_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "seller_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_document_notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_document_notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_documents: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          external_url: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_active: boolean
          requires_acknowledgement: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_active?: boolean
          requires_acknowledgement?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_active?: boolean
          requires_acknowledgement?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_goals: {
        Row: {
          created_at: string
          current_amount: number
          ends_at: string
          goal_type: string
          id: string
          is_active: boolean
          period: string
          starts_at: string
          store_id: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          ends_at?: string
          goal_type?: string
          id?: string
          is_active?: boolean
          period?: string
          starts_at?: string
          store_id: string
          target_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          ends_at?: string
          goal_type?: string
          id?: string
          is_active?: boolean
          period?: string
          starts_at?: string
          store_id?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_goals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_goals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_import_quotas: {
        Row: {
          created_at: string
          free_limit: number
          id: string
          imports_used: number
          month: string
          store_id: string
        }
        Insert: {
          created_at?: string
          free_limit?: number
          id?: string
          imports_used?: number
          month: string
          store_id: string
        }
        Update: {
          created_at?: string
          free_limit?: number
          id?: string
          imports_used?: number
          month?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_import_quotas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_import_quotas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_notifications: {
        Row: {
          acknowledged_at: string | null
          action_url: string | null
          created_at: string
          id: string
          message: string
          product_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          product_id?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          product_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts: {
        Row: {
          amount: number
          auto_processed: boolean | null
          completed_at: string | null
          created_at: string | null
          failure_reason: string | null
          funding_requested_at: string | null
          funding_status: string | null
          id: string
          notes: string | null
          payout_method: string | null
          paypal_email: string | null
          processed_at: string | null
          processed_by: string | null
          processing_lock_id: string | null
          processing_locked_at: string | null
          seller_id: string
          status: string | null
          store_id: string
          stripe_funding_payout_id: string | null
          stripe_transfer_id: string | null
          wise_quote_id: string | null
          wise_transfer_id: string | null
        }
        Insert: {
          amount: number
          auto_processed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          funding_requested_at?: string | null
          funding_status?: string | null
          id?: string
          notes?: string | null
          payout_method?: string | null
          paypal_email?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processing_lock_id?: string | null
          processing_locked_at?: string | null
          seller_id: string
          status?: string | null
          store_id: string
          stripe_funding_payout_id?: string | null
          stripe_transfer_id?: string | null
          wise_quote_id?: string | null
          wise_transfer_id?: string | null
        }
        Update: {
          amount?: number
          auto_processed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          funding_requested_at?: string | null
          funding_status?: string | null
          id?: string
          notes?: string | null
          payout_method?: string | null
          paypal_email?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processing_lock_id?: string | null
          processing_locked_at?: string | null
          seller_id?: string
          status?: string | null
          store_id?: string
          stripe_funding_payout_id?: string | null
          stripe_transfer_id?: string | null
          wise_quote_id?: string | null
          wise_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seller_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_security_scores: {
        Row: {
          blocked_uploads: number
          created_at: string
          flagged_uploads: number
          id: string
          is_restricted: boolean | null
          last_violation_at: string | null
          restricted_at: string | null
          restricted_reason: string | null
          store_id: string
          total_uploads: number
          trust_score: number
          updated_at: string
          violation_types: Json | null
        }
        Insert: {
          blocked_uploads?: number
          created_at?: string
          flagged_uploads?: number
          id?: string
          is_restricted?: boolean | null
          last_violation_at?: string | null
          restricted_at?: string | null
          restricted_reason?: string | null
          store_id: string
          total_uploads?: number
          trust_score?: number
          updated_at?: string
          violation_types?: Json | null
        }
        Update: {
          blocked_uploads?: number
          created_at?: string
          flagged_uploads?: number
          id?: string
          is_restricted?: boolean | null
          last_violation_at?: string | null
          restricted_at?: string | null
          restricted_reason?: string | null
          store_id?: string
          total_uploads?: number
          trust_score?: number
          updated_at?: string
          violation_types?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_security_scores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_security_scores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_end: string | null
          id: string
          status: string
          store_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          id?: string
          status?: string
          store_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          id?: string
          status?: string
          store_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          change_reason: string | null
          created_at: string
          description: string
          escalated_at: string | null
          id: string
          last_staff_response_at: string | null
          link_change_type: string | null
          new_discord_username: string | null
          new_roblox_username: string | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          store_id: string | null
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          change_reason?: string | null
          created_at?: string
          description: string
          escalated_at?: string | null
          id?: string
          last_staff_response_at?: string | null
          link_change_type?: string | null
          new_discord_username?: string | null
          new_roblox_username?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          store_id?: string | null
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          change_reason?: string | null
          created_at?: string
          description?: string
          escalated_at?: string | null
          id?: string
          last_staff_response_at?: string | null
          link_change_type?: string | null
          new_discord_username?: string | null
          new_roblox_username?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          store_id?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_support_tickets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_support_tickets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_ticket_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "seller_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          escrow_frozen: boolean
          escrow_hold_until: string | null
          escrow_released_at: string | null
          gross_amount: number | null
          id: string
          metadata: Json | null
          net_amount: number | null
          net_before_commission: number | null
          order_id: string | null
          order_item_id: string | null
          platform_fee: number | null
          refund_id: string | null
          refunded_at: string | null
          seller_id: string
          status: string | null
          store_id: string
          stripe_fee: number | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          escrow_frozen?: boolean
          escrow_hold_until?: string | null
          escrow_released_at?: string | null
          gross_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          net_before_commission?: number | null
          order_id?: string | null
          order_item_id?: string | null
          platform_fee?: number | null
          refund_id?: string | null
          refunded_at?: string | null
          seller_id: string
          status?: string | null
          store_id: string
          stripe_fee?: number | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          escrow_frozen?: boolean
          escrow_hold_until?: string | null
          escrow_released_at?: string | null
          gross_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          net_before_commission?: number | null
          order_id?: string | null
          order_item_id?: string | null
          platform_fee?: number | null
          refund_id?: string | null
          refunded_at?: string | null
          seller_id?: string
          status?: string | null
          store_id?: string
          stripe_fee?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_transactions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seller_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          latency_ms: number | null
          payload: Json
          response_body: string | null
          status_code: number | null
          webhook_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          latency_ms?: number | null
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          webhook_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          latency_ms?: number | null
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "seller_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          last_status_code: number | null
          last_triggered_at: string | null
          secret: string
          store_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          secret?: string
          store_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          secret?: string
          store_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_webhooks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_webhooks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      staff_activity: {
        Row: {
          activity_type: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title?: string
        }
        Relationships: []
      }
      staff_chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_pinned: boolean
          message: string
          pinned_by: string | null
          reply_to_id: string | null
          thread_parent_id: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          message: string
          pinned_by?: string | null
          reply_to_id?: string | null
          thread_parent_id?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          message?: string
          pinned_by?: string | null
          reply_to_id?: string | null
          thread_parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "staff_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_chat_messages_thread_parent_id_fkey"
            columns: ["thread_parent_id"]
            isOneToOne: false
            referencedRelation: "staff_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "staff_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          staff_user_id: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          staff_user_id: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          staff_user_id?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      staff_duty_logs: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_id_logs: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          notes: string | null
          staff_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          notes?: string | null
          staff_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          notes?: string | null
          staff_id?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "staff_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          recipient_id: string | null
          sender_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          recipient_id?: string | null
          sender_id: string
          subject: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_id?: string | null
          sender_id?: string
          subject?: string
        }
        Relationships: []
      }
      staff_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          note_type: string | null
          staff_user_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          note_type?: string | null
          staff_user_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          note_type?: string | null
          staff_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_announcements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          link_url: string | null
          message: string
          pinned: boolean
          store_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          message: string
          pinned?: boolean
          store_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_url?: string | null
          message?: string
          pinned?: boolean
          store_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_announcements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_announcements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_applications: {
        Row: {
          age_confirmed: boolean
          auto_approved: boolean | null
          created_at: string | null
          discord_server_invite: string | null
          expected_products: string | null
          experience: string | null
          id: string
          notes: string | null
          portfolio_url: string | null
          product_category: string | null
          recruited_by: string | null
          recruiter_code: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          store_description: string | null
          store_name: string
          terms_accepted: boolean
          terms_accepted_at: string | null
          updated_at: string | null
          user_id: string
          verification_results: Json | null
        }
        Insert: {
          age_confirmed?: boolean
          auto_approved?: boolean | null
          created_at?: string | null
          discord_server_invite?: string | null
          expected_products?: string | null
          experience?: string | null
          id?: string
          notes?: string | null
          portfolio_url?: string | null
          product_category?: string | null
          recruited_by?: string | null
          recruiter_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          store_description?: string | null
          store_name: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id: string
          verification_results?: Json | null
        }
        Update: {
          age_confirmed?: boolean
          auto_approved?: boolean | null
          created_at?: string | null
          discord_server_invite?: string | null
          expected_products?: string | null
          experience?: string | null
          id?: string
          notes?: string | null
          portfolio_url?: string | null
          product_category?: string | null
          recruited_by?: string | null
          recruiter_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          store_description?: string | null
          store_name?: string
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string
          verification_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "store_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      store_categories: {
        Row: {
          category_id: string
          created_at: string
          display_order: number | null
          id: string
          is_enabled: boolean
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_enabled?: boolean
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_conversations: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          last_message_at: string
          order_id: string | null
          status: string
          store_id: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          last_message_at?: string
          order_id?: string | null
          status?: string
          store_id: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          last_message_at?: string
          order_id?: string | null
          status?: string
          store_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_credentials: {
        Row: {
          cloudflare_api_token: string | null
          cloudflare_zone_id: string | null
          created_at: string
          discord_bot_token: string | null
          discord_guild_id: string | null
          discord_role_id: string | null
          discord_webhook_url: string | null
          disputes_channel_id: string | null
          early_product_drops_role_id: string | null
          id: string
          orders_channel_id: string | null
          product_drops_role_id: string | null
          product_feed_channel_id: string | null
          refunds_channel_id: string | null
          review_discord_webhook_url: string | null
          sales_channel_id: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          cloudflare_api_token?: string | null
          cloudflare_zone_id?: string | null
          created_at?: string
          discord_bot_token?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          discord_webhook_url?: string | null
          disputes_channel_id?: string | null
          early_product_drops_role_id?: string | null
          id?: string
          orders_channel_id?: string | null
          product_drops_role_id?: string | null
          product_feed_channel_id?: string | null
          refunds_channel_id?: string | null
          review_discord_webhook_url?: string | null
          sales_channel_id?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          cloudflare_api_token?: string | null
          cloudflare_zone_id?: string | null
          created_at?: string
          discord_bot_token?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          discord_webhook_url?: string | null
          disputes_channel_id?: string | null
          early_product_drops_role_id?: string | null
          id?: string
          orders_channel_id?: string | null
          product_drops_role_id?: string | null
          product_feed_channel_id?: string | null
          refunds_channel_id?: string | null
          review_discord_webhook_url?: string | null
          sales_channel_id?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_custom_sections: {
        Row: {
          content: Json
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          section_type: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_type: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          section_type?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_custom_sections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_custom_sections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_domain_billing: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          store_domain_id: string | null
          store_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          store_domain_id?: string | null
          store_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          store_domain_id?: string | null
          store_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_domain_billing_store_domain_id_fkey"
            columns: ["store_domain_id"]
            isOneToOne: false
            referencedRelation: "store_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_domain_billing_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_domain_billing_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_domains: {
        Row: {
          cloudflare_hostname_id: string | null
          created_at: string
          domain: string
          domain_type: string
          id: string
          is_cloudflare_zone: boolean | null
          is_primary: boolean
          last_health_check: Json | null
          last_health_check_at: string | null
          ssl_status: string
          status: string
          store_id: string
          updated_at: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          cloudflare_hostname_id?: string | null
          created_at?: string
          domain: string
          domain_type?: string
          id?: string
          is_cloudflare_zone?: boolean | null
          is_primary?: boolean
          last_health_check?: Json | null
          last_health_check_at?: string | null
          ssl_status?: string
          status?: string
          store_id: string
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          cloudflare_hostname_id?: string | null
          created_at?: string
          domain?: string
          domain_type?: string
          id?: string
          is_cloudflare_zone?: boolean | null
          is_primary?: boolean
          last_health_check?: Json | null
          last_health_check_at?: string | null
          ssl_status?: string
          status?: string
          store_id?: string
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_follows: {
        Row: {
          created_at: string
          id: string
          notify_discounts: boolean | null
          notify_new_products: boolean | null
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_discounts?: boolean | null
          notify_new_products?: boolean | null
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_discounts?: boolean | null
          notify_new_products?: boolean | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_follows_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_follows_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_health_scores: {
        Row: {
          active_violations: number
          avg_response_hours: number
          created_at: string
          delivery_rate: number
          dispute_rate: number
          id: string
          last_calculated_at: string
          listing_quality_score: number
          overall_score: number
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          active_violations?: number
          avg_response_hours?: number
          created_at?: string
          delivery_rate?: number
          dispute_rate?: number
          id?: string
          last_calculated_at?: string
          listing_quality_score?: number
          overall_score?: number
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          active_violations?: number
          avg_response_hours?: number
          created_at?: string
          delivery_rate?: number
          dispute_rate?: number
          id?: string
          last_calculated_at?: string
          listing_quality_score?: number
          overall_score?: number
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_health_scores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_health_scores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_messages: {
        Row: {
          conversation_id: string
          created_at: string
          customer_id: string
          id: string
          is_read: boolean
          message: string
          order_id: string | null
          sender_type: string
          store_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          customer_id: string
          id?: string
          is_read?: boolean
          message: string
          order_id?: string | null
          sender_type: string
          store_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string | null
          sender_type?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "store_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_nav_links: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          label: string
          link_type: string
          store_id: string
          target_id: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          label: string
          link_type?: string
          store_id: string
          target_id?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          label?: string
          link_type?: string
          store_id?: string
          target_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_nav_links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_nav_links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_pages: {
        Row: {
          content: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_published: boolean | null
          slug: string
          store_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          slug: string
          store_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          slug?: string
          store_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_pages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_pages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_details: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_country: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bank_swift_bic: string | null
          created_at: string | null
          details_submitted: boolean | null
          id: string
          payout_method: string | null
          payouts_enabled: boolean | null
          paypal_email: string | null
          store_id: string
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bank_swift_bic?: string | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          payout_method?: string | null
          payouts_enabled?: boolean | null
          paypal_email?: string | null
          store_id: string
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bank_swift_bic?: string | null
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string
          payout_method?: string | null
          payouts_enabled?: boolean | null
          paypal_email?: string | null
          store_id?: string
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_details_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payment_details_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tab_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          tab_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          tab_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          tab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tab_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tab_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tab_products_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "store_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tabs: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tabs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tabs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_team_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["store_team_role"]
          store_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["store_team_role"]
          store_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["store_team_role"]
          store_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_team_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_team_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string
          role: Database["public"]["Enums"]["store_team_role"]
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          role?: Database["public"]["Enums"]["store_team_role"]
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["store_team_role"]
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_team_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_team_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_team_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_team_permissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_team_permissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_welcome_embeds: {
        Row: {
          channel_id: string | null
          color: string | null
          created_at: string
          description: string | null
          enabled: boolean
          fields: Json | null
          footer_text: string | null
          id: string
          image_url: string | null
          store_id: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          channel_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          fields?: Json | null
          footer_text?: string | null
          id?: string
          image_url?: string | null
          store_id: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          fields?: Json | null
          footer_text?: string | null
          id?: string
          image_url?: string | null
          store_id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_welcome_embeds_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_welcome_embeds_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          about_content: string | null
          accent_color: string | null
          announcement_active: boolean | null
          announcement_text: string | null
          average_rating: number | null
          banner_end_at: string | null
          banner_start_at: string | null
          banner_url: string | null
          bio: string | null
          commission_rate: number | null
          created_at: string | null
          custom_commission_rate: number | null
          custom_css: string | null
          custom_rate_expires_at: string | null
          custom_rate_set_at: string | null
          custom_rate_set_by: string | null
          deleted_at: string | null
          description: string | null
          discord_guild_id: string | null
          discord_showcase_thread_id: string | null
          discord_url: string | null
          eclipse_plus_discount_enabled: boolean
          favicon_url: string | null
          featured_product_ids: string[] | null
          follower_count: number | null
          font_body: string | null
          font_heading: string | null
          free_commission_until: string | null
          hero_cta_link: string | null
          hero_cta_text: string | null
          hero_subtitle: string | null
          hero_title: string | null
          hide_branding: boolean | null
          id: string
          is_active: boolean | null
          is_testing: boolean
          is_trusted: boolean | null
          is_verified: boolean | null
          layout_style: string | null
          leak_scan_enabled: boolean
          logo_url: string | null
          name: string
          owner_id: string
          payout_method: string
          product_count: number | null
          pwyw_enabled: boolean
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roblox_gamepass_discount_enabled: boolean | null
          roblox_gamepass_discount_percent: number | null
          roblox_gamepass_id: string | null
          roblox_group_discount_enabled: boolean | null
          roblox_group_discount_percent: number | null
          roblox_group_id: string | null
          roblox_group_min_rank: number | null
          roblox_premium_discount_enabled: boolean | null
          roblox_premium_discount_percent: number | null
          roblox_url: string | null
          show_reviews: boolean | null
          show_social_proof: boolean | null
          slug: string
          status: string | null
          store_id: string
          store_layout: Json | null
          theme: string | null
          tiktok_url: string | null
          total_revenue: number | null
          total_sales: number | null
          twitter_url: string | null
          updated_at: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          about_content?: string | null
          accent_color?: string | null
          announcement_active?: boolean | null
          announcement_text?: string | null
          average_rating?: number | null
          banner_end_at?: string | null
          banner_start_at?: string | null
          banner_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string | null
          custom_commission_rate?: number | null
          custom_css?: string | null
          custom_rate_expires_at?: string | null
          custom_rate_set_at?: string | null
          custom_rate_set_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discord_guild_id?: string | null
          discord_showcase_thread_id?: string | null
          discord_url?: string | null
          eclipse_plus_discount_enabled?: boolean
          favicon_url?: string | null
          featured_product_ids?: string[] | null
          follower_count?: number | null
          font_body?: string | null
          font_heading?: string | null
          free_commission_until?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hide_branding?: boolean | null
          id?: string
          is_active?: boolean | null
          is_testing?: boolean
          is_trusted?: boolean | null
          is_verified?: boolean | null
          layout_style?: string | null
          leak_scan_enabled?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          payout_method?: string
          product_count?: number | null
          pwyw_enabled?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roblox_gamepass_discount_enabled?: boolean | null
          roblox_gamepass_discount_percent?: number | null
          roblox_gamepass_id?: string | null
          roblox_group_discount_enabled?: boolean | null
          roblox_group_discount_percent?: number | null
          roblox_group_id?: string | null
          roblox_group_min_rank?: number | null
          roblox_premium_discount_enabled?: boolean | null
          roblox_premium_discount_percent?: number | null
          roblox_url?: string | null
          show_reviews?: boolean | null
          show_social_proof?: boolean | null
          slug: string
          status?: string | null
          store_id: string
          store_layout?: Json | null
          theme?: string | null
          tiktok_url?: string | null
          total_revenue?: number | null
          total_sales?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_content?: string | null
          accent_color?: string | null
          announcement_active?: boolean | null
          announcement_text?: string | null
          average_rating?: number | null
          banner_end_at?: string | null
          banner_start_at?: string | null
          banner_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string | null
          custom_commission_rate?: number | null
          custom_css?: string | null
          custom_rate_expires_at?: string | null
          custom_rate_set_at?: string | null
          custom_rate_set_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discord_guild_id?: string | null
          discord_showcase_thread_id?: string | null
          discord_url?: string | null
          eclipse_plus_discount_enabled?: boolean
          favicon_url?: string | null
          featured_product_ids?: string[] | null
          follower_count?: number | null
          font_body?: string | null
          font_heading?: string | null
          free_commission_until?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hide_branding?: boolean | null
          id?: string
          is_active?: boolean | null
          is_testing?: boolean
          is_trusted?: boolean | null
          is_verified?: boolean | null
          layout_style?: string | null
          leak_scan_enabled?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          payout_method?: string
          product_count?: number | null
          pwyw_enabled?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roblox_gamepass_discount_enabled?: boolean | null
          roblox_gamepass_discount_percent?: number | null
          roblox_gamepass_id?: string | null
          roblox_group_discount_enabled?: boolean | null
          roblox_group_discount_percent?: number | null
          roblox_group_id?: string | null
          roblox_group_min_rank?: number | null
          roblox_premium_discount_enabled?: boolean | null
          roblox_premium_discount_percent?: number | null
          roblox_url?: string | null
          show_reviews?: boolean | null
          show_social_proof?: boolean | null
          slug?: string
          status?: string | null
          store_id?: string
          store_layout?: Json | null
          theme?: string | null
          tiktok_url?: string | null
          total_revenue?: number | null
          total_sales?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_free_claims: {
        Row: {
          claim_period: string
          claimed_at: string
          id: string
          order_id: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          claim_period: string
          claimed_at?: string
          id?: string
          order_id?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          claim_period?: string
          claimed_at?: string
          id?: string
          order_id?: string | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_free_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_free_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_seller_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_free_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_free_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          annual_price_gbp: number
          created_at: string | null
          description: string | null
          discount_percentage: number
          display_order: number | null
          features: Json | null
          free_products_per_month: number
          id: string
          is_active: boolean | null
          monthly_price_gbp: number
          name: string
          stripe_annual_price_id: string | null
          stripe_monthly_price_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
        }
        Insert: {
          annual_price_gbp: number
          created_at?: string | null
          description?: string | null
          discount_percentage?: number
          display_order?: number | null
          features?: Json | null
          free_products_per_month?: number
          id?: string
          is_active?: boolean | null
          monthly_price_gbp: number
          name: string
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Update: {
          annual_price_gbp?: number
          created_at?: string | null
          description?: string | null
          discount_percentage?: number
          display_order?: number | null
          features?: Json | null
          free_products_per_month?: number
          id?: string
          is_active?: boolean | null
          monthly_price_gbp?: number
          name?: string
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_period:
            | Database["public"]["Enums"]["subscription_billing_period"]
            | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grant_reason: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?:
            | Database["public"]["Enums"]["subscription_billing_period"]
            | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grant_reason?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?:
            | Database["public"]["Enums"]["subscription_billing_period"]
            | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grant_reason?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          customer_email: string
          escalated_at: string | null
          id: string
          last_staff_response_at: string | null
          priority: string | null
          status: string
          subject: string
          ticket_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          customer_email: string
          escalated_at?: string | null
          id?: string
          last_staff_response_at?: string | null
          priority?: string | null
          status?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          customer_email?: string
          escalated_at?: string | null
          id?: string
          last_staff_response_at?: string | null
          priority?: string | null
          status?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      takedown_requests: {
        Row: {
          accuracy_statement: boolean
          agent_authorization: boolean | null
          case_number: string
          claimant_address: string | null
          claimant_email: string | null
          claimant_name: string | null
          counter_notice_deadline: string | null
          counter_notice_details: string | null
          counter_notice_received_at: string | null
          created_at: string
          creator_id: string
          dmca_sent_at: string | null
          dmca_sent_to_email: string | null
          evidence_notes: string | null
          evidence_urls: string[] | null
          filing_method: string | null
          good_faith_statement: boolean
          id: string
          infringement_type: string
          infringing_evidence_screenshots: string[] | null
          infringing_url: string
          last_recheck_at: string | null
          notice_sent_at: string | null
          notice_sent_to: string | null
          offender_roblox_id: string | null
          offender_roblox_username: string | null
          original_proof_screenshots: string[] | null
          original_work_description: string
          original_work_url: string | null
          ownership_confirmed: boolean
          priority: string
          recheck_count: number | null
          recheck_results: Json | null
          rejection_reason: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          store_id: string | null
          target_platform: string
          target_platform_other: string | null
          updated_at: string
        }
        Insert: {
          accuracy_statement?: boolean
          agent_authorization?: boolean | null
          case_number: string
          claimant_address?: string | null
          claimant_email?: string | null
          claimant_name?: string | null
          counter_notice_deadline?: string | null
          counter_notice_details?: string | null
          counter_notice_received_at?: string | null
          created_at?: string
          creator_id: string
          dmca_sent_at?: string | null
          dmca_sent_to_email?: string | null
          evidence_notes?: string | null
          evidence_urls?: string[] | null
          filing_method?: string | null
          good_faith_statement?: boolean
          id?: string
          infringement_type: string
          infringing_evidence_screenshots?: string[] | null
          infringing_url: string
          last_recheck_at?: string | null
          notice_sent_at?: string | null
          notice_sent_to?: string | null
          offender_roblox_id?: string | null
          offender_roblox_username?: string | null
          original_proof_screenshots?: string[] | null
          original_work_description: string
          original_work_url?: string | null
          ownership_confirmed?: boolean
          priority?: string
          recheck_count?: number | null
          recheck_results?: Json | null
          rejection_reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          store_id?: string | null
          target_platform: string
          target_platform_other?: string | null
          updated_at?: string
        }
        Update: {
          accuracy_statement?: boolean
          agent_authorization?: boolean | null
          case_number?: string
          claimant_address?: string | null
          claimant_email?: string | null
          claimant_name?: string | null
          counter_notice_deadline?: string | null
          counter_notice_details?: string | null
          counter_notice_received_at?: string | null
          created_at?: string
          creator_id?: string
          dmca_sent_at?: string | null
          dmca_sent_to_email?: string | null
          evidence_notes?: string | null
          evidence_urls?: string[] | null
          filing_method?: string | null
          good_faith_statement?: boolean
          id?: string
          infringement_type?: string
          infringing_evidence_screenshots?: string[] | null
          infringing_url?: string
          last_recheck_at?: string | null
          notice_sent_at?: string | null
          notice_sent_to?: string | null
          offender_roblox_id?: string | null
          offender_roblox_username?: string | null
          original_proof_screenshots?: string[] | null
          original_work_description?: string
          original_work_url?: string | null
          ownership_confirmed?: boolean
          priority?: string
          recheck_count?: number | null
          recheck_results?: Json | null
          rejection_reason?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          store_id?: string | null
          target_platform?: string
          target_platform_other?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takedown_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takedown_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal_note: boolean | null
          message: string
          sender_id: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal_note?: boolean | null
          message: string
          sender_id?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal_note?: boolean | null
          message?: string
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      twitter_hashtags: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          tag: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          tag: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          tag?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      twitter_posts: {
        Row: {
          ai_generated: boolean | null
          content: string
          created_at: string
          created_by: string | null
          hashtags_used: string[]
          id: string
          post_type: string
          posted_at: string | null
          scheduled_for: string | null
          status: string
          tweet_id: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          content: string
          created_at?: string
          created_by?: string | null
          hashtags_used?: string[]
          id?: string
          post_type?: string
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          tweet_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          content?: string
          created_at?: string
          created_by?: string | null
          hashtags_used?: string[]
          id?: string
          post_type?: string
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          tweet_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_category_affinity: {
        Row: {
          affinity_score: number
          category_id: string
          created_at: string
          id: string
          interaction_count: number
          last_interaction_at: string
          user_id: string
        }
        Insert: {
          affinity_score?: number
          category_id: string
          created_at?: string
          id?: string
          interaction_count?: number
          last_interaction_at?: string
          user_id: string
        }
        Update: {
          affinity_score?: number
          category_id?: string
          created_at?: string
          id?: string
          interaction_count?: number
          last_interaction_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_affinity_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ip_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string
          user_id?: string
        }
        Relationships: []
      }
      user_payment_details: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_country: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bank_swift_bic: string | null
          created_at: string
          paypal_email: string | null
          preferred_payout_method: string | null
          stripe_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bank_swift_bic?: string | null
          created_at?: string
          paypal_email?: string | null
          preferred_payout_method?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bank_swift_bic?: string | null
          created_at?: string
          paypal_email?: string | null
          preferred_payout_method?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          hierarchy_level: number | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hierarchy_level?: number | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          hierarchy_level?: number | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["name"]
          },
        ]
      }
      webhook_delivery_logs: {
        Row: {
          attempt_number: number
          created_at: string
          error_message: string | null
          event: string
          id: string
          latency_ms: number | null
          payload_size_bytes: number | null
          response_body: string | null
          status_code: number | null
          webhook_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          error_message?: string | null
          event: string
          id?: string
          latency_ms?: number | null
          payload_size_bytes?: number | null
          response_body?: string | null
          status_code?: number | null
          webhook_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          error_message?: string | null
          event?: string
          id?: string
          latency_ms?: number | null
          payload_size_bytes?: number | null
          response_body?: string | null
          status_code?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "seller_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      wise_funding_requests: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          linked_payout_ids: string[] | null
          notes: string | null
          requested_at: string | null
          status: string | null
          stripe_payout_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          linked_payout_ids?: string[] | null
          notes?: string | null
          requested_at?: string | null
          status?: string | null
          stripe_payout_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          linked_payout_ids?: string[] | null
          notes?: string | null
          requested_at?: string | null
          status?: string | null
          stripe_payout_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_podcasts: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          error_message: string | null
          id: string
          privacy_status: string
          published_at: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          video_file_url: string
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          privacy_status?: string
          published_at?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          video_file_url: string
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          privacy_status?: string
          published_at?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          video_file_url?: string
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      affiliate_payouts_masked: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string | null
          notes: string | null
          payout_method: string | null
          paypal_email: string | null
          processed_at: string | null
          processed_by: string | null
          status: string | null
          stripe_account_id: string | null
          stripe_transfer_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          notes?: string | null
          payout_method?: string | null
          paypal_email?: never
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          notes?: string | null
          payout_method?: string | null
          paypal_email?: never
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_transfer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      affiliate_payouts_safe: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string | null
          notes: string | null
          payout_method: string | null
          paypal_email: string | null
          processed_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          notes?: string | null
          payout_method?: string | null
          paypal_email?: string | null
          processed_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string | null
          notes?: string | null
          payout_method?: string | null
          paypal_email?: string | null
          processed_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      discord_trivia_questions_safe: {
        Row: {
          category: string | null
          created_at: string | null
          difficulty: string | null
          id: string | null
          question: string | null
          wrong_answers: string[] | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string | null
          question?: string | null
          wrong_answers?: string[] | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string | null
          question?: string | null
          wrong_answers?: string[] | null
        }
        Relationships: []
      }
      orders_seller_view: {
        Row: {
          created_at: string | null
          customer_email: string | null
          discount_amount: number | null
          discount_code_id: string | null
          id: string | null
          payment_id: string | null
          payment_method: string | null
          refund_amount: number | null
          refund_id: string | null
          refunded_at: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: never
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refunded_at?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: never
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refunded_at?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_searches: {
        Row: {
          last_searched: string | null
          search_count: number | null
          term: string | null
        }
        Relationships: []
      }
      products_public: {
        Row: {
          category_id: string | null
          created_at: string | null
          deleted_at: string | null
          delivery_type: string | null
          description: string | null
          download_count: number | null
          early_access_hours: number | null
          eclipse_free_eligible: boolean | null
          external_link: string | null
          id: string | null
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_pay_what_you_want: boolean | null
          is_resellable: boolean | null
          is_seller_product: boolean | null
          min_price: number | null
          moderation_status: string | null
          name: string | null
          price: number | null
          release_at: string | null
          robux_enabled: boolean | null
          robux_price: number | null
          seller_price: number | null
          slug: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_type?: string | null
          description?: string | null
          download_count?: number | null
          early_access_hours?: number | null
          eclipse_free_eligible?: boolean | null
          external_link?: string | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_pay_what_you_want?: boolean | null
          is_resellable?: boolean | null
          is_seller_product?: boolean | null
          min_price?: number | null
          moderation_status?: string | null
          name?: string | null
          price?: number | null
          release_at?: string | null
          robux_enabled?: boolean | null
          robux_price?: number | null
          seller_price?: number | null
          slug?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivery_type?: string | null
          description?: string | null
          download_count?: number | null
          early_access_hours?: number | null
          eclipse_free_eligible?: boolean | null
          external_link?: string | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_pay_what_you_want?: boolean | null
          is_resellable?: boolean | null
          is_seller_product?: boolean | null
          min_price?: number | null
          moderation_status?: string | null
          name?: string | null
          price?: number | null
          release_at?: string | null
          robux_enabled?: boolean | null
          robux_price?: number | null
          seller_price?: number | null
          slug?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts_masked: {
        Row: {
          amount: number | null
          auto_processed: boolean | null
          completed_at: string | null
          created_at: string | null
          failure_reason: string | null
          funding_requested_at: string | null
          funding_status: string | null
          id: string | null
          notes: string | null
          payout_method: string | null
          paypal_email: string | null
          processed_at: string | null
          processed_by: string | null
          seller_id: string | null
          status: string | null
          store_id: string | null
          stripe_funding_payout_id: string | null
          stripe_transfer_id: string | null
          wise_quote_id: string | null
          wise_transfer_id: string | null
        }
        Insert: {
          amount?: number | null
          auto_processed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          funding_requested_at?: string | null
          funding_status?: string | null
          id?: string | null
          notes?: string | null
          payout_method?: string | null
          paypal_email?: never
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string | null
          status?: string | null
          store_id?: string | null
          stripe_funding_payout_id?: string | null
          stripe_transfer_id?: string | null
          wise_quote_id?: string | null
          wise_transfer_id?: string | null
        }
        Update: {
          amount?: number | null
          auto_processed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          funding_requested_at?: string | null
          funding_status?: string | null
          id?: string | null
          notes?: string | null
          payout_method?: string | null
          paypal_email?: never
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string | null
          status?: string | null
          store_id?: string | null
          stripe_funding_payout_id?: string | null
          stripe_transfer_id?: string | null
          wise_quote_id?: string | null
          wise_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seller_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts_safe: {
        Row: {
          amount: number | null
          auto_processed: boolean | null
          completed_at: string | null
          created_at: string | null
          failure_reason: string | null
          funding_requested_at: string | null
          funding_status: string | null
          id: string | null
          notes: string | null
          payout_method: string | null
          paypal_email: string | null
          processed_at: string | null
          processed_by: string | null
          seller_id: string | null
          status: string | null
          store_id: string | null
        }
        Insert: {
          amount?: number | null
          auto_processed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          funding_requested_at?: string | null
          funding_status?: string | null
          id?: string | null
          notes?: string | null
          payout_method?: string | null
          paypal_email?: string | null
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string | null
          status?: string | null
          store_id?: string | null
        }
        Update: {
          amount?: number | null
          auto_processed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          failure_reason?: string | null
          funding_requested_at?: string | null
          funding_status?: string | null
          id?: string | null
          notes?: string | null
          payout_method?: string | null
          paypal_email?: string | null
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string | null
          status?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seller_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance_summary: {
        Row: {
          chats_claimed: number | null
          chats_completed: number | null
          display_name: string | null
          duty_hours_30d: number | null
          last_active_at: string | null
          staff_id: string | null
          tickets_claimed: number | null
          tickets_resolved: number | null
          total_actions: number | null
          user_id: string | null
        }
        Relationships: []
      }
      store_credentials_safe: {
        Row: {
          cloudflare_api_token: string | null
          cloudflare_zone_id: string | null
          created_at: string | null
          discord_bot_token: string | null
          discord_guild_id: string | null
          discord_role_id: string | null
          discord_webhook_url: string | null
          disputes_channel_id: string | null
          early_product_drops_role_id: string | null
          id: string | null
          orders_channel_id: string | null
          product_drops_role_id: string | null
          product_feed_channel_id: string | null
          refunds_channel_id: string | null
          review_discord_webhook_url: string | null
          sales_channel_id: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          cloudflare_api_token?: never
          cloudflare_zone_id?: string | null
          created_at?: string | null
          discord_bot_token?: never
          discord_guild_id?: string | null
          discord_role_id?: string | null
          discord_webhook_url?: string | null
          disputes_channel_id?: string | null
          early_product_drops_role_id?: string | null
          id?: string | null
          orders_channel_id?: string | null
          product_drops_role_id?: string | null
          product_feed_channel_id?: string | null
          refunds_channel_id?: string | null
          review_discord_webhook_url?: string | null
          sales_channel_id?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cloudflare_api_token?: never
          cloudflare_zone_id?: string | null
          created_at?: string | null
          discord_bot_token?: never
          discord_guild_id?: string | null
          discord_role_id?: string | null
          discord_webhook_url?: string | null
          disputes_channel_id?: string | null
          early_product_drops_role_id?: string | null
          id?: string | null
          orders_channel_id?: string | null
          product_drops_role_id?: string | null
          product_feed_channel_id?: string | null
          refunds_channel_id?: string | null
          review_discord_webhook_url?: string | null
          sales_channel_id?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_domains_public: {
        Row: {
          domain: string | null
          domain_type: string | null
          is_primary: boolean | null
          status: string | null
          store_id: string | null
        }
        Insert: {
          domain?: string | null
          domain_type?: string | null
          is_primary?: boolean | null
          status?: string | null
          store_id?: string | null
        }
        Update: {
          domain?: string | null
          domain_type?: string | null
          is_primary?: boolean | null
          status?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_details_masked: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_country: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bank_swift_bic: string | null
          created_at: string | null
          details_submitted: boolean | null
          id: string | null
          payout_method: string | null
          payouts_enabled: boolean | null
          paypal_email: string | null
          store_id: string | null
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: never
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: never
          bank_swift_bic?: never
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string | null
          payout_method?: string | null
          payouts_enabled?: boolean | null
          paypal_email?: never
          store_id?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: never
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: never
          bank_swift_bic?: never
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string | null
          payout_method?: string | null
          payouts_enabled?: boolean | null
          paypal_email?: never
          store_id?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_details_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payment_details_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_details_safe: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_country: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bank_swift_bic: string | null
          created_at: string | null
          details_submitted: boolean | null
          id: string | null
          payout_method: string | null
          payouts_enabled: boolean | null
          paypal_email: string | null
          store_id: string | null
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: never
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: never
          bank_swift_bic?: never
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string | null
          payout_method?: string | null
          payouts_enabled?: boolean | null
          paypal_email?: string | null
          store_id?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: never
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: never
          bank_swift_bic?: never
          created_at?: string | null
          details_submitted?: boolean | null
          id?: string | null
          payout_method?: string | null
          payouts_enabled?: boolean | null
          paypal_email?: string | null
          store_id?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_details_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payment_details_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stores_public: {
        Row: {
          about_content: string | null
          accent_color: string | null
          announcement_active: boolean | null
          announcement_text: string | null
          average_rating: number | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          custom_css: string | null
          description: string | null
          discord_url: string | null
          favicon_url: string | null
          featured_product_ids: string[] | null
          follower_count: number | null
          font_body: string | null
          font_heading: string | null
          hero_cta_link: string | null
          hero_cta_text: string | null
          hero_subtitle: string | null
          hero_title: string | null
          hide_branding: boolean | null
          id: string | null
          is_active: boolean | null
          is_trusted: boolean | null
          is_verified: boolean | null
          layout_style: string | null
          logo_url: string | null
          name: string | null
          owner_id: string | null
          product_count: number | null
          pwyw_enabled: boolean | null
          roblox_gamepass_discount_enabled: boolean | null
          roblox_gamepass_discount_percent: number | null
          roblox_gamepass_id: string | null
          roblox_group_discount_enabled: boolean | null
          roblox_group_discount_percent: number | null
          roblox_group_id: string | null
          roblox_group_min_rank: number | null
          roblox_premium_discount_enabled: boolean | null
          roblox_premium_discount_percent: number | null
          roblox_url: string | null
          show_reviews: boolean | null
          show_social_proof: boolean | null
          slug: string | null
          status: string | null
          store_layout: Json | null
          theme: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          about_content?: string | null
          accent_color?: string | null
          announcement_active?: boolean | null
          announcement_text?: string | null
          average_rating?: number | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_css?: string | null
          description?: string | null
          discord_url?: string | null
          favicon_url?: string | null
          featured_product_ids?: string[] | null
          follower_count?: number | null
          font_body?: string | null
          font_heading?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hide_branding?: boolean | null
          id?: string | null
          is_active?: boolean | null
          is_trusted?: boolean | null
          is_verified?: boolean | null
          layout_style?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          product_count?: number | null
          pwyw_enabled?: boolean | null
          roblox_gamepass_discount_enabled?: boolean | null
          roblox_gamepass_discount_percent?: number | null
          roblox_gamepass_id?: string | null
          roblox_group_discount_enabled?: boolean | null
          roblox_group_discount_percent?: number | null
          roblox_group_id?: string | null
          roblox_group_min_rank?: number | null
          roblox_premium_discount_enabled?: boolean | null
          roblox_premium_discount_percent?: number | null
          roblox_url?: string | null
          show_reviews?: boolean | null
          show_social_proof?: boolean | null
          slug?: string | null
          status?: string | null
          store_layout?: Json | null
          theme?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          about_content?: string | null
          accent_color?: string | null
          announcement_active?: boolean | null
          announcement_text?: string | null
          average_rating?: number | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          custom_css?: string | null
          description?: string | null
          discord_url?: string | null
          favicon_url?: string | null
          featured_product_ids?: string[] | null
          follower_count?: number | null
          font_body?: string | null
          font_heading?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hide_branding?: boolean | null
          id?: string | null
          is_active?: boolean | null
          is_trusted?: boolean | null
          is_verified?: boolean | null
          layout_style?: string | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          product_count?: number | null
          pwyw_enabled?: boolean | null
          roblox_gamepass_discount_enabled?: boolean | null
          roblox_gamepass_discount_percent?: number | null
          roblox_gamepass_id?: string | null
          roblox_group_discount_enabled?: boolean | null
          roblox_group_discount_percent?: number | null
          roblox_group_id?: string | null
          roblox_group_min_rank?: number | null
          roblox_premium_discount_enabled?: boolean | null
          roblox_premium_discount_percent?: number | null
          roblox_url?: string | null
          show_reviews?: boolean | null
          show_social_proof?: boolean | null
          slug?: string | null
          status?: string | null
          store_layout?: Json | null
          theme?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_payment_details_safe: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_country: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bank_swift_bic: string | null
          created_at: string | null
          paypal_email: string | null
          preferred_payout_method: string | null
          stripe_account_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: never
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: never
          bank_swift_bic?: never
          created_at?: string | null
          paypal_email?: string | null
          preferred_payout_method?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: never
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: never
          bank_swift_bic?: never
          created_at?: string | null
          paypal_email?: string | null
          preferred_payout_method?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_gifted_by?: string
          p_order_id?: string
          p_reference_id?: string
          p_type: Database["public"]["Enums"]["credit_transaction_type"]
          p_user_id: string
        }
        Returns: {
          amount: number
          created_at: string
          description: string | null
          gifted_by: string | null
          id: string
          order_id: string | null
          reference_id: string | null
          type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "credit_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_discord_xp: {
        Args: {
          p_discord_id: string
          p_discord_username: string
          p_user_id?: string
          p_xp_amount: number
        }
        Returns: {
          leveled_up: boolean
          new_level: number
          new_xp: number
          old_level: number
        }[]
      }
      add_loyalty_points: {
        Args: {
          p_description?: string
          p_points: number
          p_reference_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      auth_user_exists: { Args: { _user_id: string }; Returns: boolean }
      auto_escalate_all_tickets: { Args: never; Returns: Json }
      burn_reset_code: { Args: { p_id: string }; Returns: undefined }
      calculate_level_from_xp: { Args: { xp: number }; Returns: number }
      can_access_realtime_topic: { Args: { _topic: string }; Returns: boolean }
      can_assign_role: {
        Args: { _assigner_id: string; _target_role: string }
        Returns: boolean
      }
      can_create_role: {
        Args: {
          _creator_id: string
          _new_hierarchy_level: number
          _new_permission_ids?: string[]
        }
        Returns: boolean
      }
      can_manage_specific_role: {
        Args: { _target_role: string; _user_id: string }
        Returns: boolean
      }
      can_manage_user_roles: {
        Args: { _assigner_id: string; _target_user_id: string }
        Returns: boolean
      }
      can_seller_upload: { Args: { p_store_id: string }; Returns: boolean }
      can_user_download: { Args: { _user_id: string }; Returns: boolean }
      charge_promotion_impression: {
        Args: { p_count?: number; p_promotion_id: string }
        Returns: boolean
      }
      check_and_award_badges: {
        Args: { _user_id: string }
        Returns: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_badges"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      check_download_rate_limit: {
        Args: {
          p_max_downloads_per_day?: number
          p_product_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_global_download_rate_limit: {
        Args: { p_max_downloads_per_hour?: number; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      claim_eclipse_plus_credit_bonus: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      claim_payout_for_processing: {
        Args: {
          p_expected_status: string
          p_lock_id: string
          p_payout_id: string
        }
        Returns: boolean
      }
      cleanup_expired_download_tokens: { Args: never; Returns: undefined }
      cleanup_expired_link_codes: { Args: never; Returns: undefined }
      cleanup_expired_tracking_data: { Args: never; Returns: Json }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      deduct_seller_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      escalate_dispute: {
        Args: { p_dispute_id: string; p_reason: string }
        Returns: undefined
      }
      escalate_unanswered_customer_tickets: { Args: never; Returns: number }
      escalate_unanswered_tickets: { Args: never; Returns: number }
      fulfill_credits_idempotent: {
        Args: {
          p_amount: number
          p_description: string
          p_reference_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      generate_customer_id: { Args: never; Returns: string }
      generate_customer_ticket_number: { Args: never; Returns: string }
      generate_discord_link_code: { Args: never; Returns: string }
      generate_dispute_number: { Args: never; Returns: string }
      generate_installation_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_staff_id: { Args: never; Returns: string }
      generate_store_id: { Args: never; Returns: string }
      generate_takedown_case_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_applicant_messages: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          subject: string
        }[]
      }
      get_global_guard_limits: {
        Args: { _user_id: string }
        Returns: {
          has_ban_templates: boolean
          has_priority_sync: boolean
          is_premium: boolean
          max_active_bans: number
          max_servers: number
        }[]
      }
      get_homepage_stats: { Args: never; Returns: Json }
      get_import_quota: {
        Args: { p_store_id: string }
        Returns: {
          free_limit: number
          imports_used: number
          remaining_free: number
        }[]
      }
      get_next_download_time: { Args: { _user_id: string }; Returns: string }
      get_push_subscription_total: { Args: never; Returns: number }
      get_reset_code_attempts: {
        Args: { p_email: string }
        Returns: {
          attempts: number
          id: string
        }[]
      }
      get_store_qualification_progress: {
        Args: { p_store_id: string }
        Returns: {
          days_active: number
          is_active: boolean
          is_qualified: boolean
          product_count: number
          required_days: number
          required_products: number
        }[]
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      get_user_max_hierarchy: { Args: { _user_id: string }; Returns: number }
      get_weighted_promotion: {
        Args: { p_category_id?: string; p_zone: string }
        Returns: {
          cpc_bid: number
          cpm_bid: number
          pricing_model: string
          product_id: string
          promotion_id: string
        }[]
      }
      has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      has_premium_global_guard: { Args: { _user_id: string }; Returns: boolean }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_ad_clicks: {
        Args: { p_ad_id: string; p_is_unique: boolean }
        Returns: undefined
      }
      increment_ad_ping_balance: {
        Args: {
          p_everyone_pings?: number
          p_here_pings?: number
          p_reference_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      increment_download_count: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      increment_promotion_impression: {
        Args: { p_date: string; p_promotion_id: string }
        Returns: undefined
      }
      increment_reset_code_attempts: {
        Args: { p_id: string }
        Returns: undefined
      }
      increment_seller_pending_balance: {
        Args: { p_amount: number; p_seller_id: string; p_store_id: string }
        Returns: undefined
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_store_owner: {
        Args: { store_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_store_team_member: {
        Args: {
          required_roles?: Database["public"]["Enums"]["store_team_role"][]
          store_uuid: string
          user_uuid: string
        }
        Returns: boolean
      }
      is_username_available: { Args: { username: string }; Returns: boolean }
      list_push_subscribed_staff_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      list_staff_members: {
        Args: never
        Returns: {
          display_name: string
          last_seen: string
          roles: string[]
          user_id: string
        }[]
      }
      log_sensitive_access: {
        Args: {
          p_action?: string
          p_details?: Json
          p_record_count?: number
          p_table_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_applicant_messages_read: {
        Args: { p_message_ids: string[]; p_token: string }
        Returns: undefined
      }
      mask_account: { Args: { acct: string }; Returns: string }
      mask_email: { Args: { email: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      product_file_review_consented: {
        Args: { file_path: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_promotion_click: {
        Args: { p_promotion_id: string }
        Returns: boolean
      }
      record_rate_limit: {
        Args: { p_action_type: string; p_identifier: string }
        Returns: undefined
      }
      release_escrow_funds: {
        Args: never
        Returns: {
          released_count: number
          total_released: number
        }[]
      }
      request_seller_payout: {
        Args: { p_amount: number; p_seller_id: string; p_store_id: string }
        Returns: string
      }
      restore_deleted: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: boolean
      }
      reverse_affiliate_commission: {
        Args: { p_order_id: string; p_refund_id: string }
        Returns: undefined
      }
      reverse_seller_earnings: {
        Args: { p_order_id: string; p_refund_id: string }
        Returns: undefined
      }
      revert_expired_custom_rates: { Args: never; Returns: undefined }
      search_products_ranked: {
        Args: {
          category_filter?: string
          free_only?: boolean
          max_price?: number
          min_price?: number
          page_offset?: number
          page_size?: number
          search_query?: string
        }
        Returns: {
          category_name: string
          category_slug: string
          created_at: string
          description: string
          download_count: number
          id: string
          images: string[]
          name: string
          price: number
          rank_score: number
          slug: string
          store_name: string
          store_slug: string
          store_verified: boolean
          total_sales: number
        }[]
      }
      search_products_v2: {
        Args: {
          category_filter?: string
          free_only?: boolean
          max_price?: number
          min_price?: number
          page_offset?: number
          page_size?: number
          search_query?: string
          sort_by?: string
        }
        Returns: {
          category_name: string
          category_slug: string
          created_at: string
          description: string
          download_count: number
          id: string
          images: string[]
          name: string
          price: number
          product_number: number
          rank_score: number
          slug: string
          store_name: string
          store_slug: string
          store_verified: boolean
        }[]
      }
      seller_has_products_in_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      seller_owns_order_item_product: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
      soft_delete: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: boolean
      }
      spend_credits: {
        Args: {
          p_amount: number
          p_description: string
          p_order_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      store_password_reset_code: {
        Args: { p_code: string; p_email: string; p_expires_at: string }
        Returns: undefined
      }
      suggest_correction: { Args: { search_query: string }; Returns: string }
      update_category_affinity: {
        Args: { p_category_id: string; p_user_id: string; p_weight?: number }
        Returns: undefined
      }
      update_seller_trust_score: {
        Args: {
          p_is_blocked: boolean
          p_is_flagged: boolean
          p_store_id: string
          p_violation_type?: string
        }
        Returns: {
          blocked_uploads: number
          created_at: string
          flagged_uploads: number
          id: string
          is_restricted: boolean | null
          last_violation_at: string | null
          restricted_at: string | null
          restricted_reason: string | null
          store_id: string
          total_uploads: number
          trust_score: number
          updated_at: string
          violation_types: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "seller_security_scores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      use_import_quota: {
        Args: { p_store_id: string; p_user_id: string }
        Returns: string
      }
      user_can_insert_order_item: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_purchased_product: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      validate_applicant_token: {
        Args: { p_token: string }
        Returns: {
          applicant_name: string
          created_at: string
          id: string
          position: string
          reviewed_at: string
          status: string
        }[]
      }
      validate_discount_code_for_checkout: {
        Args: { p_code: string; p_product_ids?: string[]; p_subtotal?: number }
        Returns: {
          code: string
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          max_uses: number
          min_order_amount: number
          store_id: string
        }[]
      }
      validate_team_invite: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      verify_password_reset_code: {
        Args: { p_code: string; p_email: string }
        Returns: string
      }
    }
    Enums: {
      bot_license_status: "pending" | "active" | "expired" | "revoked"
      credit_transaction_type:
        | "purchase"
        | "gift"
        | "spend"
        | "refund"
        | "subscription_bonus"
      global_ban_sync_status_type:
        | "pending"
        | "success"
        | "failed"
        | "missing_permissions"
      global_ban_type: "permanent" | "temporary"
      ip_email_direction: "outbound" | "inbound"
      ip_email_status:
        | "draft"
        | "sending"
        | "sent"
        | "delivered"
        | "failed"
        | "bounced"
      ip_email_thread_type: "dmca_takedown" | "abuse_complaint" | "general"
      outreach_activity_type:
        | "created"
        | "contacted"
        | "follow_up"
        | "status_change"
        | "decision"
        | "note"
      store_team_role: "manager" | "editor" | "viewer"
      subscription_billing_period: "monthly" | "annual"
      subscription_tier: "basic" | "pro" | "premium"
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
      bot_license_status: ["pending", "active", "expired", "revoked"],
      credit_transaction_type: [
        "purchase",
        "gift",
        "spend",
        "refund",
        "subscription_bonus",
      ],
      global_ban_sync_status_type: [
        "pending",
        "success",
        "failed",
        "missing_permissions",
      ],
      global_ban_type: ["permanent", "temporary"],
      ip_email_direction: ["outbound", "inbound"],
      ip_email_status: [
        "draft",
        "sending",
        "sent",
        "delivered",
        "failed",
        "bounced",
      ],
      ip_email_thread_type: ["dmca_takedown", "abuse_complaint", "general"],
      outreach_activity_type: [
        "created",
        "contacted",
        "follow_up",
        "status_change",
        "decision",
        "note",
      ],
      store_team_role: ["manager", "editor", "viewer"],
      subscription_billing_period: ["monthly", "annual"],
      subscription_tier: ["basic", "pro", "premium"],
    },
  },
} as const
