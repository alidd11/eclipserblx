import { forwardRef } from 'react';
import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';

/**
 * Global component to handle admin PWA detection and redirection
 * Placed inside BrowserRouter to access routing context
 */
export const AdminPWAHandler = forwardRef<HTMLDivElement>(function AdminPWAHandler(_, _ref) {
  usePWAAdminRedirect();
  return null;
});
