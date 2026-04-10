import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, ShoppingCart, Plus, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmbeddedPaymentModal } from '@/components/payments/EmbeddedPaymentModal';
import { formatGBP } from '@/lib/formatters';

const formatCurrency = (amount: number) =>
 new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

interface AdPingPurchaseProps {
 herePingsAvailable: number;
 everyonePingsAvailable: number;
 hasDiscordLinked: boolean;
 userId?: string;
 onPurchaseSuccess: () => void;
}

export function AdPingPurchase({
 herePingsAvailable,
 everyonePingsAvailable,
 hasDiscordLinked,
 userId,
 onPurchaseSuccess,
}: AdPingPurchaseProps) {
 const [showPingPurchase, setShowPingPurchase] = useState(false);
 const [herePingsToBuy, setHerePingsToBuy] = useState(5);
 const [everyonePingsToBuy, setEveryonePingsToBuy] = useState(5);
 const [pingPaymentModalOpen, setPingPaymentModalOpen] = useState(false);
 const [isPurchasingPings] = useState(false);

 const handlePurchasePings = () => {
 if (!userId) {
 toast.error('Please sign in to purchase pings');
 return;
 }
 if (!hasDiscordLinked) {
 toast.error('Please link your Discord account first to purchase pings');
 return;
 }
 if (herePingsToBuy === 0 && everyonePingsToBuy === 0) {
 toast.error('Please select at least one ping to purchase');
 return;
 }
 setPingPaymentModalOpen(true);
 };

 const handlePingPaymentSuccess = () => {
 toast.success(`Ping credits added! ${herePingsToBuy} @here, ${everyonePingsToBuy} @everyone`);
 onPurchaseSuccess();
 setPingPaymentModalOpen(false);
 setShowPingPurchase(false);
 setHerePingsToBuy(5);
 setEveryonePingsToBuy(5);
 };

 const handlePingPaymentError = (error: string) => {
 toast.error(error);
 };

 const bulkPresets = [
 { qty: 5, discount: '5%', onClick: () => { setHerePingsToBuy(5); setEveryonePingsToBuy(0); } },
 { qty: 10, discount: '10%', onClick: () => { setHerePingsToBuy(10); setEveryonePingsToBuy(0); } },
 { qty: 25, discount: '20%', onClick: () => { setHerePingsToBuy(25); setEveryonePingsToBuy(0); } },
 { qty: 50, discount: '30%', onClick: () => { setHerePingsToBuy(50); setEveryonePingsToBuy(0); } },
 ];

 const getDiscount = (qty: number) =>
 qty >= 50 ? 0.30 : qty >= 25 ? 0.20 : qty >= 10 ? 0.10 : qty >= 5 ? 0.05 : 0;

 return (
 <>
 <div className="border border-border rounded-xl overflow-hidden border-border bg-card">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <Bell className="h-5 w-5" />
 Ping Credits
 </h3>
 <Button variant="outline" size="sm" onClick={() => setShowPingPurchase(!showPingPurchase)}>
 <ShoppingCart className="h-4 w-4 mr-2" />
 Buy More
 </Button>
 </div>
 </div>
 <div className="p-4 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
 <p className="text-2xl font-bold text-green-500">{herePingsAvailable}</p>
 <p className="text-sm text-muted-foreground">@here pings</p>
 </div>
 <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
 <p className="text-2xl font-bold text-yellow-500">{everyonePingsAvailable}</p>
 <p className="text-sm text-muted-foreground">@everyone pings</p>
 </div>
 </div>

 {showPingPurchase && (
 <div className="pt-4 border-t border-border space-y-4">
 {/* Bulk Discount Banner */}
 <div className="p-3 rounded-lg bg-muted/50 border border-border">
 <p className="text-sm font-medium text-primary mb-2">🎉 Bulk Discounts Available!</p>
 <div className="grid grid-cols-4 gap-2 text-xs">
 {bulkPresets.map((preset) => (
 <button
 key={preset.qty}
 type="button"
 onClick={preset.onClick}
 className="text-center p-1.5 rounded bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-transparent hover:border-green-500/50"
 >
 <p className="font-bold text-green-500">{preset.discount}</p>
 <p className="text-muted-foreground">{preset.qty}+ pings</p>
 </button>
 ))}
 </div>
 </div>

 <p className="text-sm text-muted-foreground">Purchase ping credits to use on your ads</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* @here pings */}
 <div className="space-y-2">
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <Label className="text-sm whitespace-nowrap">@here pings</Label>
 <div className="flex items-center gap-2">
 {herePingsToBuy >= 5 && (
 <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500 shrink-0">
 {herePingsToBuy >= 50 ? '30%' : herePingsToBuy >= 25 ? '20%' : herePingsToBuy >= 10 ? '10%' : '5%'} off
 </Badge>
 )}
 <span className="text-xs text-muted-foreground whitespace-nowrap">
 {herePingsToBuy >= 5
 ? `{formatGBP((0.79 * (1 - getDiscount(herePingsToBuy))))} each`
 : '£0.79 each'}
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="icon" aria-label="Remove" onClick={() => setHerePingsToBuy(Math.max(0, herePingsToBuy - 1))} className="shrink-0">
 <Minus className="h-4 w-4" />
 </Button>
 <Input
 type="number"
 value={herePingsToBuy}
 onChange={(e) => setHerePingsToBuy(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
 className="w-full text-center"
 />
 <Button variant="outline" size="icon" aria-label="Add" onClick={() => setHerePingsToBuy(Math.min(100, herePingsToBuy + 1))} className="shrink-0">
 <Plus className="h-4 w-4" />
 </Button>
 </div>
 </div>
 {/* @everyone pings */}
 <div className="space-y-2">
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <Label className="text-sm whitespace-nowrap">@everyone pings</Label>
 <div className="flex items-center gap-2">
 {everyonePingsToBuy >= 5 && (
 <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500 shrink-0">
 {everyonePingsToBuy >= 50 ? '30%' : everyonePingsToBuy >= 25 ? '20%' : everyonePingsToBuy >= 10 ? '10%' : '5%'} off
 </Badge>
 )}
 <span className="text-xs text-muted-foreground whitespace-nowrap">
 {everyonePingsToBuy >= 5
 ? `{formatGBP((1.49 * (1 - getDiscount(everyonePingsToBuy))))} each`
 : '£1.49 each'}
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="icon" aria-label="Remove" onClick={() => setEveryonePingsToBuy(Math.max(0, everyonePingsToBuy - 1))} className="shrink-0">
 <Minus className="h-4 w-4" />
 </Button>
 <Input
 type="number"
 value={everyonePingsToBuy}
 onChange={(e) => setEveryonePingsToBuy(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
 className="w-full text-center"
 />
 <Button variant="outline" size="icon" aria-label="Add" onClick={() => setEveryonePingsToBuy(Math.min(100, everyonePingsToBuy + 1))} className="shrink-0">
 <Plus className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </div>
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
 <div>
 {(() => {
 const hereDiscount = getDiscount(herePingsToBuy);
 const everyoneDiscount = getDiscount(everyonePingsToBuy);
 const originalTotal = herePingsToBuy * 0.79 + everyonePingsToBuy * 1.49;
 const discountedTotal = herePingsToBuy * 0.79 * (1 - hereDiscount) + everyonePingsToBuy * 1.49 * (1 - everyoneDiscount);
 const savings = originalTotal - discountedTotal;
 return (
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-sm font-medium whitespace-nowrap">Total: {formatCurrency(discountedTotal)}</p>
 {savings > 0 && (
 <span className="text-xs text-muted-foreground line-through whitespace-nowrap">{formatCurrency(originalTotal)}</span>
 )}
 {savings > 0.01 && (
 <span className="text-xs text-green-500 whitespace-nowrap">You save {formatCurrency(savings)}!</span>
 )}
 </div>
 );
 })()}
 </div>
 <Button
 onClick={handlePurchasePings}
 disabled={isPurchasingPings || (herePingsToBuy === 0 && everyonePingsToBuy === 0)}
 className="w-full sm:w-auto shrink-0"
 >
 Purchase Pings
 </Button>
 </div>
 </div>
 )}
 </div>
 </div>

 <EmbeddedPaymentModal
 open={pingPaymentModalOpen}
 onOpenChange={setPingPaymentModalOpen}
 paymentType="ad_pings"
 herePings={herePingsToBuy}
 everyonePings={everyonePingsToBuy}
 onSuccess={handlePingPaymentSuccess}
 onError={handlePingPaymentError}
 />
 </>
 );
}
