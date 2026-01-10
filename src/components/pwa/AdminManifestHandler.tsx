import { useAdminManifest } from '@/hooks/useAdminManifest';

/**
 * Ensures the correct manifest/meta/icons are applied based on the current route.
 * Must be mounted inside BrowserRouter.
 */
export function AdminManifestHandler() {
  useAdminManifest();
  return null;
}
