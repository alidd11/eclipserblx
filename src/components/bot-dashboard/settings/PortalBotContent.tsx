import { lazy } from 'react';

const AdminPortalBotSetup = lazy(() => import('@/pages/admin/PortalBotSetup'));

export default function PortalBotContent() {
  return <AdminPortalBotSetup />;
}
