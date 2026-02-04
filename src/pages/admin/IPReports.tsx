import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Shield, ExternalLink, CheckCircle, XCircle, Clock, Eye, AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface IPReport {
  id: string;
  product_id: string;
  reporter_email: string;
  reporter_name: string;
  violation_type: string;
  description: string;
  evidence_urls: string[] | null;
  original_work_url: string | null;
  is_rights_holder: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
  products?: {
    name: string;
    slug: string;
    stores?: {
      name: string;
      slug: string;
    } | null;
  } | null;
}

export default function IPReports() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedReport, setSelectedReport] = useState<IPReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["ip-reports", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("ip_violation_reports")
        .select(`
          *,
          products (
            name,
            slug,
            stores (name, slug)
          )
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as IPReport[];
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("ip_violation_reports")
        .update({
          status,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          resolved_at: status === "resolved" ? new Date().toISOString() : null,
        })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-reports"] });
      toast.success("Report updated successfully");
      setSelectedReport(null);
      setAdminNotes("");
    },
    onError: () => {
      toast.error("Failed to update report");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-destructive/20 text-destructive">Valid Violation</Badge>;
      case "invalid":
        return <Badge variant="secondary">Invalid</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/20 text-green-400">Resolved</Badge>;
      case "under_review":
        return <Badge className="bg-amber-500/20 text-amber-400">Under Review</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getViolationTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      copyright: "Copyright",
      trademark: "Trademark",
      stolen_asset: "Stolen Asset",
      unauthorized_resale: "Unauthorized Resale",
      other: "Other",
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  return (
    <AdminLayout requiredPermissions={['manage_seller_stores']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              IP Violation Reports
            </h1>
            <p className="text-muted-foreground">Review and manage intellectual property violation reports</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="invalid">Invalid</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All Reports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : reports?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports?.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {report.products?.name || "Unknown Product"}
                        {getStatusBadge(report.status)}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {getViolationTypeBadge(report.violation_type)}
                        <span>•</span>
                        <span>Reported {formatDistanceToNow(new Date(report.created_at))} ago</span>
                        {report.is_rights_holder && (
                          <>
                            <span>•</span>
                            <span className="text-primary">Rights Holder</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {report.products?.slug && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/products/${report.products.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Product
                          </Link>
                        </Button>
                      )}
                      <Button size="sm" onClick={() => {
                        setSelectedReport(report);
                        setAdminNotes(report.admin_notes || "");
                      }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Reporter:</span>
                      <p>{report.reporter_name} ({report.reporter_email})</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Store:</span>
                      <p>{report.products?.stores?.name || "Unknown"}</p>
                    </div>
                  </div>
                  <p className="text-sm mt-3 line-clamp-2 text-muted-foreground">
                    {report.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Review IP Violation Report
              </DialogTitle>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Product:</span>
                    <p className="font-medium">{selectedReport.products?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Store:</span>
                    <p className="font-medium">{selectedReport.products?.stores?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reporter:</span>
                    <p>{selectedReport.reporter_name}</p>
                    <p className="text-muted-foreground">{selectedReport.reporter_email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p>{getViolationTypeBadge(selectedReport.violation_type)}</p>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedReport.description}</p>
                </div>

                {selectedReport.original_work_url && (
                  <div>
                    <span className="text-muted-foreground text-sm">Original Work:</span>
                    <a 
                      href={selectedReport.original_work_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block mt-1 text-primary hover:underline text-sm"
                    >
                      {selectedReport.original_work_url}
                    </a>
                  </div>
                )}

                {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                  <div>
                    <span className="text-muted-foreground text-sm">Evidence:</span>
                    <ul className="mt-1 space-y-1">
                      {selectedReport.evidence_urls.map((url, i) => (
                        <li key={i}>
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  {selectedReport.is_rights_holder ? (
                    <Badge className="bg-primary/20 text-primary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Claims to be Rights Holder
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Not Rights Holder
                    </Badge>
                  )}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add investigation notes..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => updateReport.mutate({
                  reportId: selectedReport!.id,
                  status: "under_review",
                  notes: adminNotes,
                })}
                disabled={updateReport.isPending}
              >
                <Clock className="h-4 w-4 mr-1" />
                Mark Under Review
              </Button>
              <Button
                variant="outline"
                onClick={() => updateReport.mutate({
                  reportId: selectedReport!.id,
                  status: "invalid",
                  notes: adminNotes,
                })}
                disabled={updateReport.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Mark Invalid
              </Button>
              <Button
                variant="destructive"
                onClick={() => updateReport.mutate({
                  reportId: selectedReport!.id,
                  status: "valid",
                  notes: adminNotes,
                })}
                disabled={updateReport.isPending}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Confirm Violation
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => updateReport.mutate({
                  reportId: selectedReport!.id,
                  status: "resolved",
                  notes: adminNotes,
                })}
                disabled={updateReport.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
