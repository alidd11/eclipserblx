import { Store, MessageCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import type { PurchasedStore } from '@/hooks/useStoreMessages';

interface NewConversationFormProps {
  directStore: { id: string; name: string; logo_url: string | null } | null;
  purchasedStores: PurchasedStore[];
  selectedStore: PurchasedStore | null;
  setSelectedStore: (store: PurchasedStore | null) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  newSubject: string;
  setNewSubject: (s: string) => void;
  issueDescription: string;
  setIssueDescription: (s: string) => void;
  onClose: () => void;
  onStart: () => void;
  isPending: boolean;
  getStoreProductNames: (store: PurchasedStore) => string[];
}

export function NewConversationForm({
  directStore,
  purchasedStores,
  selectedStore,
  setSelectedStore,
  selectedOrderId,
  setSelectedOrderId,
  newSubject,
  setNewSubject,
  issueDescription,
  setIssueDescription,
  onClose,
  onStart,
  isPending,
  getStoreProductNames,
}: NewConversationFormProps) {
  const OrderAndSubjectFields = ({ storeId }: { storeId: string }) => {
    const storeOrders = purchasedStores.find(s => s.store_id === storeId)?.orders || [];
    return (
      <>
        <div className="space-y-2">
          <label className="text-sm font-medium">Select an order (optional)</label>
          <select
            value={selectedOrderId || ''}
            onChange={(e) => setSelectedOrderId(e.target.value || null)}
            className="flex h-12 w-full rounded-xl border border-input bg-card px-4 py-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">General inquiry (no specific order)</option>
            {storeOrders.map((order) => (
              <option key={order.order_id} value={order.order_id}>
                {format(new Date(order.order_date), 'MMM d, yyyy')} - {order.product_names.slice(0, 2).join(', ')}
                {order.product_names.length > 2 ? ` +${order.product_names.length - 2}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Subject (optional)</label>
          <Input placeholder="Brief summary of your issue" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Describe your issue</label>
          <textarea
            placeholder="Please describe what you need help with..."
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            rows={4}
            className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>
        <Button className="w-full" onClick={onStart} disabled={isPending || !issueDescription.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
          Start Conversation
        </Button>
      </>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Contact a Store</h2>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {directStore ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/10">
            {directStore.logo_url ? (
              <img src={directStore.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{directStore.name}</p>
              <p className="text-xs text-muted-foreground">Direct message</p>
            </div>
          </div>
          <OrderAndSubjectFields storeId={directStore.id} />
        </div>
      ) : purchasedStores.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>You haven't purchased from any stores yet.</p>
          <p className="text-sm mt-1">Buy a product to contact its seller.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select a store</label>
            <div className="grid gap-2">
              {purchasedStores.map((store) => {
                const productNames = getStoreProductNames(store);
                return (
                  <button
                    key={store.store_id}
                    onClick={() => { setSelectedStore(store); setSelectedOrderId(null); }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      selectedStore?.store_id === store.store_id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                    )}
                  >
                    {store.logo_url ? (
                      <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Store className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{store.store_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {store.orders.length} order{store.orders.length !== 1 ? 's' : ''} • {productNames.slice(0, 2).join(', ')}
                        {productNames.length > 2 && ` +${productNames.length - 2} more`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {selectedStore && <OrderAndSubjectFields storeId={selectedStore.store_id} />}
        </div>
      )}
    </div>
  );
}
