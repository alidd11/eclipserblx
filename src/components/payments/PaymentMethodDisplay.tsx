import { useState, useEffect } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatform } from '@/hooks/usePlatform';
import { StripeProvider } from './StripeProvider';
import { PaymentRequestButton } from './PaymentRequestButton';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  category_slug?: string;
}

interface PaymentMethodDisplayProps {
  items: CartItem[];
  total: number;
  email: string;
  accessToken?: string;
  isProcessing: boolean;
  onProcessing: (processing: boolean) => void;
  onCardCheckout: () => void;
}

// Apple Pay Logo SVG - Official style
function ApplePayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 21" className={className}>
      <path 
        fill="currentColor"
        d="M9.365 2.014c-.58.685-.946 1.632-.946 2.58 0 .206.027.411.04.548.054 0 .108.014.162.014.565 0 1.116-.384 1.546-1.069.43-.657.716-1.537.716-2.42 0-.165-.013-.33-.04-.452-.377.055-.839.274-1.478.799zM8.432 5.978c-.838 0-1.583.48-2.006.48-.45 0-1.143-.452-1.913-.452-1.478 0-2.97 1.205-2.97 3.473 0 1.413.552 2.908 1.236 3.878.58.809 1.09 1.48 1.832 1.48.716 0 1.022-.466 1.9-.466.892 0 1.102.453 1.886.453.79 0 1.323-.726 1.818-1.44.565-.815.796-1.605.81-1.646-.055-.028-1.573-.63-1.573-2.373 0-1.495 1.22-2.18 1.29-2.235-.796-1.137-2.02-1.152-2.31-1.152zM20.2 2.976c0-1.934-1.328-3.276-3.227-3.276h-3.817v12.586h1.724v-4.453h1.942c1.986 0 3.378-1.385 3.378-3.357v-.5zm-1.765.5c0 1.152-.783 1.88-2.02 1.88h-1.535V1.596h1.535c1.237 0 2.02.727 2.02 1.88zm6.584 7.08c.893 0 1.684-.38 2.073-.985h.027v.93h1.587V6.6c0-1.578-1.237-2.605-3.134-2.605-1.777 0-3.067.973-3.161 2.331h1.52c.135-.644.75-1.07 1.587-1.07.986 0 1.547.466 1.547 1.315v.562l-2.046.124c-1.898.11-2.93.904-2.93 2.291 0 1.398 1.072 2.337 2.673 2.337h.257zm.608-1.192c-.852 0-1.398-.411-1.398-1.042 0-.658.512-1.041 1.506-1.096l1.803-.11v.562c0 .986-.838 1.686-1.911 1.686zm5.318 3.87c1.696 0 2.56-.644 3.283-2.606l2.958-8.435h-1.764l-1.937 6.35h-.027l-1.937-6.35H30.03l2.863 7.915-.155.48c-.269.81-.688 1.124-1.426 1.124a5.3 5.3 0 01-.472-.027v1.33c.135.013.472.013.606.013v.206z"
      />
    </svg>
  );
}

