import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, AlertTriangle, XCircle, Store, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface StoreHealth {
  id: string;
  store_id: string;
  overall_score: number;
  dispute_rate: number;
  listing_quality_score: number;
  active_violations: number;
  status: string;
  last_calculated_at: string;
  stores?: { name: string; slug: string; is_active: boolean; owner_id: string };
}

interface Violation {
  id: string;
  store_id: string;
  violation_type: string;
  severity: string;
  description: string;
  is_auto_detected: boolean;
  is_resolved: boolean;
  created_at: string;
  stores?: { name: string };
}

type Filter = "all" | "healthy" | "at_risk" | "critical" | "suspended";

const statusConfig = {
  healthy: { label: "Healthy", color: "text-green-600", icon: ShieldCheck },
  at_risk: { label: "At Risk", color: "text-amber-600", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-600", icon: XCircle },
};

export default function ComplianceDashboard() {
  const [stores, setStores] = useState<StoreHealth[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [recalculating, setRecalculating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [healthRes, violationsRes] = await Promise.all([
      supabase.from("store_health_scores").select("*, stores(name, slug, is_active, owner_id)").order("overall_score", { ascending: true }),
      supabase.from("compliance_violations").select("*, stores(name)").eq("is_resolved", false).order("created_at", { ascending: false }).limit(100),
    ]);
    setStores((healthRes.data || []) as unknown as StoreHealth[]);
    setViolations((violationsRes.data || []) as unknown as Violation[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke("calculate-store-health");
      if (error) throw error;
      toast.success("Health scores recalculated");
      await load();
    } catch (e) {
      toast.error("Failed to recalculate", { description: String(e) });
    }
    setRecalculating(false);
  };

  const resolveViolation = async (id: string) => {
    const { error } = await supabase.from("compliance_violations")
      .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolution_notes: "Manually resolved by admin" })
      .eq("id", id);
    if (error) { toast.error("Failed to resolve"); return; }
    toast.success("Violation resolved");
    setViolations(prev => prev.filter(v => v.id !== id));
  };

  const filtered = stores.filter(s => {
    if (filter === "suspended") return s.stores?.is_active === false;
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.stores?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: stores.length,
    healthy: stores.filter(s => s.status === "healthy").length,
    at_risk: stores.filter(s => s.status === "at_risk").length,
    critical: stores.filter(s => s.status === "critical").length,
    suspended: stores.filter(s => s.stores?.is_active === false).length,
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Compliance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor store health and policy compliance</p>
        </div>
        <Button variant="outline" size="sm" onClick={recalculate} disabled={recalculating}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${recalculating ? "animate-spin" : ""}`} />
          Recalculate
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["all", "healthy", "at_risk", "critical", "suspended"] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`border rounded-xl p-3 text-left transition-colors ${filter === f ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
            <p className="text-xs text-muted-foreground capitalize">{f.replace("_", " ")}</p>
            <p className="text-lg font-semibold text-foreground">{counts[f]}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search stores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {/* Active Violations */}
      {violations.length > 0 && (
        <div className="border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Active Violations ({violations.length})</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {violations.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{v.stores?.name || "Unknown"}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      v.severity === "strike" ? "bg-red-100 text-red-800 border-red-200" :
                      v.severity === "suspension" ? "bg-red-200 text-red-900 border-red-300" :
                      "bg-amber-100 text-amber-800 border-amber-200"
                    }`}>{v.severity}</span>
                    {v.is_auto_detected && <span className="text-[10px] text-muted-foreground">auto</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{v.description}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => resolveViolation(v.id)}>Resolve</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Store Health Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Store</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Score</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Disputes</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Quality</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Violations</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const cfg = statusConfig[s.status as keyof typeof statusConfig] || statusConfig.healthy;
                const Icon = cfg.icon;
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[200px]">{s.stores?.name || "—"}</span>
                        {s.stores?.is_active === false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">suspended</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-semibold ${cfg.color}`}>{s.overall_score}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">{s.dispute_rate}%</td>
                    <td className="p-3 text-center text-muted-foreground">{s.listing_quality_score}%</td>
                    <td className="p-3 text-center">
                      {s.active_violations > 0 ? (
                        <span className="text-red-600 font-medium">{s.active_violations}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No stores match this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
