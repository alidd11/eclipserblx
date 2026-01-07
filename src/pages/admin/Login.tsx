import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

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

  const { signIn, user } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in as staff
  useEffect(() => {
    if (!adminLoading && user && isStaff) {
      navigate('/admin');
    }
  }, [user, isStaff, adminLoading, navigate]);

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
        toast({
          title: 'Welcome back!',
          description: 'Redirecting to dashboard...',
        });
        // The useEffect will handle redirect after roles are loaded
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth status
  if (adminLoading && user) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen flex flex-col bg-background">
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

          <p className="text-center text-xs text-muted-foreground">
            Eclipse Admin Dashboard
          </p>
        </div>
      </div>
    </div>
  );
});

export default AdminLogin;