// Google Pay Logo SVG - Official style
function GooglePayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 41 17" className={className}>
      <g fill="none" fillRule="evenodd">
        <path fill="#5F6368" d="M19.526 2.635v4.083h2.518c.6 0 1.096-.202 1.488-.605.403-.402.605-.882.605-1.437 0-.544-.202-1.018-.605-1.422-.392-.413-.888-.62-1.488-.62h-2.518zm0 5.52v4.736h-1.504V1.198h3.99c1.012 0 1.873.337 2.582 1.012.72.675 1.08 1.497 1.08 2.466 0 .991-.36 1.819-1.08 2.482-.697.665-1.559.996-2.583.996h-2.485v.001z"/>
        <path fill="#5F6368" d="M27.194 10.442c0 .392.166.718.499.98.332.26.722.391 1.168.391.633 0 1.196-.234 1.692-.701.497-.469.744-1.019.744-1.65-.469-.37-1.123-.555-1.962-.555-.61 0-1.12.148-1.528.442-.409.294-.613.657-.613 1.093m1.946-5.815c1.112 0 1.989.297 2.633.89.642.594.964 1.408.964 2.442v4.932h-1.439v-1.11h-.065c-.622.914-1.45 1.372-2.486 1.372-.882 0-1.621-.262-2.215-.784-.594-.523-.891-1.176-.891-1.96 0-.828.313-1.486.94-1.976s1.463-.735 2.51-.735c.892 0 1.629.163 2.206.49v-.344c0-.522-.207-.966-.621-1.33a2.132 2.132 0 00-1.455-.547c-.84 0-1.504.353-1.995 1.062l-1.324-.834c.73-1.045 1.81-1.568 3.238-1.568"/>
        <path fill="#5F6368" d="M40.993 4.889l-5.02 11.53H34.38l1.864-4.034-3.302-7.496h1.635l2.387 5.749h.032l2.322-5.75z"/>
        <path fill="#4285F4" d="M13.448 7.134c0-.473-.04-.93-.116-1.366H6.988v2.588h3.634a3.11 3.11 0 01-1.344 2.042v1.68h2.169c1.27-1.17 2.001-2.9 2.001-4.944"/>
        <path fill="#34A853" d="M6.988 13.7c1.816 0 3.344-.595 4.459-1.621l-2.169-1.681c-.603.406-1.38.643-2.29.643-1.754 0-3.244-1.182-3.776-2.774H.978v1.731a6.728 6.728 0 006.01 3.703"/>
        <path fill="#FBBC05" d="M3.212 8.267a4.034 4.034 0 010-2.572V3.964H.978A6.678 6.678 0 000 7.001c0 1.074.26 2.091.978 3.038l2.234-1.772z"/>
        <path fill="#EA4335" d="M6.988 2.921c.992 0 1.88.34 2.58 1.008v.001l1.92-1.918C10.324.928 8.804.302 6.988.302a6.728 6.728 0 00-6.01 3.662l2.234 1.731c.532-1.592 2.022-2.774 3.776-2.774"/>
      </g>
    </svg>
  );
}

// PayPal Logo SVG
function PayPalLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 101 32" className={className}>
      <path fill="#253B80" d="M12.237 7.996H5.12c-.408 0-.756.296-.82.698L1.567 26.61c-.047.302.185.576.492.576h3.401c.408 0 .755-.296.82-.698l.74-4.68c.063-.402.41-.698.818-.698h1.886c3.929 0 6.198-1.9 6.79-5.67.267-1.649.01-2.945-.764-3.854-.85-.997-2.353-1.59-4.513-1.59z"/>
      <path fill="#179BD7" d="M33.194 7.996h-7.117c-.408 0-.756.296-.82.698l-2.733 17.316c-.047.302.185.576.492.576h3.606c.285 0 .528-.207.574-.488l.777-4.89c.063-.402.41-.698.818-.698h1.886c3.929 0 6.198-1.9 6.79-5.67.267-1.649.01-2.945-.764-3.854-.85-.997-2.353-1.59-4.509-1.59z"/>
      <path fill="#253B80" d="M54.067 13.627c-.287 1.882-1.724 1.882-3.115 1.882h-.79l.555-3.511c.033-.215.22-.373.438-.373h.363c.947 0 1.841 0 2.302.54.276.322.36.8.247 1.462zm-.603-4.916h-5.243c-.363 0-.671.264-.728.62l-2.12 13.433c-.042.268.165.51.436.51h2.688c.254 0 .47-.184.51-.433l.602-3.813c.057-.356.365-.62.728-.62h1.677c3.494 0 5.511-1.69 6.038-5.04.238-1.466.01-2.616-.679-3.424-.757-.887-2.097-1.233-3.909-1.233z"/>
      <path fill="#179BD7" d="M75.04 13.627c-.287 1.882-1.724 1.882-3.115 1.882h-.79l.555-3.511c.033-.215.22-.373.438-.373h.363c.947 0 1.841 0 2.302.54.276.322.36.8.247 1.462zm-.603-4.916h-5.243c-.363 0-.671.264-.728.62l-2.12 13.433c-.042.268.165.51.437.51h2.52c.363 0 .672-.264.728-.62l.572-3.626c.057-.356.365-.62.728-.62h1.677c3.494 0 5.511-1.69 6.038-5.04.238-1.466.01-2.616-.679-3.424-.757-.887-2.097-1.233-3.93-1.233z"/>
      <path fill="#253B80" d="M96.396 8.711h-2.507c-.19 0-.363.113-.438.288l-5.042 7.422-2.138-7.133c-.073-.244-.296-.412-.552-.412h-2.464c-.306 0-.52.298-.42.586l4.028 11.821-3.789 5.348c-.21.295.003.705.369.705h2.504c.188 0 .36-.11.436-.281l12.156-17.549c.205-.296-.007-.695-.373-.695z"/>
      <path fill="#179BD7" d="M101.32 7.996h-2.508c-.19 0-.363.113-.437.288l-5.042 7.422-2.138-7.133c-.073-.244-.296-.412-.552-.412h-2.464c-.306 0-.52.298-.42.586l4.028 11.821-3.789 5.348c-.21.295.003.705.37.705h2.503c.188 0 .36-.11.437-.281l12.155-17.549c.206-.296-.006-.695-.373-.695z"/>
    </svg>
  );
}

