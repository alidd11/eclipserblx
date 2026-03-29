import { lazy } from 'react';

// Re-export the full admin BotCodes page
// It renders inside AdminLayout, but functions correctly within the bot settings tab
const AdminBotCodes = lazy(() => import('@/pages/admin/BotCodes'));

export default function BotCodesContent() {
  return <AdminBotCodes />;
}
