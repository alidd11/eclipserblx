import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';
import Landing from './Landing';

export default function Index() {
  // Redirect to admin login if this PWA was installed from admin context
  usePWAAdminRedirect();

  // Render the landing page
  return <Landing />;
}
