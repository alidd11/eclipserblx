import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSellerStatus } from "@/hooks/useSellerStatus";
import { ShieldCheck, AlertTriangle, XCircle, Activity, Image, Package, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";

interface HealthScore {
  overall_score: number;
  dispute_rate: number;
  avg_response_hours: number;
  listing_quality_score: number;
  delivery_rate: number;
  active_violations: number;
  status: string;
  last_calculated_at: string;
}

interface Violation {
  id: string;
  violation_type: string;
  severity: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

const statusConfig = {
  healthy: { label: "Healthy", color: "text-success", bg: "bg-success", icon: ShieldCheck },
  at_risk: { label: "At Risk", color: "text-warning", bg: "bg-warning", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-destructive", bg: "bg-destructive", icon: XCircle },
};

const severityBadge = {
  warning: "bg-warning text-warning border-warning",
  strike: "bg-destructive text-destructive border-destructive",
  suspension: "bg-destructive text-destructive border-destructive",
};

const violationTypeLabels: Record<string, string> = {
  low_quality_listing: "Low Quality Listing",
  high_dispute_rate: "High Dispute Rate",
  inactive: "Inactive Store",
  policy_breach: "Policy Breach",
  auto_suspension: "Auto Suspension",
};

export default function SellerAccountHealth() {
  const { store: activeStore, loading: sellerLoading } = useSellerStatus();
  const [health, setHealth] = useState<HealthScore | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (sellerLoading) return;
    if (!activeStore?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [healthRes, violationsRes] = await Promise.all([
        supabase.from("store_health_scores").select("*").eq("store_id", activeStore.id).maybeSingle(),
        supabase.from("compliance_violations").select("*").eq("store_id", activeStore.id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (healthRes.error) throw healthRes.error;
      if (violationsRes.error) throw violationsRes.error;
      setHealth(healthRes.data as HealthScore | null);
      setViolations((violationsRes.data || []) as Violation[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Account health could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id, sellerLoading]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <SellerLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </SellerLayout>
    );
  }

  if (loadError) {
    return (
      <SellerLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="max-w-md space-y-4 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
            <div>
              <h1 className="text-xl font-semibold">Account health is unavailable</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your store has not been assigned a health status while compliance data is unavailable.
              </p>
            </div>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </SellerLayout>
    );
  }

  const hasHealthScore = health !== null;
  const cfg = hasHealthScore
    ? statusConfig[health.status as keyof typeof statusConfig] || statusConfig.healthy
    : { label: "Pending", color: "text-muted-foreground", bg: "bg-muted", icon: Activity };
  const StatusIcon = cfg.icon;
  const score = health?.overall_score ?? 0;

  const metrics: Array<{
    label: string;
    value: string;
    target: string;
    icon: typeof Activity;
    ok: boolean | null;
  }> = hasHealthScore ? [
    { label: "Dispute Rate", value: `${health?.dispute_rate ?? 0}%`, target: "< 15%", icon: AlertTriangle, ok: (health?.dispute_rate ?? 0) < 15 },
    { label: "Listing Quality", value: `${health?.listing_quality_score ?? 100}%`, target: "> 80%", icon: Image, ok: (health?.listing_quality_score ?? 100) > 80 },
    { label: "Delivery Rate", value: `${health?.delivery_rate ?? 100}%`, target: "> 95%", icon: Package, ok: (health?.delivery_rate ?? 100) > 95 },
    { label: "Active Violations", value: `${health?.active_violations ?? 0}`, target: "0", icon: Activity, ok: (health?.active_violations ?? 0) === 0 },
  ] : [
    { label: "Dispute Rate", value: "—", target: "< 15%", icon: AlertTriangle, ok: null },
    { label: "Listing Quality", value: "—", target: "> 80%", icon: Image, ok: null },
    { label: "Delivery Rate", value: "—", target: "> 95%", icon: Package, ok: null },
    { label: "Active Violations", value: `${violations.filter(v => !v.is_resolved).length}`, target: "0", icon: Activity, ok: null },
  ];

  const activeViolations = violations.filter(v => !v.is_resolved);
  const resolvedViolations = violations.filter(v => v.is_resolved);

  return (
    <SellerLayout>
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Account Health</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor your store's compliance and performance metrics</p>
      </div>

      {/* Score Overview */}
      <div className="border border-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className={cfg.color} strokeWidth="8"
                strokeDasharray={`${score * 2.64} 264`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${cfg.color}`}>{score}</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
              <span className={`text-lg font-semibold ${cfg.color}`}>{cfg.label}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {!hasHealthScore ? "Your first automated compliance calculation is pending." :
               score >= 60 ? "Your store meets marketplace standards." :
               score >= 40 ? "Your store needs attention. Resolve violations to avoid suspension." :
               "Your store is at risk of suspension. Immediate action required."}
            </p>
            {health?.last_calculated_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {new Date(health.last_calculated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`h-4 w-4 ${m.ok === null ? "text-muted-foreground" : m.ok ? "text-success" : "text-destructive"}`} />
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">Target: {m.target}</p>
          </div>
        ))}
      </div>

      {/* Active Violations */}
      {activeViolations.length > 0 && (
        <div className="border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Active Violations ({activeViolations.length})</h2>
          <div className="space-y-2">
            {activeViolations.map(v => (
              <div key={v.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{violationTypeLabels[v.violation_type] || v.violation_type}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${severityBadge[v.severity as keyof typeof severityBadge] || severityBadge.warning}`}>
                      {v.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(v.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Violations */}
      {resolvedViolations.length > 0 && (
        <div className="border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Resolved ({resolvedViolations.length})</h2>
          <div className="space-y-2">
            {resolvedViolations.slice(0, 10).map(v => (
              <div key={v.id} className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg opacity-60">
                <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground">{violationTypeLabels[v.violation_type] || v.violation_type}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.resolution_notes || v.description}</p>
                  <p className="text-[10px] text-muted-foreground">Resolved {v.resolved_at ? new Date(v.resolved_at).toLocaleDateString() : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeViolations.length === 0 && resolvedViolations.length === 0 && (
        <div className="border border-border rounded-xl p-8 text-center">
          <ShieldCheck className="h-8 w-8 text-success mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No violations</p>
          <p className="text-xs text-muted-foreground mt-1">Your store is in good standing</p>
        </div>
      )}
    </div>
    </SellerLayout>
  );
}
