import { lazy } from 'react';

const AdminBotGhostSetup = lazy(() => import('@/pages/admin/BotGhostSetup'));

export default function BotGhostContent() {
  return <AdminBotGhostSetup />;
}
