import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('privileged frontend route guards', () => {
  it('keeps compliance and SEO tools inside permission-gated admin layouts', () => {
    const compliance = source('src/pages/admin/ComplianceDashboard.tsx');
    const seo = source('src/pages/admin/SEOIndexing.tsx');

    expect(compliance).toContain(
      '<AdminLayout requiredPermissions={["view_seller_stores"]}>',
    );
    expect(seo).toContain(
      "<AdminLayout requiredPermissions={['manage_settings']}>",
    );
  });

  it('keeps seller account health inside the seller access gate', () => {
    const accountHealth = source('src/pages/seller/SellerAccountHealth.tsx');

    expect(accountHealth).toContain('<SellerLayout>');
    expect(accountHealth).toContain('if (!activeStore?.id)');
  });
});
