// Force re-deploy trigger
import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';
import Landing from './Landing';

export default function Index() {
  usePWAAdminRedirect();
  return <Landing />;
}
