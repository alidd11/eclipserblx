import { useState, useCallback } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, History, CheckCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { ExternalProduct } from '@/lib/api/productImport';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImportSetupStep,
  ImportSelectStep,
  ImportProgressStep,
  ImportCompleteStep,
  ImportHistoryTab,
  ProductImportStatus,
} from '@/components/seller/import';

type ImportStep = 'setup' | 'select' | 'importing' | 'complete';

export default function SellerImport() {
  const [step, setStep] = useState<ImportStep>('setup');
  const [products, setProducts] = useState<ExternalProduct[]>([]);
  const [platform, setPlatform] = useState<string | null>(null);
  const [importUrls, setImportUrls] = useState<string[]>([]);
  const [downloadImages, setDownloadImages] = useState(true);
  const [importResults, setImportResults] = useState<ProductImportStatus[]>([]);

  const resetImport = () => {
    setStep('setup');
    setProducts([]);
    setPlatform(null);
    setImportUrls([]);
    setImportResults([]);
  };

  const handleProductsFound = (found: ExternalProduct[], plat: string | null) => {
    setProducts(found);
    setPlatform(plat);
    setStep('select');
  };

  const handleImport = (urls: string[], dlImages: boolean) => {
    setImportUrls(urls);
    setDownloadImages(dlImages);
    setStep('importing');
  };

  const handleImportComplete = useCallback((results: ProductImportStatus[]) => {
    setImportResults(results);
    setStep('complete');
  }, []);

  const handleRetryFailed = (failedUrls: string[]) => {
    setImportUrls(failedUrls);
    setImportResults([]);
    setStep('importing');
  };

  const stepLabels = ['Setup', 'Select', 'Importing', 'Done'];
  const steps: ImportStep[] = ['setup', 'select', 'importing', 'complete'];

  return (
    <SellerLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Import Products</h1>
            <p className="text-muted-foreground">Bring your existing products from other platforms</p>
          </div>
          {step !== 'setup' && step !== 'importing' && (
            <Button variant="outline" size="sm" onClick={resetImport} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              New Import
            </Button>
          )}
        </div>

        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import" className="gap-2">
              <Download className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-6">
            {/* Progress Steps Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {steps.map((s, i) => {
                const isCurrent = s === step;
                const isPast = steps.indexOf(step) > i;
                return (
                  <div key={s} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isCurrent ? 'bg-primary text-primary-foreground'
                      : isPast ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                      {isPast && !isCurrent && <CheckCircle className="h-3 w-3" />}
                      {stepLabels[i]}
                    </span>
                  </div>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {step === 'setup' && (
                  <ImportSetupStep onProductsFound={handleProductsFound} />
                )}
                {step === 'select' && (
                  <ImportSelectStep
                    products={products}
                    platform={platform}
                    onBack={() => setStep('setup')}
                    onImport={handleImport}
                  />
                )}
                {step === 'importing' && (
                  <ImportProgressStep
                    urls={importUrls}
                    products={products}
                    downloadImages={downloadImages}
                    onComplete={handleImportComplete}
                  />
                )}
                {step === 'complete' && (
                  <ImportCompleteStep
                    results={importResults}
                    onReset={resetImport}
                    onRetryFailed={handleRetryFailed}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ImportHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
}
