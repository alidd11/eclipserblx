import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Check, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { VINO_STORE_ID } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GenerateStoreBrandingProps {
  storeId: string;
  storeName: string;
  accentColor: string;
  currentLogoUrl?: string;
  currentBannerUrl?: string;
}

type GenerationStep = 'idle' | 'generating' | 'uploading-logo' | 'uploading-banner' | 'updating-store' | 'complete' | 'error';

// Password for Vino AI generation (simple protection)
const VINO_PASSWORD = 'VinoAI2024!';

export function GenerateStoreBranding({
  storeId,
  storeName,
  accentColor,
  currentLogoUrl,
  currentBannerUrl,
}: GenerateStoreBrandingProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<GenerationStep>('idle');
  const [progress, setProgress] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const isVinoStore = storeId === VINO_STORE_ID;

  const generateMutation = useMutation({
    mutationFn: async () => {
      setStep('generating');
      setProgress(10);

      // Call edge function to generate images
      const { data, error } = await supabase.functions.invoke('generate-store-branding', {
        body: {
          storeId,
          storeName,
          accentColor,
          generateLogo: true,
          generateBanner: true,
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.images) {
        throw new Error(data?.error || 'Failed to generate images');
      }

      const { logo: logoBase64, banner: bannerBase64 } = data.images;
      let logoUrl = currentLogoUrl;
      let bannerUrl = currentBannerUrl;

      // Upload logo if generated
      if (logoBase64) {
        setStep('uploading-logo');
        setProgress(40);

        // Delete old logo if exists
        if (currentLogoUrl?.includes('store-branding')) {
          const oldPath = currentLogoUrl.split('store-branding/')[1];
          if (oldPath) {
            await supabase.storage.from('store-branding').remove([oldPath]);
          }
        }

        // Convert base64 to blob
        const logoBlob = await base64ToBlob(logoBase64);
        const logoFileName = `${storeId}/logo-${Date.now()}.png`;

        const { error: logoUploadError } = await supabase.storage
          .from('store-branding')
          .upload(logoFileName, logoBlob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (logoUploadError) throw logoUploadError;

        const { data: logoUrlData } = supabase.storage
          .from('store-branding')
          .getPublicUrl(logoFileName);

        logoUrl = logoUrlData.publicUrl;
      }

      // Upload banner if generated
      if (bannerBase64) {
        setStep('uploading-banner');
        setProgress(60);

        // Delete old banner if exists
        if (currentBannerUrl?.includes('store-branding')) {
          const oldPath = currentBannerUrl.split('store-branding/')[1];
          if (oldPath) {
            await supabase.storage.from('store-branding').remove([oldPath]);
          }
        }

        // Convert base64 to blob
        const bannerBlob = await base64ToBlob(bannerBase64);
        const bannerFileName = `${storeId}/banner-${Date.now()}.png`;

        const { error: bannerUploadError } = await supabase.storage
          .from('store-branding')
          .upload(bannerFileName, bannerBlob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (bannerUploadError) throw bannerUploadError;

        const { data: bannerUrlData } = supabase.storage
          .from('store-branding')
          .getPublicUrl(bannerFileName);

        bannerUrl = bannerUrlData.publicUrl;
      }

      // Update store record
      setStep('updating-store');
      setProgress(80);

      const updateData: Record<string, string | undefined> = {};
      if (logoUrl && logoUrl !== currentLogoUrl) updateData.logo_url = logoUrl;
      if (bannerUrl && bannerUrl !== currentBannerUrl) updateData.banner_url = bannerUrl;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('stores')
          .update(updateData)
          .eq('id', storeId);

        if (updateError) throw updateError;
      }

      setProgress(100);
      setStep('complete');

      return { logoUrl, bannerUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] });
      toast.success('Branding generated and uploaded successfully!');
      
      // Reset after a delay
      setTimeout(() => {
        setStep('idle');
        setProgress(0);
      }, 2000);
    },
    onError: (error) => {
      console.error('Branding generation error:', error);
      setStep('error');
      toast.error(`Failed to generate branding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reset after a delay
      setTimeout(() => {
        setStep('idle');
        setProgress(0);
      }, 3000);
    },
  });

  const getStepLabel = () => {
    switch (step) {
      case 'generating':
        return 'Generating images with AI...';
      case 'uploading-logo':
        return 'Uploading logo...';
      case 'uploading-banner':
        return 'Uploading banner...';
      case 'updating-store':
        return 'Updating store...';
      case 'complete':
        return 'Complete!';
      case 'error':
        return 'Generation failed';
      default:
        return '';
    }
  };

  const isProcessing = step !== 'idle' && step !== 'complete' && step !== 'error';

  const handleGenerateClick = () => {
    if (isVinoStore) {
      setShowPasswordDialog(true);
      setPassword('');
      setPasswordError(false);
    } else {
      generateMutation.mutate();
    }
  };

  const handlePasswordSubmit = () => {
    if (password === VINO_PASSWORD) {
      setShowPasswordDialog(false);
      setPassword('');
      setPasswordError(false);
      generateMutation.mutate();
    } else {
      setPasswordError(true);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGenerateClick}
        disabled={isProcessing}
        className="w-full gap-2"
        variant="outline"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : step === 'complete' ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : step === 'error' ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : isVinoStore ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isProcessing ? getStepLabel() : step === 'complete' ? 'Branding Generated!' : 'Generate AI Branding'}
      </Button>

      {isProcessing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{getStepLabel()}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Uses AI to generate a matching logo and banner
      </p>

      {/* Password Dialog for Vino Store */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password Required
            </DialogTitle>
            <DialogDescription>
              AI image generation for Vino Store requires a password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              className={passwordError ? 'border-destructive' : ''}
            />
            {passwordError && (
              <p className="text-sm text-destructive">Incorrect password. Please try again.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordSubmit}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to convert base64 data URL to Blob
async function base64ToBlob(base64DataUrl: string): Promise<Blob> {
  // Remove the data URL prefix if present
  const base64 = base64DataUrl.includes(',') 
    ? base64DataUrl.split(',')[1] 
    : base64DataUrl;
  
  // Decode base64
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: 'image/png' });
}
