/**
 * Log bot errors to the database for dashboard visibility
 */
import { supabase } from '../supabase.js';

/**
 * Log an error to the bot_error_logs table
 */
export async function logBotError(context, error, metadata = {}) {
  try {
    await supabase.from('bot_error_logs').insert({
      context,
      error_message: error?.message || String(error),
      stack_trace: error?.stack || null,
      metadata,
    });
  } catch (dbError) {
    // Don't let logging failures crash the bot
    console.error('[error-logger] Failed to log error to DB:', dbError.message);
  }
}
