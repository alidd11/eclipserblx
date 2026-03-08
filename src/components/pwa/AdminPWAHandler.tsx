import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';

/**
 * Global component to handle admin PWA detection and redirection
 * Placed inside BrowserRouter to access routing context
 */
export function AdminPWAHandler() {
  usePWAAdminRedirect();
  return null;
}
