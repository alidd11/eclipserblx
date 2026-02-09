export type GlobalBanType = 'permanent' | 'temporary';

export type GlobalBanSyncStatusType = 'pending' | 'success' | 'failed' | 'missing_permissions';

export interface GlobalBan {
  id: string;
  owner_user_id: string;
  banned_discord_id: string;
  banned_username: string | null;
  banned_avatar_url: string | null;
  reason: string | null;
  ban_type: GlobalBanType;
  expires_at: string | null;
  created_at: string;
  created_via: string;
  is_active: boolean;
  updated_at: string;
}

export interface GlobalBanLog {
  id: string;
  ban_id: string;
  action: string;
  guild_id: string | null;
  performed_by: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface GlobalBanSyncStatus {
  id: string;
  ban_id: string;
  guild_id: string;
  guild_name: string | null;
  status: GlobalBanSyncStatusType;
  error_message: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface GlobalGuardSettings {
  id: string;
  user_id: string;
  auto_sync_new_servers: boolean;
  notify_on_sync_failure: boolean;
  default_ban_reason: string | null;
  created_at: string;
  updated_at: string;
  max_servers: number;
  max_active_bans: number | null;
  has_priority_sync: boolean;
  has_ban_templates: boolean;
}

export interface GlobalGuardStats {
  totalBans: number;
  activeBans: number;
  serversProtected: number;
  recentBans: number;
}

export interface ConnectedServer {
  guild_id: string;
  guild_name: string | null;
  guild_icon: string | null;
  member_count: number | null;
  license_status: string | null;
  last_synced_at: string | null;
}

export interface GlobalBanTemplate {
  id: string;
  owner_user_id: string;
  name: string;
  reason: string | null;
  ban_type: GlobalBanType;
  duration: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlobalGuardGuildSettings {
  id: string;
  guild_id: string;
  owner_user_id: string;
  log_channel_id: string | null;
  log_channel_name: string | null;
  ping_role_id: string | null;
  ping_role_name: string | null;
  log_bans: boolean;
  log_unbans: boolean;
  created_at: string;
  updated_at: string;
}
