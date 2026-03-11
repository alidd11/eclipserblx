import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Gavel, Loader2, Copy, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  detection: any;
  onClose: () => void;
  userId?: string;
}

export function TakedownFromDetectionDialog({ detection, onClose, userId }: Props) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [goodFaith, setGoodFaith] = useState(false);
  const [accuracy, setAccuracy] = useState(false);
  const [ownership, setOwnership] = useState(false);
  const [filingMethod, setFilingMethod] = useState<'self' | 'agent'>('self');
  const [agentAuth, setAgentAuth] = useState(false);
  const [templateCopied, setTemplateCopied] = useState(false);

  if (!detection) return null;

  const gameUrl = `https://www.roblox.com/games/${detection.detected_place_id || detection.detected_universe_id}`;
  const matchReasons = (detection.match_reasons || []).join(', ');

  const dmcaTemplate = `Dear Roblox Trust & Safety Team,

I am writing to report copyright infringement on your platform.

IDENTIFICATION OF COPYRIGHTED WORK:
I am the original creator of the work being infringed. My original work is registered with Eclipse IP Shield (case pending).

IDENTIFICATION OF INFRINGING MATERIAL:
Game URL: ${gameUrl}
Game Name: "${detection.game_name}"
Creator: ${detection.game_creator_name}
Universe ID: ${detection.detected_universe_id}

This game has been identified as a potential copy with ${detection.similarity_score}% similarity to my original work.
Detection details: ${matchReasons || 'Name match'}

${evidenceNotes ? `ADDITIONAL EVIDENCE:\n${evidenceNotes}\n` : ''}
STATEMENTS:
1. I have a good faith belief that use of the copyrighted materials described above is not authorised by the copyright owner, its agent, or the law.
2. The information in this notification is accurate.
3. Under penalty of perjury, I am the copyright owner or authorised to act on behalf of the owner.

CONTACT INFORMATION:
[Your Full Legal Name]
[Your Email Address]
[Your Address]

This notice is sent under the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512(c).`;

  const copyTemplate = () => {
    navigator.clipboard.writeText(dmcaTemplate);
    setTemplateCopied(true);
    setTimeout(() => setTemplateCopied(false), 2000);
    toast.success('DMCA template copied to clipboard');
  };

  const handleSubmit = async () => {
    if (!goodFaith || !accuracy || !ownership) {
      toast.error('Please confirm all statements');
      return;
    }
    if (filingMethod === 'agent' && !agentAuth) {
      toast.error('Please authorise us to act on your behalf');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('takedown_requests')
        .insert({
          creator_id: userId,
          status: 'submitted',
          priority: detection.similarity_score >= 70 ? 'high' : 'medium',
          infringement_type: 'copyright',
          target_platform: 'roblox',
          infringing_url: gameUrl,
          original_work_description: `Auto-detected copy of registered work. Game: "${detection.game_name}" by ${detection.game_creator_name}. Similarity: ${detection.similarity_score}%. Match reasons: ${matchReasons}.`,
          evidence_notes: evidenceNotes || `Automated detection found this game with ${detection.similarity_score}% similarity score. ${matchReasons}`,
          good_faith_statement: true,
          accuracy_statement: true,
          ownership_confirmed: true,
          filing_method: filingMethod,
          agent_authorization: filingMethod === 'agent',
        } as any)
        .select('id, case_number')
        .single();

      if (error) throw error;

      if (data?.id) {
        await supabase
          .from('ip_copy_detections' as any)
          .update({ takedown_request_id: data.id, status: 'takedown_filed' } as any)
          .eq('id', detection.id);
      }

      if (filingMethod === 'agent' && data?.id) {
        const { error: dmcaError } = await supabase.functions.invoke('file-dmca-takedown', {
          body: { takedown_id: data.id },
        });
        if (dmcaError) {
          toast.error('Case created but DMCA sending failed', { description: 'Our team will follow up manually.' });
        } else {
          toast.success('DMCA filed on your behalf!', { description: `Case ${data.case_number} — notice sent for review and forwarding.` });
        }
      } else {
        toast.success('Takedown case created!', { description: `Case ${data?.case_number}. Use the copied template to submit your DMCA notice directly.` });
      }

      queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
      queryClient.invalidateQueries({ queryKey: ['takedown-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
      onClose();
    } catch (err: any) {
      toast.error('Failed to file takedown', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!detection} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            File Takedown Request
          </DialogTitle>
          <DialogDescription>
            Pre-filled from detection: <strong>{detection.game_name}</strong> ({detection.similarity_score}% match)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p><strong>Target:</strong> {detection.game_name}</p>
            <p><strong>Creator:</strong> {detection.game_creator_name} ({detection.game_creator_type})</p>
            <p><strong>Platform:</strong> Roblox</p>
            <p><strong>Similarity:</strong> {detection.similarity_score}%</p>
            <p><strong>Match Reasons:</strong> {matchReasons || 'Name match'}</p>
            {detection.player_count > 0 && <p><strong>Players:</strong> {detection.player_count.toLocaleString()}</p>}
            {detection.game_created_at && <p><strong>Game Created:</strong> {format(new Date(detection.game_created_at), 'MMM d, yyyy')}</p>}
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">How would you like to file?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFilingMethod('self')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  filingMethod === 'self' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Copy className="h-4 w-4" />
                  <span className="font-medium text-sm">Self-File</span>
                </div>
                <p className="text-xs text-muted-foreground">Get a pre-filled DMCA template to submit yourself</p>
              </button>
              <button
                type="button"
                onClick={() => setFilingMethod('agent')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  filingMethod === 'agent' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium text-sm">We File For You</span>
                </div>
                <p className="text-xs text-muted-foreground">Authorise us to send the DMCA on your behalf</p>
              </button>
            </div>
          </div>

          <div>
            <Label>Additional Evidence Notes (optional)</Label>
            <Textarea
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="Add any additional context about why this is infringing..."
              rows={3}
            />
          </div>

          {filingMethod === 'self' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm">DMCA Notice Template</Label>
                <Button variant="outline" size="sm" onClick={copyTemplate} className="gap-1">
                  <Copy className="h-3 w-3" />
                  {templateCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                {dmcaTemplate}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Send this to <strong>dmca@roblox.com</strong> from your own email. Fill in your contact details.
              </p>
            </div>
          )}

          {filingMethod === 'agent' && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">Agent Authorisation</p>
              <p className="text-xs text-muted-foreground">
                By authorising us, Eclipse IP Shield will submit the DMCA notice on your behalf as your designated agent.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox id="agent-auth" checked={agentAuth} onCheckedChange={(v) => setAgentAuth(!!v)} />
                <Label htmlFor="agent-auth" className="text-xs">
                  I authorise Eclipse IP Shield to act as my agent and file DMCA notices on my behalf for this case.
                </Label>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox id="gf" checked={goodFaith} onCheckedChange={(v) => setGoodFaith(!!v)} />
              <Label htmlFor="gf" className="text-xs">I have a good faith belief that the use of the material is not authorised.</Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ac" checked={accuracy} onCheckedChange={(v) => setAccuracy(!!v)} />
              <Label htmlFor="ac" className="text-xs">The information in this notice is accurate.</Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ow" checked={ownership} onCheckedChange={(v) => setOwnership(!!v)} />
              <Label htmlFor="ow" className="text-xs">I am the owner or authorised to act on behalf of the owner.</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !goodFaith || !accuracy || !ownership || (filingMethod === 'agent' && !agentAuth)}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : filingMethod === 'agent' ? <Mail className="h-4 w-4 mr-2" /> : <Gavel className="h-4 w-4 mr-2" />}
            {filingMethod === 'agent' ? 'File DMCA On My Behalf' : 'Create Case & Copy Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
