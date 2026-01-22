import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Store, Bell, BellOff, Check, ShieldCheck, Users, BarChart3, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function MarketplaceComingSoon() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const features = [
    {
      icon: ShieldCheck,
      title: 'Verified Sellers',
      description: 'Every seller is vetted to ensure quality and trust.',
    },
    {
      icon: Users,
      title: 'Buyer Protection',
      description: 'Secure transactions with dispute resolution.',
    },
    {
      icon: BarChart3,
      title: 'Creator Analytics',
      description: 'Powerful tools to track your sales and growth.',
    },
    {
      icon: Star,
      title: 'Community Reviews',
      description: 'Honest feedback from real customers.',
    },
  ];

  return (
    <MainLayout>
      <div className="container py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Hero */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2">
              <Store className="h-5 w-5 text-primary" />
              <span className="font-medium">Eclipse Marketplace</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              A New Way to Buy & Sell
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              The Eclipse Marketplace will let creators sell their scripts, liveries, and assets directly to the community—with secure payments and verified quality.
            </p>
          </div>

          {/* Notify CTA */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-6">
              {user ? (
                hasInterest ? (
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>You'll be notified when we launch</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMutation.mutate()}
                      disabled={removeMutation.isPending}
                    >
                      <BellOff className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      Be the first to know when we launch
                    </p>
                    <Button
                      onClick={handleRegisterInterest}
                      disabled={registerMutation.isPending || isLoading}
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      {registerMutation.isPending ? 'Registering...' : 'Notify Me'}
                    </Button>
                  </div>
                )
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Sign in to get notified when we launch
                  </p>
                  <Link to="/auth">
                    <Button variant="outline">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid gap-4 sm:grid-cols-2 text-left pt-8">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border">
                <CardContent className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
