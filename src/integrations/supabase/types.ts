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
      admin_chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          reply_to_id?: string | null
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
      affiliate_applications: {
        Row: {
          affiliate_id: string | null
          audience_size: string | null
          created_at: string
          discord_username: string | null
          display_name: string | null
          email: string
          id: string
          notes: string | null
          paypal_email: string | null
          promotion_method: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_id?: string | null
          audience_size?: string | null
          created_at?: string
          discord_username?: string | null
          display_name?: string | null
          email: string
          id?: string
          notes?: string | null
          paypal_email?: string | null
          promotion_method: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_id?: string | null
          audience_size?: string | null
          created_at?: string
          discord_username?: string | null
          display_name?: string | null
          email?: string
          id?: string
          notes?: string | null
          paypal_email?: string | null
          promotion_method?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_balances: {
        Row: {
          available_balance: number
          total_earned: number
          total_paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          total_earned?: number
          total_paid?: number
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
        ]
      }
      affiliate_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
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
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string
          user_id?: string
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
      bot_installation_codes: {
        Row: {
          created_at: string
          discord_guild_icon: string | null
          discord_guild_name: string | null
          discord_invite: string | null
          discord_member_count: number | null
          expires_at: string
          id: string
          installation_code: string
          is_used: boolean
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
          created_at?: string
          discord_guild_icon?: string | null
          discord_guild_name?: string | null
          discord_invite?: string | null
          discord_member_count?: number | null
          expires_at?: string
          id?: string
          installation_code: string
          is_used?: boolean
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
          created_at?: string
          discord_guild_icon?: string | null
          discord_guild_name?: string | null
          discord_invite?: string | null
          discord_member_count?: number | null
          expires_at?: string
          id?: string
          installation_code?: string
          is_used?: boolean
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
            foreignKeyName: "bot_installation_codes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
        }
        Relationships: []
      }
      download_logs: {
        Row: {
          downloaded_at: string
          id: string
          order_item_id: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          order_item_id?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          order_item_id?: string | null
          product_id?: string
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
        ]
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
      forum_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          rules: string | null
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          rules?: string | null
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          rules?: string | null
          slug?: string
        }
        Relationships: []
      }
      forum_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_chat_reactions: {
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
            foreignKeyName: "forum_chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "forum_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_solution: boolean | null
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_solution?: boolean | null
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_solution?: boolean | null
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          staff_response: string | null
          status: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          staff_response?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          staff_response?: string | null
          status?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          slug: string
          title: string
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          slug: string
          title: string
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
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
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
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
      job_applications: {
        Row: {
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
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
        }
        Update: {
          created_at?: string
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          discount_amount: number | null
          discount_code_id: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          status?: string
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          discount_amount?: number | null
          discount_code_id?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
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
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
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
        ]
      }
      products: {
        Row: {
          asset_file_url: string | null
          category_id: string | null
          created_at: string
          description: string | null
          download_count: number | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_seller_product: boolean | null
          moderation_notes: string | null
          moderation_status: string | null
          name: string
          price: number
          release_at: string | null
          robux_enabled: boolean | null
          robux_price: number | null
          robux_product_id: string | null
          seller_price: number | null
          slug: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          asset_file_url?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_seller_product?: boolean | null
          moderation_notes?: string | null
          moderation_status?: string | null
          name: string
          price: number
          release_at?: string | null
          robux_enabled?: boolean | null
          robux_price?: number | null
          robux_product_id?: string | null
          seller_price?: number | null
          slug: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_file_url?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_seller_product?: boolean | null
          moderation_notes?: string | null
          moderation_status?: string | null
          name?: string
          price?: number
          release_at?: string | null
          robux_enabled?: boolean | null
          robux_price?: number | null
          robux_product_id?: string | null
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
          discord_id: string | null
          discord_username: string | null
          display_name: string | null
          display_name_changed_at: string | null
          email: string
          id: string
          last_seen: string | null
          paypal_email: string | null
          referral_code: string | null
          roblox_user_id: string | null
          roblox_username: string | null
          staff_id: string | null
          stripe_account_id: string | null
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
          discord_id?: string | null
          discord_username?: string | null
          display_name?: string | null
          display_name_changed_at?: string | null
          email: string
          id?: string
          last_seen?: string | null
          paypal_email?: string | null
          referral_code?: string | null
          roblox_user_id?: string | null
          roblox_username?: string | null
          staff_id?: string | null
          stripe_account_id?: string | null
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
          discord_id?: string | null
          discord_username?: string | null
          display_name?: string | null
          display_name_changed_at?: string | null
          email?: string
          id?: string
          last_seen?: string | null
          paypal_email?: string | null
          referral_code?: string | null
          roblox_user_id?: string | null
          roblox_username?: string | null
          staff_id?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
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
            foreignKeyName: "review_reminders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string
          created_at: string
          external_reviewer_name: string | null
          external_source: string | null
          id: string
          is_approved: boolean | null
          is_external: boolean | null
          is_featured: boolean | null
          product_id: string | null
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          external_reviewer_name?: string | null
          external_source?: string | null
          id?: string
          is_approved?: boolean | null
          is_external?: boolean | null
          is_featured?: boolean | null
          product_id?: string | null
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          external_reviewer_name?: string | null
          external_source?: string | null
          id?: string
          is_approved?: boolean | null
          is_external?: boolean | null
          is_featured?: boolean | null
          product_id?: string | null
          rating?: number
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
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
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
            foreignKeyName: "seller_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
            foreignKeyName: "seller_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
        ]
      }
      seller_payouts: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          seller_id: string
          status: string | null
          store_id: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          seller_id: string
          status?: string | null
          store_id: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          seller_id?: string
          status?: string | null
          store_id?: string
          stripe_transfer_id?: string | null
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
        ]
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
        ]
      }
      seller_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
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
          gross_amount: number | null
          id: string
          metadata: Json | null
          net_amount: number | null
          net_before_commission: number | null
          order_id: string | null
          order_item_id: string | null
          platform_fee: number | null
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
          gross_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          net_before_commission?: number | null
          order_id?: string | null
          order_item_id?: string | null
          platform_fee?: number | null
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
          gross_amount?: number | null
          id?: string
          metadata?: Json | null
          net_amount?: number | null
          net_before_commission?: number | null
          order_id?: string | null
          order_item_id?: string | null
          platform_fee?: number | null
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
          id: string
          message: string
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          reply_to_id?: string | null
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
      store_applications: {
        Row: {
          age_confirmed: boolean
          created_at: string | null
          discord_server_invite: string | null
          expected_products: string | null
          experience: string | null
          id: string
          notes: string | null
          portfolio_url: string | null
          product_category: string | null
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
          created_at?: string | null
          discord_server_invite?: string | null
          expected_products?: string | null
          experience?: string | null
          id?: string
          notes?: string | null
          portfolio_url?: string | null
          product_category?: string | null
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
          created_at?: string | null
          discord_server_invite?: string | null
          expected_products?: string | null
          experience?: string | null
          id?: string
          notes?: string | null
          portfolio_url?: string | null
          product_category?: string | null
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
            foreignKeyName: "store_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
            foreignKeyName: "store_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
        ]
      }
      stores: {
        Row: {
          about_content: string | null
          accent_color: string | null
          announcement_active: boolean | null
          announcement_text: string | null
          average_rating: number | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_country: string | null
          bank_name: string | null
          bank_routing_number: string | null
          bank_swift_bic: string | null
          banner_url: string | null
          bio: string | null
          commission_rate: number | null
          created_at: string | null
          custom_commission_rate: number | null
          custom_css: string | null
          custom_rate_expires_at: string | null
          custom_rate_set_at: string | null
          custom_rate_set_by: string | null
          description: string | null
          discord_bot_token: string | null
          discord_guild_id: string | null
          discord_role_id: string | null
          discord_url: string | null
          discord_webhook_url: string | null
          featured_product_ids: string[] | null
          follower_count: number | null
          font_body: string | null
          font_heading: string | null
          hero_cta_link: string | null
          hero_cta_text: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_active: boolean | null
          is_trusted: boolean | null
          is_verified: boolean | null
          layout_style: string | null
          logo_url: string | null
          name: string
          owner_id: string
          payout_method: string
          payouts_enabled: boolean | null
          paypal_email: string | null
          product_count: number | null
          rejection_reason: string | null
          review_discord_webhook_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roblox_url: string | null
          show_reviews: boolean | null
          show_social_proof: boolean | null
          slug: string
          status: string | null
          store_id: string
          stripe_account_id: string | null
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
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bank_swift_bic?: string | null
          banner_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string | null
          custom_commission_rate?: number | null
          custom_css?: string | null
          custom_rate_expires_at?: string | null
          custom_rate_set_at?: string | null
          custom_rate_set_by?: string | null
          description?: string | null
          discord_bot_token?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          discord_url?: string | null
          discord_webhook_url?: string | null
          featured_product_ids?: string[] | null
          follower_count?: number | null
          font_body?: string | null
          font_heading?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean | null
          is_trusted?: boolean | null
          is_verified?: boolean | null
          layout_style?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          payout_method?: string
          payouts_enabled?: boolean | null
          paypal_email?: string | null
          product_count?: number | null
          rejection_reason?: string | null
          review_discord_webhook_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roblox_url?: string | null
          show_reviews?: boolean | null
          show_social_proof?: boolean | null
          slug: string
          status?: string | null
          store_id: string
          stripe_account_id?: string | null
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
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_country?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          bank_swift_bic?: string | null
          banner_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          created_at?: string | null
          custom_commission_rate?: number | null
          custom_css?: string | null
          custom_rate_expires_at?: string | null
          custom_rate_set_at?: string | null
          custom_rate_set_by?: string | null
          description?: string | null
          discord_bot_token?: string | null
          discord_guild_id?: string | null
          discord_role_id?: string | null
          discord_url?: string | null
          discord_webhook_url?: string | null
          featured_product_ids?: string[] | null
          follower_count?: number | null
          font_body?: string | null
          font_heading?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean | null
          is_trusted?: boolean | null
          is_verified?: boolean | null
          layout_style?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          payout_method?: string
          payouts_enabled?: boolean | null
          paypal_email?: string | null
          product_count?: number | null
          rejection_reason?: string | null
          review_discord_webhook_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roblox_url?: string | null
          show_reviews?: boolean | null
          show_social_proof?: boolean | null
          slug?: string
          status?: string | null
          store_id?: string
          stripe_account_id?: string | null
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
            foreignKeyName: "subscription_free_claims_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
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
          updated_at: string
          user_id: string
        }
        Insert: {
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
          updated_at?: string
          user_id: string
        }
        Update: {
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
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_email: string
          id: string
          priority: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_email: string
          id?: string
          priority?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_email?: string
          id?: string
          priority?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_exists: { Args: { _user_id: string }; Returns: boolean }
      can_user_download: { Args: { _user_id: string }; Returns: boolean }
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
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      escalate_unanswered_tickets: { Args: never; Returns: number }
      generate_affiliate_id: { Args: never; Returns: string }
      generate_customer_id: { Args: never; Returns: string }
      generate_installation_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_staff_id: { Args: never; Returns: string }
      generate_store_id: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_next_download_time: { Args: { _user_id: string }; Returns: string }
      get_user_email: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      record_rate_limit: {
        Args: { p_action_type: string; p_identifier: string }
        Returns: undefined
      }
      revert_expired_custom_rates: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "product_manager"
        | "order_manager"
        | "support_agent"
        | "analyst"
        | "recruiter"
        | "seller"
      outreach_activity_type:
        | "created"
        | "contacted"
        | "follow_up"
        | "status_change"
        | "decision"
        | "note"
      store_team_role: "manager" | "editor" | "viewer"
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
      app_role: [
        "admin",
        "product_manager",
        "order_manager",
        "support_agent",
        "analyst",
        "recruiter",
        "seller",
      ],
      outreach_activity_type: [
        "created",
        "contacted",
        "follow_up",
        "status_change",
        "decision",
        "note",
      ],
      store_team_role: ["manager", "editor", "viewer"],
    },
  },
} as const
