import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePageMeta } from '@/hooks/usePageMeta';
import { showErrorNotification } from '@/lib/nativeNotification';
import { Link } from 'react-router-dom';

interface ApplicationData {
  id: string;
  position: string;
  applicant_name: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

interface Message {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  is_read: boolean | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">Pending Review</Badge>;
    case 'reviewing':
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">Under Review</Badge>;
    case 'accepted':
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Accepted</Badge>;
    case 'rejected':
      return <Badge variant="secondary" className="bg-red-500/20 text-red-400">Not Selected</Badge>;
    case 'closed':
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Closed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function TokenLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('validate_applicant_token', { p_token: trimmed })
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        showErrorNotification('Invalid Token', 'No application found for this access code. Please check your confirmation email.');
        return;
      }

      sessionStorage.setItem('applicant_token', trimmed);
      onLogin(trimmed);
    } catch {
      showErrorNotification('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-display font-bold">Applicant Portal</h1>
          <p className="text-sm text-muted-foreground">
            Enter the access code from your confirmation email to view your application status.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="token">Access Code</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-sm"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full h-12" disabled={loading || !token.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'View Application'}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Don't have a code? <Link to="/jobs" className="text-primary hover:underline">Apply for a position</Link>
        </p>
      </div>
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: app, error: appErr } = await supabase
          .rpc('validate_applicant_token', { p_token: token })
          .single();

        if (appErr || !app) {
          onLogout();
          return;
        }

        setApplication(app);

        const { data: msgs } = await supabase
          .rpc('get_applicant_messages', { p_token: token });

        setMessages(msgs || []);

        // Mark unread messages as read
        const unread = (msgs || []).filter(m => !m.is_read).map(m => m.id);
        if (unread.length > 0) {
          await supabase.rpc('mark_applicant_messages_read', { 
            p_token: token, 
            p_message_ids: unread 
          });
        }
      } catch {
        onLogout();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, onLogout]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!application) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold">Your Application</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hi {application.applicant_name}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs text-muted-foreground">
          Sign out
        </Button>
      </div>

      {/* Status card */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{application.position}</span>
          {getStatusBadge(application.status)}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Applied {new Date(application.created_at).toLocaleDateString()}</span>
          {application.reviewed_at && (
            <span>Reviewed {new Date(application.reviewed_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Messages</h2>
        {messages.length === 0 ? (
          <div className="border border-border rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground">No messages yet. We'll reach out if we need more information.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {messages.map((msg) => (
              <div key={msg.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{msg.subject}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicantPortal() {
  usePageMeta({
    title: 'Applicant Portal — Eclipse',
    description: 'Check your job application status and messages from the Eclipse team.',
    canonicalPath: '/careers/portal',
  });

  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('applicant_token'));

  const handleLogout = () => {
    sessionStorage.removeItem('applicant_token');
    setToken(null);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {token ? (
          <Dashboard token={token} onLogout={handleLogout} />
        ) : (
          <TokenLogin onLogin={setToken} />
        )}
      </div>
    </MainLayout>
  );
}
