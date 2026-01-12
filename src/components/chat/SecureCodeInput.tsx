import { useState } from 'react';
import { Shield, Loader2, CheckCircle2, XCircle, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SecureCodeInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onSuccess?: () => void;
}

interface VerificationResult {
  verified: boolean;
  masked_code: string;
  product_name?: string;
  error?: string;
}

export function SecureCodeInput({ 
  open, 
  onOpenChange, 
  conversationId,
  onSuccess 
}: SecureCodeInputProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const formatCode = (value: string) => {
    // Remove any non-alphanumeric characters except dashes
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    // If it starts with BOT- and has content after, format it
    if (cleaned.startsWith('BOT-')) {
      const afterPrefix = cleaned.slice(4).replace(/-/g, '');
      const parts = afterPrefix.match(/.{1,4}/g) || [];
      return 'BOT-' + parts.join('-').slice(0, 14); // BOT-XXXX-XXXX-XXXX = 18 chars max
    }
    
    return cleaned.slice(0, 18);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    setResult(null);
  };

  const handleVerify = async () => {
    if (!code.trim() || code.length < 10) return;

    setIsVerifying(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-chat-code', {
        body: { code: code.trim(), conversationId }
      });

      if (error) throw error;

      setResult(data as VerificationResult);
      
      if (data.verified) {
        onSuccess?.();
        // Close dialog after a short delay to show success
        setTimeout(() => {
          onOpenChange(false);
          setCode('');
          setResult(null);
        }, 1500);
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setResult({
        verified: false,
        masked_code: '',
        error: 'Failed to verify code. Please try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCode('');
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Verify Your Code
          </DialogTitle>
          <DialogDescription>
            Enter your bot installation code to securely verify ownership. 
            Your code will not be visible to support staff.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Installation Code</Label>
            <div className="relative">
              <Input
                id="code"
                placeholder="BOT-XXXX-XXXX-XXXX"
                value={code}
                onChange={handleCodeChange}
                className={cn(
                  "font-mono text-center tracking-wider text-lg pr-10",
                  result?.verified && "border-green-500 bg-green-500/10",
                  result && !result.verified && "border-destructive bg-destructive/10"
                )}
                disabled={isVerifying || result?.verified}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: BOT-XXXX-XXXX-XXXX
            </p>
          </div>

          {/* Result display */}
          {result && (
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg",
              result.verified 
                ? "bg-green-500/10 border border-green-500/30" 
                : "bg-destructive/10 border border-destructive/30"
            )}>
              {result.verified ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Code Verified Successfully
                    </p>
                    {result.product_name && (
                      <p className="text-xs text-muted-foreground">
                        Product: {result.product_name}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      Verification Failed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.error || 'Code not found or does not belong to your account.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
              Cancel
            </Button>
            <Button 
              onClick={handleVerify} 
              disabled={!code.trim() || code.length < 10 || isVerifying || result?.verified}
              className="gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            🔒 Your code is encrypted and verified server-side. 
            Support staff will only see a verification status.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
