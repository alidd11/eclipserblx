import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, Loader2, CheckCircle,
  ArrowUpRight, Clock, Users, Copy, ExternalLink,
  CreditCard, BadgePercent, Star, Construction, MousePointerClick, UserPlus,
  Link as LinkIcon, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePageMeta } from '@/hooks/usePageMeta';
import { format } from '@/lib/dateUtils';
import { Link } from 'react-router-dom';
import { useAffiliateData } from './affiliate/useAffiliateData';
import { PayoutSettingsSection } from './affiliate/PayoutSettingsSection';
import { formatGBP } from '@/lib/formatters';

export default function Affiliate() {
 usePageMeta({ title: 'Affiliate Programme', description: 'Earn commissions by referring customers to Eclipse marketplace. Join our affiliate programme today.', canonicalPath: '/affiliate' });
 const d = useAffiliateData();

 const benefits = [
  { icon: BadgePercent, title: `${d.affiliateSettings.commissionRate}% Commission`, description: 'Earn on every sale from users you refer' },
  { icon: TrendingUp, title: 'Lifetime Earnings', description: 'Earn from all purchases your referrals make' },
  { icon: Wallet, title: 'Same-Day Payouts', description: 'Get paid via Stripe, PayPal, or bank transfer' },
  { icon: Users, title: 'No Limits', description: 'Refer as many people as you want' },
 ];

 if (!d.affiliateSettings.isEnabled) {
  return (
   <MainLayout>
    <div className="container py-8 max-w-2xl">
     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Construction className="h-10 w-10 text-primary" /></div>
      <div className="space-y-2"><h1 className="text-3xl font-display font-bold">Coming Soon</h1><p className="text-muted-foreground max-w-md mx-auto">Our affiliate program is currently being set up. Check back soon!</p></div>
      <Button asChild variant="outline"><Link to="/">Return Home</Link></Button>
     </motion.div>
    </div>
   </MainLayout>
  );
 }

 if (!d.user) {
  return (
   <MainLayout>
    <div className="container py-8 max-w-4xl">
     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="text-center space-y-4">
       <Badge className="bg-primary/20 text-primary border-primary/30"><Star className="h-3 w-3 mr-1" />Partner Program</Badge>
       <h1 className="text-4xl md:text-5xl font-display font-bold gradient-text">Earn With Every Referral</h1>
       <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Every Eclipse account comes with a built-in affiliate link. Earn {d.affiliateSettings.commissionRate}% commission on every sale you refer.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
       {benefits.map((benefit, index) => (
        <motion.div key={benefit.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
          <div className="border border-border rounded-xl overflow-hidden bg-card/50 h-full">
           <div className="p-5">
            <h3 className="font-semibold mb-1">{benefit.title}</h3>
            <p className="text-sm text-muted-foreground">{benefit.description}</p>
           </div>
         </div>
        </motion.div>
       ))}
      </div>
       <div className="border border-border rounded-xl overflow-hidden bg-muted/30">
        <div className="p-4 py-8 text-center space-y-4">
         <h2 className="text-2xl font-bold">Ready to Start Earning?</h2>
         <p className="text-muted-foreground">Sign up or log in to access your affiliate dashboard and referral link.</p>
         <Button asChild size="lg" className="gradient-button"><Link to="/auth">Get Started<ArrowUpRight className="h-4 w-4 ml-2" /></Link></Button>
       </div>
      </div>
     </motion.div>
    </div>
   </MainLayout>
  );
 }

 if (d.isLoading) {
  return <MainLayout><div className="container py-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></MainLayout>;
 }

 return (
  <MainLayout>
   <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
     {/* Header */}
     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h1 className="text-2xl md:text-3xl font-display font-bold">Affiliate Dashboard</h1><p className="text-muted-foreground">Track your earnings and referrals</p></div>
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 w-fit"><CheckCircle className="h-3 w-3 mr-1" />Active Affiliate</Badge>
     </div>

     {/* Stripe Connect Banner */}
     {d.needsStripeOnboarding && d.payoutSettings.preferred_method === 'stripe' && (
      <div className="border border-border rounded-xl overflow-hidden bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
       <div className="p-4 py-6"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
         <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0"><LinkIcon className="h-6 w-6 text-primary" /></div>
         <div><h3 className="font-semibold text-lg">Connect Your Stripe Account</h3><p className="text-sm text-muted-foreground">Connect your Stripe account to receive instant automatic payouts directly to your bank.</p></div>
        </div>
        <Button onClick={d.handleConnectStripe} disabled={d.isConnectingStripe || d.connectStripeMutation.isPending} className="shrink-0 gradient-button">
         {d.isConnectingStripe || d.connectStripeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}Connect Stripe
        </Button>
       </div></div>
      </div>
     )}

     {/* Cash Out Hero */}
     <div className="border border-border rounded-xl overflow-hidden bg-muted/30 border-border overflow-hidden relative">
      <div className="absolute top-0 right-0 w-48 h-48 bg-muted/20 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="p-4 pt-6 pb-6"><div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
       <div className="flex items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0"><DollarSign className="h-8 w-8 text-primary" /></div>
        <div><p className="text-sm text-muted-foreground mb-1">Available Balance</p><p className="text-4xl md:text-5xl font-bold text-foreground">£{d.availableBalance.toFixed(2)}</p></div>
       </div>
       <div className="flex flex-col gap-3 md:items-end">
        {d.hasPendingPayout ? (
         <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"><Clock className="h-5 w-5 text-yellow-500" /><span className="text-sm font-medium text-yellow-500">Payout request pending</span></div>
        ) : (
         <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative">
           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">£</span>
           <Input type="number" min={d.affiliateSettings.minimumPayout} max={d.availableBalance} step="0.01" placeholder={d.affiliateSettings.minimumPayout.toString()} value={d.payoutAmount} onChange={(e) => d.setPayoutAmount(e.target.value)} className="pl-7 w-full sm:w-32 h-12 text-lg" disabled={d.availableBalance < d.affiliateSettings.minimumPayout} />
          </div>
          <Button size="lg" className="gradient-button h-12 px-8 text-base font-semibold" onClick={d.handleRequestPayout} disabled={d.requestPayoutMutation.isPending || !d.payoutAmount || d.availableBalance < d.affiliateSettings.minimumPayout}>
           {d.requestPayoutMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ArrowUpRight className="h-5 w-5 mr-2" />}
           {d.canUseStripe ? 'Instant Payout' : 'Cash Out'}
          </Button>
         </div>
        )}
        <div className="flex flex-col gap-1 md:items-end">
         {d.availableBalance < d.affiliateSettings.minimumPayout && !d.hasPendingPayout && <p className="text-xs text-muted-foreground">Minimum balance for payout: £{d.affiliateSettings.minimumPayout}</p>}
         <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{d.affiliateSettings.commissionRate}% commission on all referred sales</span>
          {d.canUseStripe && <Badge variant="outline" className="text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Stripe Connected</Badge>}
         </div>
        </div>
       </div>
      </div></div>
     </div>

     {/* Stats Grid */}
     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {[
       { icon: DollarSign, value: `{formatGBP(d.availableBalance)}`, label: 'Available', color: 'bg-primary/10 text-primary' },
       { icon: TrendingUp, value: `{formatGBP(d.totalEarned)}`, label: 'Total Earned', color: 'bg-muted text-muted-foreground' },
       { icon: MousePointerClick, value: d.totalClicks.toLocaleString(), label: 'Link Clicks', color: 'bg-blue-500/10 text-blue-500' },
       { icon: UserPlus, value: d.totalSignups.toLocaleString(), label: 'Signups', color: 'bg-green-500/10 text-green-500' },
       { icon: BadgePercent, value: `${d.conversionRate}%`, label: 'Conversion', color: 'bg-purple-500/10 text-purple-500' },
      ].map(stat => (
       <div key={stat.label} className="border border-border rounded-xl overflow-hidden bg-card border-border">
        <div className="p-4 pt-5 pb-4"><div className="flex items-center gap-3">
         <div className={`h-9 w-9 rounded-lg ${stat.color.split(' ')[0]} flex items-center justify-center shrink-0`}><stat.icon className={`h-4 w-4 ${stat.color.split(' ')[1]}`} /></div>
         <div className="min-w-0"><p className="text-xl font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
        </div></div>
       </div>
      ))}
     </div>

     {/* Referral Link */}
     <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
      <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
       <h3 className="font-semibold text-lg">Your Referral Link</h3>
       <p className="text-sm text-muted-foreground">Share this link to earn {d.affiliateSettings.commissionRate}% on every sale</p>
      </div>
      <div className="p-4"><div className="flex gap-2">
       <Input readOnly value={d.profile?.referral_code ? `${window.location.origin}/auth?ref=${d.profile.referral_code}` : 'Loading...'} className="font-mono text-sm" />
       <Button variant="outline" size="icon" onClick={d.copyReferralLink} aria-label="Copy referral link"><Copy className="h-4 w-4" /></Button>
       <Button variant="outline" size="icon" asChild aria-label="Open referral link">
        <a href={d.profile?.referral_code ? `${window.location.origin}/auth?ref=${d.profile.referral_code}` : '#'} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
       </Button>
      </div></div>
     </div>

     {/* Payout Settings */}
     <PayoutSettingsSection
      payoutSettings={d.payoutSettings}
      setPayoutSettings={d.setPayoutSettings}
      paypalEmailError={d.paypalEmailError}
      setPaypalEmailError={d.setPaypalEmailError}
      validateEmail={d.validateEmail}
      connectStatusLoading={d.connectStatusLoading}
      canUseStripe={d.canUseStripe}
      isConnectingStripe={d.isConnectingStripe}
      handleConnectStripe={d.handleConnectStripe}
      connectStripeMutation={d.connectStripeMutation}
      updatePayoutSettingsMutation={d.updatePayoutSettingsMutation}
     />

     {/* Commissions + Payouts Grid */}
     <div className="grid lg:grid-cols-2 gap-6">
      <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
       <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-lg">Recent Commissions</h3></div>
       <div className="p-4">
        {d.commissions && d.commissions.length > 0 ? (
         <div className="space-y-2">
          {d.commissions.map(c => (
           <div key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div><p className="font-medium">£{(c.commission_amount / 100).toFixed(2)}</p><p className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy, HH:mm')}</p></div>
            <Badge variant="outline" className={c.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}>{c.status}</Badge>
           </div>
          ))}
         </div>
        ) : (
         <div className="text-center py-8 text-muted-foreground"><TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No commissions yet</p><p className="text-sm">Share your referral link to start earning!</p></div>
        )}
       </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
       <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-lg">Payout History</h3></div>
       <div className="p-4">
        {d.pendingPayouts && d.pendingPayouts.length > 0 ? (
         <div className="space-y-2">
          {d.pendingPayouts.map(p => (
           <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
             <p className="font-medium flex items-center gap-2">£{(p.amount / 100).toFixed(2)}<Badge variant="outline" className="text-xs">{p.payout_method === 'stripe' ? 'Stripe' : p.payout_method === 'bank_transfer' ? 'Bank' : 'PayPal'}</Badge></p>
             <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy')}</p>
            </div>
            <Badge variant="outline" className={p.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/30' : p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}>{p.status}</Badge>
           </div>
          ))}
         </div>
        ) : (
         <div className="text-center py-8 text-muted-foreground"><CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No payouts yet</p></div>
        )}
       </div>
      </div>
     </div>
    </motion.div>
   </div>
  </MainLayout>
 );
}
