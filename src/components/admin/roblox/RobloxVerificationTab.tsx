import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { Shield, Users, Crown, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface RobloxVerificationTabProps {
  testRobloxId: string;
  setTestRobloxId: (v: string) => void;
  groupId: string;
  isTestingGroup: boolean;
  groupTestResult: { success: boolean; message: string } | null;
  handleTestGroupVerification: () => void;
  isTestingPremium: boolean;
  premiumTestResult: { success: boolean; message: string } | null;
  handleTestPremiumVerification: () => void;
}

export function RobloxVerificationTab(props: RobloxVerificationTabProps) {
  const {
    testRobloxId, setTestRobloxId, groupId,
    isTestingGroup, groupTestResult, handleTestGroupVerification,
    isTestingPremium, premiumTestResult, handleTestPremiumVerification,
  } = props;

  return (
    <TabsContent value="verification" className="space-y-4">
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="h-5 w-5" />Test Verification</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Test group membership and premium status verification</p>
        </div>
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="test-roblox-id">Roblox User ID to Test</Label>
            <Input id="test-roblox-id" placeholder="Enter a Roblox User ID" value={testRobloxId} onChange={(e) => setTestRobloxId(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2"><Users className="h-4 w-4" /><p className="font-medium text-sm">Group Membership</p></div>
              <Button variant="outline" onClick={handleTestGroupVerification} disabled={isTestingGroup || !testRobloxId || !groupId} className="w-full">
                {isTestingGroup ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Test Group
              </Button>
              {groupTestResult && (
                <div className={`flex items-start gap-2 text-sm p-2 rounded ${groupTestResult.success ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                  {groupTestResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{groupTestResult.message}</span>
                </div>
              )}
            </div>
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" /><p className="font-medium text-sm">Premium Status</p></div>
              <Button variant="outline" onClick={handleTestPremiumVerification} disabled={isTestingPremium || !testRobloxId} className="w-full">
                {isTestingPremium ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                Test Premium
              </Button>
              {premiumTestResult && (
                <div className={`flex items-start gap-2 text-sm p-2 rounded ${premiumTestResult.success ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                  {premiumTestResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{premiumTestResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}