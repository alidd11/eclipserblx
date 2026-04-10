import { Check, X, Clock, ExternalLink, Loader2, Shield, Users, Award, Mail, ShoppingBag, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {} formatRelative } from '@/lib/dateUtils';
import { useState } from 'react';
import { formatGBP } from '@/lib/formatters';

interface VerificationResults {
  discord_server?: { valid: boolean; is_permanent: boolean; guild_name?: string; member_count?: number; error?: string };
  roblox_group?: { in_group: boolean; group_name?: string; role?: string; rank?: number; error?: string };
  roblox_badges?: { required: string[]; owned: string[]; missing: string[]; all_owned: boolean };
  account_age?: { days: number; meets_requirement: boolean; required_days: number };
  email_verified?: boolean;
  purchase_history?: { count: number; total_spent: number; meets_requirement: boolean; required_count: number };
  identity_consistency?: { discord_username: string; roblox_username: string; similarity_score: number; is_consistent: boolean };
}

interface StoreApplication {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  product_category: string | null;
  expected_products: string | null;
  portfolio_url: string | null;
  experience: string | null;
  discord_server_invite: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  verification_results?: VerificationResults;
  profiles?: {
    display_name: string | null;
    email: string;
    customer_id: string | null;
    discord_username: string | null;
    roblox_username: string | null;
  };
}

interface ApplicationDetailDialogProps {
  application: StoreApplication | null;
  onClose: () => void;
  onApprove: (app: StoreApplication) => void;
  onReject: (id: string, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case 'approved': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
    case 'rejected': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
    default: return null;
  }
}

export function ApplicationDetailDialog({ application, onClose, onApprove, onReject, isApproving, isRejecting }: ApplicationDetailDialogProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  if (!application) return null;

  return (
    <>
      <Dialog open={!!application} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{application.store_name}</DialogTitle>
            <DialogDescription>Application from {application.profiles?.display_name || 'Unknown User'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getStatusBadge(application.status)}
              <span className="text-sm text-muted-foreground">Submitted {formatRelative(application.created_at)}</span>
            </div>

            {application.verification_results && <VerificationResultsCard results={application.verification_results} />}

            <div className="grid gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Applicant</Label>
                <p className="font-medium">{application.profiles?.display_name}</p>
                {application.profiles?.customer_id && <p className="text-xs font-mono text-muted-foreground">{application.profiles.customer_id}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground text-xs">Discord</Label><p className="text-sm">{application.profiles?.discord_username || 'Not linked'}</p></div>
                <div><Label className="text-muted-foreground text-xs">Roblox</Label><p className="text-sm">{application.profiles?.roblox_username || 'Not linked'}</p></div>
              </div>
              {application.store_description && <div><Label className="text-muted-foreground text-xs">Store Description</Label><p className="text-sm">{application.store_description}</p></div>}
              {application.product_category && <div><Label className="text-muted-foreground text-xs">Product Category</Label><p className="text-sm">{application.product_category}</p></div>}
              {application.discord_server_invite && (
                <div>
                  <Label className="text-muted-foreground text-xs">Discord Server Invite</Label>
                  <a href={application.discord_server_invite} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    {application.discord_server_invite}<ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {application.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                  <Label className="text-destructive text-xs">Rejection Reason</Label>
                  <p className="text-sm">{application.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {application.status === 'pending' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}><X className="h-4 w-4 mr-2" />Reject</Button>
              <Button onClick={() => onApprove(application)} disabled={isApproving}>
                {isApproving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Approve & Create Store
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>Please provide a reason for rejection. This will be shown to the applicant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why this application is being rejected..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onReject(application.id, rejectionReason); setShowRejectDialog(false); setRejectionReason(''); }} disabled={!rejectionReason.trim() || isRejecting}>
              {isRejecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VerificationResultsCard({ results }: { results: VerificationResults }) {
  const items: Array<{ icon: React.ElementType; label: string; passed: boolean; detail?: string }> = [];

  if (results.account_age) items.push({ icon: Clock, label: `Account Age: ${results.account_age.days} days`, passed: results.account_age.meets_requirement, detail: `Required: ${results.account_age.required_days}+ days` });
  if (typeof results.email_verified === 'boolean') items.push({ icon: Mail, label: 'Email Verified', passed: results.email_verified });
  if (results.discord_server) {
    const ds = results.discord_server;
    items.push({ icon: ExternalLink, label: ds.guild_name ? `Discord: ${ds.guild_name}` : 'Discord Server', passed: ds.valid && ds.is_permanent, detail: ds.member_count ? `${ds.member_count.toLocaleString()} members` : ds.error });
  }
  if (results.roblox_group) {
    const rg = results.roblox_group;
    items.push({ icon: Users, label: rg.group_name ? `Group: ${rg.group_name}` : 'Roblox Group', passed: rg.in_group, detail: rg.role ? `Role: ${rg.role}` : rg.error });
  }
  if (results.roblox_badges) {
    const rb = results.roblox_badges;
    items.push({ icon: Award, label: `Badges: ${rb.owned.length}/${rb.required.length}`, passed: rb.all_owned, detail: rb.missing.length > 0 ? `Missing: ${rb.missing.join(', ')}` : 'All owned' });
  }
  if (results.purchase_history) {
    const ph = results.purchase_history;
    items.push({ icon: ShoppingBag, label: `Purchases: ${ph.count} ({formatGBP(ph.total_spent)})`, passed: ph.meets_requirement, detail: ph.required_count > 0 ? `Required: ${ph.required_count}+ orders` : undefined });
  }
  if (results.identity_consistency) {
    const ic = results.identity_consistency;
    items.push({ icon: UserCheck, label: `Identity Match: ${ic.similarity_score}%`, passed: ic.is_consistent, detail: `Discord: ${ic.discord_username} | Roblox: ${ic.roblox_username}` });
  }

  if (items.length === 0) return null;
  const passedCount = items.filter(i => i.passed).length;
  const percentage = Math.round((passedCount / items.length) * 100);

  return (
    <div className="border border-border rounded-xl overflow-hidden border-muted">
      <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="h-4 w-4" />Verification Report</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Progress value={percentage} className="flex-1" />
          <span className="text-sm font-medium">{passedCount}/{items.length}</span>
        </div>
        <div className="grid gap-2 text-sm">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              {item.passed ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className={item.passed ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>{item.label}</span>
                {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
