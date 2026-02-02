import { useState } from 'react';
import { Loader2, Gift, Search, UserPlus, Wallet, Check } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function AdminGiftCredits() {
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
  } | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isGifting, setIsGifting] = useState(false);

  // Search users
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, avatar_url, username, customer_id')
        .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,customer_id.ilike.%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      return data.map(p => ({
        id: p.user_id,
        display_name: p.display_name || p.username || 'Unknown',
        email: p.email || '',
        avatar_url: p.avatar_url,
        customer_id: p.customer_id,
      }));
    },
    enabled: searchQuery.length >= 2,
  });

  // Get selected user's balance
  const { data: userBalance } = useQuery({
    queryKey: ['user-credit-balance', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      
      const { data, error } = await supabase
        .from('credit_balances')
        .select('balance, total_gifted')
        .eq('user_id', selectedUser.id)
        .maybeSingle();
      
      if (error) throw error;
      return data || { balance: 0, total_gifted: 0 };
    },
    enabled: !!selectedUser,
  });

  const handleGiftCredits = async () => {
    if (!selectedUser || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0.01 || amountNum > 1000) {
      toast.error('Amount must be between £0.01 and £1000.00');
      return;
    }

    setIsGifting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gift-credits', {
        body: {
          targetUserId: selectedUser.id,
          amount: amountNum,
          reason: reason.trim() || undefined,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Successfully gifted £${amountNum.toFixed(2)} to ${selectedUser.display_name}`);
      setAmount('');
      setReason('');
      setSelectedUser(null);
      setSearchQuery('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to gift credits');
    } finally {
      setIsGifting(false);
    }
  };

  return (
    <AdminLayout requiredPermissions={["manage_users"]}>
      <div className="container py-6 max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gift Credits</h1>
            <p className="text-muted-foreground">Award store credits to customers</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* User Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-4 w-4" />
                Select User
              </CardTitle>
              <CardDescription>Search by name, email, username, or customer ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {isSearching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {searchResults && searchResults.length > 0 && (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.display_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{user.display_name}</div>
                          <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                        </div>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {searchQuery.length >= 2 && searchResults?.length === 0 && !isSearching && (
                <div className="text-center py-4 text-muted-foreground">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gift Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Gift Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedUser ? (
                <>
                  {/* Selected user card */}
                  <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback>{selectedUser.display_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{selectedUser.display_name}</div>
                      <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                      {userBalance && (
                        <div className="text-sm text-primary mt-1">
                          Current balance: £{userBalance.balance?.toFixed(2) || '0.00'}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                    >
                      Change
                    </Button>
                  </div>

                  {/* Amount input */}
                  <div className="space-y-2">
                    <Label htmlFor="gift-amount">Amount (£)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                        £
                      </span>
                      <Input
                        id="gift-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="1000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-7"
                        placeholder="10.00"
                      />
                    </div>
                  </div>

                  {/* Reason input */}
                  <div className="space-y-2">
                    <Label htmlFor="gift-reason">Reason (optional)</Label>
                    <Textarea
                      id="gift-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Compensation for issue, loyalty reward..."
                      rows={3}
                    />
                  </div>

                  {/* Quick amounts */}
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 25, 50].map((quickAmount) => (
                      <Badge
                        key={quickAmount}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => setAmount(quickAmount.toString())}
                      >
                        £{quickAmount}
                      </Badge>
                    ))}
                  </div>

                  {/* Submit button */}
                  <Button
                    className="w-full"
                    onClick={handleGiftCredits}
                    disabled={isGifting || !amount || parseFloat(amount) < 0.01}
                  >
                    {isGifting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gifting...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Gift £{parseFloat(amount || '0').toFixed(2)} Credit
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a user to gift credits</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
