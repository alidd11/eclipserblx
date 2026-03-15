// Force re-deploy trigger
import { forwardRef } from 'react';
import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';
import Landing from './Landing';

const Index = forwardRef<HTMLDivElement>(function Index(_props, _ref) {
  // Redirect to admin login if this PWA was installed from admin context
  usePWAAdminRedirect();

  // Render the landing page
  return <Landing />;
});

export default Index;
