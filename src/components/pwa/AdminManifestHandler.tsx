import { forwardRef } from 'react';
import { useAdminManifest } from '@/hooks/useAdminManifest';

/**
 * Ensures the correct manifest/meta/icons are applied based on the current route.
 * Must be mounted inside BrowserRouter.
 */
export const AdminManifestHandler = forwardRef<HTMLDivElement>(function AdminManifestHandler(_, _ref) {
  useAdminManifest();
  return null;
});