export function PaymentMethodDisplay({
  items,
  total,
  email,
  accessToken,
  isProcessing,
  onProcessing,
  onCardCheckout,
}: PaymentMethodDisplayProps) {
  const platform = usePlatform();
  const [walletAvailable, setWalletAvailable] = useState<boolean | null>(null);

  // Determine primary payment method based on platform
  const showApplePayFirst = platform.supportsApplePay;
  const showGooglePayFirst = platform.supportsGooglePay && !showApplePayFirst;

  return (
    <StripeProvider fallback={
      <div className="space-y-4">
        <Button
          onClick={onCardCheckout}
          className="w-full h-14 gradient-button border-0 text-base font-semibold"
          disabled={isProcessing}
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {isProcessing ? 'Processing...' : `Pay £${total.toFixed(2)}`}
        </Button>
        <TrustBadge />
      </div>
    }>
      <div className="space-y-4">
        {/* Native Wallet Payment - Primary on mobile */}
        <PaymentRequestButton
          items={items}
          total={total}
          email={email}
          accessToken={accessToken}
          onProcessing={onProcessing}
          onWalletAvailable={setWalletAvailable}
        />

        {/* Divider - only show if wallet is available */}
        {walletAvailable && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">Or pay with</span>
            </div>
          </div>
        )}

        {/* Card/PayPal Checkout */}
        <div className={walletAvailable ? 'space-y-3' : ''}>
          {/* Card Payment Button */}
          <Button
            onClick={onCardCheckout}
            variant={walletAvailable ? 'outline' : 'default'}
            className={`w-full h-14 font-semibold text-base ${
              walletAvailable 
                ? 'border-border hover:bg-muted/50' 
                : 'gradient-button border-0'
            }`}
            disabled={isProcessing}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {isProcessing ? 'Processing...' : walletAvailable ? 'Card or PayPal' : `Pay £${total.toFixed(2)}`}
          </Button>

          {/* PayPal as separate option when wallet not available */}
          {!walletAvailable && (
            <Button
              onClick={onCardCheckout}
              variant="outline"
              className="w-full h-12 bg-[#0070ba] hover:bg-[#003087] border-0 text-white"
              disabled={isProcessing}
            >
              <PayPalLogo className="h-5 w-auto" />
            </Button>
          )}
        </div>

        {/* Accepted Payment Icons - Show only relevant ones */}
        <div className="flex items-center justify-center gap-3 py-2">
          {platform.supportsApplePay && (
            <div className="px-2 py-1 bg-black rounded flex items-center justify-center">
              <ApplePayLogo className="h-4 w-auto text-white" />
            </div>
          )}
          {platform.supportsGooglePay && (
            <div className="px-2 py-1 bg-white border border-border rounded flex items-center justify-center">
              <GooglePayLogo className="h-4 w-auto" />
            </div>
          )}
          <div className="px-2 py-1 bg-muted rounded flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="px-2 py-1 bg-[#0070ba] rounded flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">PayPal</span>
          </div>
        </div>

        <TrustBadge />
      </div>
    </StripeProvider>
  );
}

function TrustBadge() {
  return (
    <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
      <Lock className="h-3 w-3" />
      Secure payment powered by Stripe
    </p>
  );
}
