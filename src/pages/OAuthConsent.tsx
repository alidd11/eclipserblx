import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, X } from "lucide-react";

// Local typed wrapper around the beta supabase.auth.oauth namespace.
type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data?: AuthorizationDetails; error?: { message: string } | null };
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Redirect unauthenticated users through /auth, preserving the FULL consent URL.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = window.location.pathname + window.location.search;
      navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !authorizationId) return;
    let active = true;
    (async () => {
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data ?? null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load authorization request");
      }
    })();
    return () => { active = false; };
  }, [user, authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth.approveAuthorization(authorizationId)
        : await oauth.denyAuthorization(authorizationId);
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError("No redirect returned by the authorization server.");
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (!authorizationId) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-lg font-semibold">Missing authorization</h1>
          <p className="text-sm text-muted-foreground">This link is missing an <code>authorization_id</code>.</p>
        </div>
      </main>
    );
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold">Could not load this authorization request</h1>
          <p className="text-sm text-muted-foreground break-words">{error}</p>
          <Button variant="outline" onClick={() => navigate("/")}>Return home</Button>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "an application";

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md border border-border rounded-xl bg-card p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 text-primary p-2">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold leading-tight">
              Connect {clientName} to Eclipse
            </h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="text-foreground">{user.email}</span>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
          <p className="text-foreground">
            This lets {clientName} use Eclipse as you — calling enabled marketplace
            tools while you are signed in.
          </p>
          <p className="text-muted-foreground text-xs">
            Eclipse's permissions and backend policies still decide what data is accessible.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2">
          <Button className="h-12 w-full" disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Approve and connect`}
          </Button>
          <Button variant="ghost" className="h-11 w-full" disabled={busy} onClick={() => decide(false)}>
            <X className="h-4 w-4 mr-1" /> Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}
