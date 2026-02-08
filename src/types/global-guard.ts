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
  license_status: string;
  last_synced_at: string | null;
}
