import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Fingerprint, Trash2, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useAuth } from '@/hooks/useAuth';

export function SecuritySettingsTab() {
 const { user } = useAuth();
 const {
 isSupported: biometricSupported,
 isEnrolled,
 loading: biometricLoading,
 checkSupport,
 checkEnrollment,
 enrollBiometric,
 removeBiometric,
 authenticateWithBiometric,
 } = useBiometricAuth();

 useEffect(() => { checkSupport(); }, [checkSupport]);
 useEffect(() => { if (user?.id) checkEnrollment(user.id); }, [user?.id, checkEnrollment]);

 const handleEnrollBiometric = async () => {
 if (!user?.id || !user?.email) return toast.error('Please sign in first');
 const result = await enrollBiometric(user.id, user.email);
 if (result.success) toast.success('Face ID / Touch ID enrolled successfully');
 else toast.error(result.error || 'Failed to enroll biometric');
 };

 const handleRemoveBiometric = () => {
 if (!user?.id) return;
 removeBiometric(user.id);
 toast.success('Biometric authentication removed');
 };

 const handleTestBiometric = async () => {
 if (!user?.id) return toast.error('You must be logged in to test biometric');
 if (!biometricSupported) return toast.error('Biometric authentication is not supported on this device');
 if (!isEnrolled) return toast.error('Please enroll biometric first');
 const result = await authenticateWithBiometric(user.id);
 if (result.success) toast.success('Biometric authentication successful!');
 else toast.error(result.error || 'Biometric authentication failed');
 };

 return (
 <div className="space-y-6">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center gap-2">
 <Fingerprint className="h-5 w-5 text-primary" />
 <h3 className="font-semibold text-sm">Face ID / Touch ID</h3>
 </div>
 <p className="text-sm text-muted-foreground">Use biometric authentication for quick login</p>
 </div>
 <div className="p-4 space-y-5">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Device Support</Label>
 <p className="text-sm text-muted-foreground">
 {biometricSupported === null ? 'Checking...'
 : biometricSupported ? 'Your device supports biometric authentication'
 : 'Biometric auth not available on this device'}
 </p>
 </div>
 {biometricSupported === null ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : biometricSupported ? (
 <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Available</Badge>
 ) : (
 <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Not Available</Badge>
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Enrollment Status</Label>
 <p className="text-sm text-muted-foreground">
 {isEnrolled ? 'Biometric login is set up' : 'Not enrolled yet'}
 </p>
 </div>
 {isEnrolled ? (
 <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Enrolled</Badge>
 ) : (
 <Badge className="bg-muted text-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" /> Not Enrolled</Badge>
 )}
 </div>

 {biometricSupported && (
 <div className="space-y-2">
 {!isEnrolled ? (
 <Button onClick={handleEnrollBiometric} variant="outline" className="w-full" disabled={biometricLoading}>
 {biometricLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Fingerprint className="h-4 w-4 mr-2" />}
 Set Up Face ID / Touch ID
 </Button>
 ) : (
 <>
 <Button onClick={handleTestBiometric} variant="secondary" className="w-full" disabled={biometricLoading}>
 {biometricLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Fingerprint className="h-4 w-4 mr-2" />}
 Test Biometric Login
 </Button>
 <Button onClick={handleRemoveBiometric} variant="destructive" className="w-full" disabled={biometricLoading}>
 <Trash2 className="h-4 w-4 mr-2" />
 Remove Biometric Login
 </Button>
 </>
 )}
 </div>
 )}

 {!biometricSupported && biometricSupported !== null && (
 <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
 Biometric authentication requires a device with Face ID, Touch ID, or Windows Hello.
 </p>
 )}
 </div>
 </div>
 </div>
 );
}
