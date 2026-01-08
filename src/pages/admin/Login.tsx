import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Eye, EyeOff, Fingerprint, Smartphone } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const AdminLogin = forwardRef<HTMLDivElement>(function AdminLogin(_, ref) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showEnrollPrompt, setShowEnrollPrompt] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const { signIn, user } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    isSupported,
    isEnrolled,
    loading: biometricLoading,
    checkSupport,
    checkEnrollment,
    enrollBiometric,
    authenticateWithBiometric,
    getStoredUserId,
  } = useBiometricAuth();

  // Check biometric support on mount
  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  // Check enrollment when we have a stored user
  useEffect(() => {
    const storedUserId = getStoredUserId();
    if (storedUserId) {
      checkEnrollment(storedUserId);
    }
  }, [getStoredUserId, checkEnrollment]);

  // Redirect if already logged in as staff
  useEffect(() => {
    if (!adminLoading && !loading && user && isStaff) {
      navigate('/admin');
    }
  }, [user, isStaff, adminLoading, loading, navigate]);

  const handleBiometricLogin = async () => {
    const storedUserId = getStoredUserId();
    if (!storedUserId) {
      toast({
        title: 'No biometric enrolled',
        description: 'Please log in with password first.',
        variant: 'destructive',
      });
      return;
    }

    const result = await authenticateWithBiometric(storedUserId);
    if (result.success) {
      // Refresh the session - user should still be logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        toast({
          title: 'Welcome back!',
          description: 'Redirecting to dashboard...',
        });
        navigate('/admin');
      } else {
        toast({
          title: 'Session expired',
          description: 'Please log in with your password.',
          variant: 'destructive',
        });
      }
    } else {
      if (result.error !== 'Authentication cancelled') {
        toast({
          title: 'Biometric failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    }
  };

  const handleEnrollBiometric = async () => {
    if (!pendingUserId || !pendingEmail) return;

    const result = await enrollBiometric(pendingUserId, pendingEmail);
    if (result.success) {
      toast({
        title: 'Biometric enrolled!',
        description: 'You can now use Face ID/Touch ID to log in.',
      });
    } else {
      toast({
        title: 'Enrollment failed',
        description: result.error,
        variant: 'destructive',
      });
    }
    setShowEnrollPrompt(false);
    navigate('/admin');
  };

  const handleSkipEnrollment = () => {
    setShowEnrollPrompt(false);
    navigate('/admin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Login Failed',
            description: 'Invalid email or password. Please try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Login Failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        // Wait for roles to be fetched then redirect
        toast({
          title: 'Welcome back!',
          description: 'Redirecting to dashboard...',
        });
        // Force a small delay to allow role query to refetch
        setTimeout(() => {
          navigate('/admin');
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show biometric enrollment prompt
  if (showEnrollPrompt) {
    return (
      <div ref={ref} className="min-h-screen flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-4">
                <Fingerprint className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold">Enable Biometric Login?</h1>
              <p className="text-muted-foreground mt-2">
                Use Face ID or Touch ID for faster, secure logins
              </p>
            </div>

            <div className="gaming-card p-6 space-y-4">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                <p>Your biometric data never leaves your device. We only store a secure key.</p>
              </div>

              <Button
                onClick={handleEnrollBiometric}
                className="w-full gradient-button border-0"
                disabled={biometricLoading}
              >
                {biometricLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Fingerprint className="mr-2 h-4 w-4" />
                Enable Biometric Login
              </Button>

              <Button
                onClick={handleSkipEnrollment}
                variant="ghost"
                className="w-full"
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const storedUserId = getStoredUserId();
  const canUseBiometric = isSupported && storedUserId && isEnrolled;

  return (
    <div ref={ref} className="min-h-screen flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Staff Login</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to access the admin dashboard
            </p>
          </div>

          {/* Biometric Login Button */}
          {canUseBiometric && (
            <div className="gaming-card p-4">
              <Button
                onClick={handleBiometricLogin}
                className="w-full h-14 text-lg"
                variant="outline"
                disabled={biometricLoading}
              >
                {biometricLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Fingerprint className="mr-2 h-5 w-5" />
                )}
                Sign in with Face ID / Touch ID
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or use password</span>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="gaming-card p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input"
                autoComplete="email"
                required
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gradient-button border-0"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          {/* Biometric hint */}
          {isSupported && !canUseBiometric && (
            <p className="text-center text-xs text-muted-foreground">
              <Fingerprint className="inline h-3 w-3 mr-1" />
              Sign in with password to enable biometric login
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Eclipse Admin Dashboard
          </p>
        </div>
      </div>
    </div>
  );
});

export default AdminLogin;
