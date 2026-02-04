import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReportIPViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

type ViolationType = 'copyright' | 'trademark' | 'stolen_asset' | 'unauthorized_resale' | 'other';

export function ReportIPViolationDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: ReportIPViolationDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: user?.email || '',
    violation_type: '' as ViolationType | '',
    description: '',
    original_work_url: '',
    evidence_urls: '',
    is_rights_holder: false,
    confirm_accuracy: false,
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      const evidenceArray = formData.evidence_urls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const { error } = await supabase
        .from('ip_violation_reports')
        .insert({
          product_id: productId,
          reporter_id: user?.id || null,
          reporter_name: formData.reporter_name,
          reporter_email: formData.reporter_email,
          violation_type: formData.violation_type as ViolationType,
          description: formData.description,
          original_work_url: formData.original_work_url || null,
          evidence_urls: evidenceArray.length > 0 ? evidenceArray : null,
          is_rights_holder: formData.is_rights_holder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report submitted successfully. We will review it within 24-48 hours.');
      onOpenChange(false);
      setFormData({
        reporter_name: '',
        reporter_email: user?.email || '',
        violation_type: '',
        description: '',
        original_work_url: '',
        evidence_urls: '',
        is_rights_holder: false,
        confirm_accuracy: false,
      });
    },
    onError: (error) => {
      console.error('Failed to submit report:', error);
      toast.error('Failed to submit report. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reporter_name || !formData.reporter_email || !formData.violation_type || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.confirm_accuracy) {
      toast.error('You must confirm the accuracy of your report');
      return;
    }

    submitReport.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Report IP Violation
          </DialogTitle>
          <DialogDescription>
            Report a potential intellectual property violation for "{productName}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reporter_name">Your Name *</Label>
              <Input
                id="reporter_name"
                value={formData.reporter_name}
                onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                placeholder="Full legal name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporter_email">Your Email *</Label>
              <Input
                id="reporter_email"
                type="email"
                value={formData.reporter_email}
                onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          {/* Violation Type */}
          <div className="space-y-2">
            <Label>Type of Violation *</Label>
            <Select
              value={formData.violation_type}
              onValueChange={(value) => setFormData({ ...formData, violation_type: value as ViolationType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select violation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="copyright">Copyright Infringement</SelectItem>
                <SelectItem value="trademark">Trademark Violation</SelectItem>
                <SelectItem value="stolen_asset">Stolen Asset (Roblox)</SelectItem>
                <SelectItem value="unauthorized_resale">Unauthorized Resale</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description of Violation *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe how this product infringes on your intellectual property rights..."
              rows={4}
              required
            />
          </div>

          {/* Original Work URL */}
          <div className="space-y-2">
            <Label htmlFor="original_work_url">Link to Original Work (optional)</Label>
            <Input
              id="original_work_url"
              type="url"
              value={formData.original_work_url}
              onChange={(e) => setFormData({ ...formData, original_work_url: e.target.value })}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Provide a link to your original work or portfolio
            </p>
          </div>

          {/* Evidence URLs */}
          <div className="space-y-2">
            <Label htmlFor="evidence_urls">Evidence Links (optional)</Label>
            <Textarea
              id="evidence_urls"
              value={formData.evidence_urls}
              onChange={(e) => setFormData({ ...formData, evidence_urls: e.target.value })}
              placeholder="One URL per line..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Screenshots, proof of ownership, etc. (one URL per line)
            </p>
          </div>

          {/* Rights Holder Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="is_rights_holder"
              checked={formData.is_rights_holder}
              onCheckedChange={(checked) => setFormData({ ...formData, is_rights_holder: checked as boolean })}
            />
            <label htmlFor="is_rights_holder" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I am the rights holder or authorized to act on their behalf
            </label>
          </div>

          {/* Accuracy Confirmation */}
          <div className="flex items-start space-x-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Checkbox
              id="confirm_accuracy"
              checked={formData.confirm_accuracy}
              onCheckedChange={(checked) => setFormData({ ...formData, confirm_accuracy: checked as boolean })}
            />
            <label htmlFor="confirm_accuracy" className="text-sm leading-tight">
              <span className="font-medium">I confirm</span> that the information in this report is accurate 
              and that I have a good faith belief that the reported use is not authorized by the rights holder.
            </label>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              Filing false reports may result in account suspension. See our{' '}
              <Link to="/dmca" className="text-primary hover:underline">DMCA Policy</Link> for details.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitReport.isPending}>
              {submitReport.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
