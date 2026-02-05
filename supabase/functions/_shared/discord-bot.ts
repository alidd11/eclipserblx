 // Shared Discord Bot API utility for edge functions
 // Uses DISCORD_BOT_TOKEN to post messages directly to channels
 
 export interface DiscordEmbed {
   title?: string;
   description?: string;
   color?: number;
   fields?: Array<{ name: string; value: string; inline?: boolean }>;
   thumbnail?: { url: string };
   image?: { url: string };
   footer?: { text: string; icon_url?: string };
   author?: { name: string; icon_url?: string; url?: string };
   timestamp?: string;
   url?: string;
 }
 
 export interface BotMessagePayload {
   content?: string;
   embeds?: DiscordEmbed[];
   components?: unknown[];
   allowed_mentions?: {
     parse?: ('roles' | 'users' | 'everyone')[];
     roles?: string[];
     users?: string[];
   };
 }
 
 export interface SendMessageResult {
   success: boolean;
   messageId?: string;
   channelId?: string;
   error?: string;
 }
 
 export interface DiscordMessageResponse {
   id: string;
   channel_id: string;
   content: string;
   timestamp: string;
   [key: string]: unknown;
 }
 
 const DISCORD_API_BASE = 'https://discord.com/api/v10';
 
 /**
  * Get the bot token from environment
  */
 function getBotToken(): string | null {
   return Deno.env.get('DISCORD_BOT_TOKEN') || null;
 }
 
 /**
  * Send a message to a Discord channel using the bot
  */
 export async function sendBotMessage(
   channelId: string,
   payload: BotMessagePayload
 ): Promise<SendMessageResult> {
   const botToken = getBotToken();
   
   if (!botToken) {
     console.error('[discord-bot] DISCORD_BOT_TOKEN not configured');
     return { success: false, error: 'Bot token not configured' };
   }
 
   if (!channelId) {
     return { success: false, error: 'Channel ID is required' };
   }
 
   try {
     const response = await fetch(
       `${DISCORD_API_BASE}/channels/${channelId}/messages`,
       {
         method: 'POST',
         headers: {
           'Authorization': `Bot ${botToken}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(payload),
       }
     );
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error('[discord-bot] Failed to send message:', response.status, errorText);
       return { 
         success: false, 
         error: `Discord API error: ${response.status}`,
         channelId,
       };
     }
 
     const data: DiscordMessageResponse = await response.json();
     console.log('[discord-bot] Message sent successfully:', { messageId: data.id, channelId });
     
     return {
       success: true,
       messageId: data.id,
       channelId: data.channel_id,
     };
   } catch (error) {
     console.error('[discord-bot] Error sending message:', error);
     return {
       success: false,
       error: error instanceof Error ? error.message : 'Unknown error',
     };
   }
 }
 
 /**
  * Add a reaction to a message
  */
 export async function addReaction(
   channelId: string,
   messageId: string,
   emoji: string
 ): Promise<boolean> {
   const botToken = getBotToken();
   
   if (!botToken) {
     console.log('[discord-bot] No bot token, skipping reaction');
     return false;
   }
 
   try {
     // URL encode the emoji
     const encodedEmoji = encodeURIComponent(emoji);
     
     const response = await fetch(
       `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
       {
         method: 'PUT',
         headers: {
           'Authorization': `Bot ${botToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
 
     if (response.ok || response.status === 204) {
       console.log('[discord-bot] Reaction added:', { messageId, emoji });
       return true;
     }
 
     console.log('[discord-bot] Failed to add reaction:', response.status);
     return false;
   } catch (error) {
     console.log('[discord-bot] Reaction error (non-fatal):', error);
     return false;
   }
 }
 
 /**
  * Add multiple reactions to a message with rate limit handling
  */
 export async function addMultipleReactions(
   channelId: string,
   messageId: string,
   emojis: string[],
   delayMs: number = 300
 ): Promise<number> {
   let successCount = 0;
   
   for (const emoji of emojis) {
     const success = await addReaction(channelId, messageId, emoji);
     if (success) successCount++;
     
     // Delay to avoid rate limits
     if (delayMs > 0) {
       await new Promise(resolve => setTimeout(resolve, delayMs));
     }
   }
   
   return successCount;
 }
 
 /**
  * Create a thread on a message
  */
 export async function createThread(
   channelId: string,
   messageId: string,
   name: string,
   autoArchiveDuration: number = 1440 // 24 hours
 ): Promise<{ threadId: string } | null> {
   const botToken = getBotToken();
   
   if (!botToken) {
     console.log('[discord-bot] No bot token, skipping thread creation');
     return null;
   }
 
   try {
     const response = await fetch(
       `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}/threads`,
       {
         method: 'POST',
         headers: {
           'Authorization': `Bot ${botToken}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           name: name.substring(0, 100), // Discord thread name limit
           auto_archive_duration: autoArchiveDuration,
         }),
       }
     );
 
     if (!response.ok) {
       const errorText = await response.text();
       console.log('[discord-bot] Failed to create thread:', response.status, errorText);
       return null;
     }
 
     const data = await response.json();
     console.log('[discord-bot] Thread created:', { threadId: data.id, name });
     
     return { threadId: data.id };
   } catch (error) {
     console.log('[discord-bot] Thread creation error:', error);
     return null;
   }
 }
 
 /**
  * Helper to parse a setting value (handles JSON-encoded strings)
  */
 export function parseSettingValue(value: unknown): string {
   if (typeof value === 'string') {
     try {
       const parsed = JSON.parse(value);
       return typeof parsed === 'string' ? parsed : value;
     } catch {
       return value.replace(/^"|"$/g, '');
     }
   }
   return String(value || '');
 }
 
 /**
  * Helper to build a settings map from Supabase settings query result
  */
 export function buildSettingsMap(
   settings: Array<{ key: string; value: unknown }> | null
 ): Record<string, string> {
   const map: Record<string, string> = {};
   settings?.forEach((s) => {
     map[s.key] = parseSettingValue(s.value);
   });
   return map;
 }