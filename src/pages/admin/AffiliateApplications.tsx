import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { User, Search, Users, DollarSign, Hash, MessageSquare } from "lucide-react";

interface Affiliate {
  id: string;
  user_id: string;
  email: string;
  affiliate_id: string;
  display_name: string | null;
  paypal_email: string | null;
  discord_username: string | null;
  promotion_method: string;
  audience_size: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const AffiliateApplications = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);

  const { data: affiliates = [], isLoading } = useQuery({
    queryKey: ["affiliate-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_applications")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Affiliate[];
    },
  });

  const filtered = affiliates.filter(
    (a) =>
      a.affiliate_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.discord_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout requiredPermissions={['review_affiliate_applications']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Affiliates</h1>
          <p className="text-muted-foreground">Active affiliates in the program</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">{affiliates.length}</p>
                  <p className="text-xs text-muted-foreground">Total Affiliates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-lg md:text-2xl font-bold">
                    {affiliates.filter((a) => a.paypal_email).length}
                  </p>
                  <p className="text-xs text-muted-foreground">With Payout Info</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, name, email, or Discord..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Affiliate List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No affiliates found</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((affiliate) => (
              <Card
                key={affiliate.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedAffiliate(affiliate)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium truncate">{affiliate.display_name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="w-3 h-3" />
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{affiliate.affiliate_id}</code>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {format(new Date(affiliate.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Affiliate Detail Dialog */}
        <Dialog open={!!selectedAffiliate} onOpenChange={() => setSelectedAffiliate(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Affiliate Details</DialogTitle>
              <DialogDescription>
                {selectedAffiliate?.display_name || "Affiliate"} — {selectedAffiliate?.affiliate_id}
              </DialogDescription>
            </DialogHeader>

            {selectedAffiliate && (
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Affiliate ID</Label>
                  <code className="font-mono text-sm bg-muted px-2 py-1 rounded block mt-1">{selectedAffiliate.affiliate_id}</code>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <p className="font-medium">{selectedAffiliate.display_name || "Not set"}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedAffiliate.email}</p>
                </div>

                {selectedAffiliate.paypal_email && (
                  <div>
                    <Label className="text-xs text-muted-foreground">PayPal Email</Label>
                    <p className="font-medium flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      {selectedAffiliate.paypal_email}
                    </p>
                  </div>
                )}

                {selectedAffiliate.discord_username && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Discord</Label>
                    <p className="font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      {selectedAffiliate.discord_username}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Promotion Method</Label>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedAffiliate.promotion_method}</p>
                </div>

                {selectedAffiliate.audience_size && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Audience Size</Label>
                    <p className="font-medium">{selectedAffiliate.audience_size}</p>
                  </div>
                )}

                {selectedAffiliate.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedAffiliate.notes}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Joined: {format(new Date(selectedAffiliate.created_at), "PPpp")}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AffiliateApplications;
