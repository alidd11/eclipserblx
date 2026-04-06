import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { SITE_NAME } from '@/lib/constants';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Link } from 'react-router-dom';
import { Search, HelpCircle, ChevronLeft } from 'lucide-react';
import { CategorySection, QuickNav, ContactCTA } from '@/components/help-center/HelpCenterComponents';
import { buyerCategories } from '@/components/help-center/buyerCategories';

export default function HelpCenterBuyers() {
  usePageTracking({ pagePath: '/help-center/buyers' });
  usePageMeta({
    title: 'Buyer Help Center',
    description: `Find answers about purchasing, downloads, payments, refunds, Discord bots, Eclipse+ membership, and account security on ${SITE_NAME}.`,
    canonicalPath: '/help-center/buyers',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const totalArticles = buyerCategories.reduce((s, c) => s + c.articles.length, 0);
  const filteredCount = buyerCategories.reduce(
    (s, c) =>
      s + c.articles.filter(
        (a) =>
          a.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ).length,
    0
  );

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: buyerCategories.flatMap((c) =>
      c.articles.map((a) => ({
        '@type': 'Question',
        name: a.question,
        acceptedAnswer: { '@type': 'Answer', text: a.answer },
      }))
    ),
  };

  return (
    <MainLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/help-center" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back to Help Center
        </Link>

        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium mb-4">
            <HelpCircle className="h-4 w-4" />
            Buyer Help Center
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">Buyer Help Center</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Browse {totalArticles} articles covering everything you need as a buyer.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search buyer articles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-muted/50 border-border"
            />
          </div>

          {searchQuery && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing {filteredCount} of {totalArticles} articles
            </p>
          )}
        </header>

        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
          <QuickNav categories={buyerCategories} searchQuery={searchQuery} />

          <div className="space-y-6 mb-12">
            {buyerCategories.map((cat) => (
              <CategorySection key={cat.id} category={cat} searchQuery={searchQuery} />
            ))}

            {searchQuery && filteredCount === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No articles match "{searchQuery}"</p>
                <p className="text-sm mt-2">Try a different search or browse the categories above.</p>
              </div>
            )}
          </div>
        </div>

        <ContactCTA />
      </div>
    </MainLayout>
  );
}
