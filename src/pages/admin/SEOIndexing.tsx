import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SEOIndexing() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const submitToSearchEngines = async (type: 'all' | 'recent' = 'all') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-indexnow', {
        body: { type },
      });
      if (error) throw error;
      setLastResult(data);
      toast.success(`Submitted ${data.totalUrls} URLs to search engines`);
    } catch (err: any) {
      toast.error('Failed to submit: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEO & Indexing</h1>
        <p className="text-muted-foreground">Submit your pages to search engines for faster discovery</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Submit All URLs
            </CardTitle>
            <CardDescription>
              Submit all products, stores, and static pages to IndexNow (Bing, Yandex) and ping Google's sitemap crawler.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => submitToSearchEngines('all')} disabled={loading} className="w-full">
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
              {loading ? 'Submitting...' : 'Submit to Search Engines'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Automatic Indexing
            </CardTitle>
            <CardDescription>
              New products and stores are automatically submitted when created or approved. A daily cron job also re-submits all URLs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Auto-indexing is active
            </div>
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last Submission Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">{lastResult.totalUrls} URLs submitted</span>
            </div>

            {lastResult.results?.map((batch: any, i: number) => (
              <div key={i} className="space-y-1">
                {batch.submissions?.map((sub: any, j: number) => (
                  <div key={j} className="flex items-center gap-2 text-sm">
                    {sub.ok ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                    )}
                    <span className="text-muted-foreground">
                      {sub.endpoint ? new URL(sub.endpoint).hostname : 'Unknown'}: {sub.status || sub.error}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            {lastResult.googlePing && (
              <div className="flex items-center gap-2 text-sm">
                {lastResult.googlePing.ok ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                )}
                <span className="text-muted-foreground">
                  Google Sitemap Ping: {lastResult.googlePing.status}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
