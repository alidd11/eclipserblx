import { useState } from 'react';
import { Store, Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function MarketplaceHeroButton() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Check if user has registered interest
  const { data: hasInterest, isLoading } = useQuery({
    queryKey: ['marketplace-interest', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('marketplace_interest')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Register interest mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      const { error } = await supabase
        .from('marketplace_interest')
        .insert({ user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-interest'] });
      toast.success("You're on the list!", {
        description: "We'll notify you when the Marketplace launches.",
      });
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.');
    },
  });

  // Remove interest mutation
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      const { error } = await supabase
        .from('marketplace_interest')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-interest'] });
      toast.success('Interest removed');
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.');
    },
  });

  const handleRegisterInterest = () => {
    if (!user) {
      toast.error('Please sign in to register your interest');
      return;
    }
    registerMutation.mutate();
  };

  const handleRemoveInterest = () => {
    removeMutation.mutate();
  };

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        onClick={() => setDialogOpen(true)}
        className="text-lg px-8 py-6 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors"
      >
        <Store className="mr-2 h-5 w-5 text-primary" />
        <span className="text-foreground">Eclipse Marketplace</span>
        <Badge variant="secondary" className="ml-2 text-xs">
          Coming Soon
        </Badge>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Eclipse Marketplace
            </DialogTitle>
            <DialogDescription>
              A new way for creators to sell their scripts, liveries, and assets directly on Eclipse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h4 className="font-medium mb-2">What's coming:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Verified seller storefronts</li>
                <li>• Secure transactions with buyer protection</li>
                <li>• Creator tools and analytics</li>
                <li>• Community reviews and ratings</li>
              </ul>
            </div>

            {user ? (
              <div className="flex flex-col gap-2">
                {hasInterest ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>You'll be notified at launch</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveInterest}
                      disabled={removeMutation.isPending}
                    >
                      <BellOff className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleRegisterInterest}
                    disabled={registerMutation.isPending || isLoading}
                    className="w-full"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    {registerMutation.isPending ? 'Registering...' : 'Notify Me at Launch'}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Sign in to get notified when the Marketplace launches.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
