import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  Search,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Users,
  TrendingDown,
  ExternalLink,
} from "lucide-react";

interface RefundedOrder {
  id: string;
  customer_email: string;
  user_id: string | null;
  total: number;
  refund_amount: number | null;
  status: string;
  payment_method: string;
  payment_id: string;
  refund_id: string | null;
  refunded_at: string | null;
  created_at: string;
}

interface CommissionReversal {
  id: string;
  order_id: string;
  affiliate_id: string;
  commission_amount: number;
  status: string;
  reversed_at: string | null;
  refund_id: string | null;
  profile?: {
    display_name: string | null;
    email: string;
  };
}

interface SellerReversal {
  id: string;
  order_id: string;
  store_id: string;
  net_amount: number;
  refunded_at: string | null;
  refund_id: string | null;
  store?: {
    name: string;
  };
}

export default function AdminRefunds() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<RefundedOrder | null>(null);

  // Fetch refunded orders
  const { data: orders, isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ["admin-refunds", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*")
        .or("status.eq.refunded,status.eq.partially_refunded,refunded_at.not.is.null")
        .order("refunded_at", { ascending: false, nullsFirst: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RefundedOrder[];
    },
  });

  // Fetch commission reversals for selected order
  const { data: commissionReversals } = useQuery({
    queryKey: ["admin-commission-reversals", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];

      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("*, profile:profiles!affiliate_commissions_affiliate_id_fkey(display_name, email)")
        .eq("order_id", selectedOrder.id);

      if (error) throw error;
      return data as CommissionReversal[];
    },
    enabled: !!selectedOrder,
  });

  // Fetch seller reversals for selected order
  const { data: sellerReversals } = useQuery({
    queryKey: ["admin-seller-reversals", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];

      const { data, error } = await supabase
        .from("seller_transactions")
        .select("*, store:stores(name)")
        .eq("order_id", selectedOrder.id)
        .eq("type", "sale");

      if (error) throw error;
      return data as SellerReversal[];
    },
    enabled: !!selectedOrder,
  });

  // Calculate stats
  const stats = {
    totalRefunds: orders?.length || 0,
    totalRefundedAmount: orders?.reduce((sum, o) => sum + (o.refund_amount || o.total || 0), 0) || 0,
    fullRefunds: orders?.filter((o) => o.status === "refunded").length || 0,
    partialRefunds: orders?.filter((o) => o.status === "partially_refunded").length || 0,
  };

  // Filter orders by search
  const filteredOrders = orders?.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.customer_email?.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query) ||
      order.payment_id?.toLowerCase().includes(query) ||
      order.refund_id?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "refunded":
        return <Badge variant="destructive">Full Refund</Badge>;
      case "partially_refunded":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Partial Refund</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReversalStatus = (reversedAt: string | null) => {
    if (reversedAt) {
      return (
        <div className="flex items-center gap-1 text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Reversed</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-amber-400">
        <AlertCircle className="h-4 w-4" />
        <span>Not reversed</span>
      </div>
    );
  };

  return (
    <AdminLayout requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <RotateCcw className="h-6 w-6 text-destructive" />
              Refunds
            </h1>
            <p className="text-muted-foreground mt-1">
              Track refunded orders and commission/earnings reversals
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Refunds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{stats.totalRefunds}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Refunded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{formatCurrency(stats.totalRefundedAmount)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Full Refunds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{stats.fullRefunds}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Partial Refunds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <span className="text-2xl font-bold">{stats.partialRefunds}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, order ID, payment ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background/50">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Refunds</SelectItem>
                  <SelectItem value="refunded">Full Refunds</SelectItem>
                  <SelectItem value="partially_refunded">Partial Refunds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Refunds Table */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle>Refunded Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredOrders && filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Original Total</TableHead>
                      <TableHead>Refund Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Refunded At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div className="font-mono text-xs text-muted-foreground">
                            {order.id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.customer_email}</div>
                        </TableCell>
                        <TableCell>{formatCurrency(order.total)}</TableCell>
                        <TableCell className="text-destructive font-medium">
                          -{formatCurrency(order.refund_amount || order.total)}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          {order.refunded_at
                            ? format(new Date(order.refunded_at), "dd MMM yyyy HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            View Details
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No refunds found</p>
                <p className="text-sm mt-1">Refunded orders will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-destructive" />
                Refund Details
              </DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Order ID</p>
                    <p className="font-mono">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p>{selectedOrder.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Original Order Date</p>
                    <p>{format(new Date(selectedOrder.created_at), "dd MMM yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Refund Date</p>
                    <p>
                      {selectedOrder.refunded_at
                        ? format(new Date(selectedOrder.refunded_at), "dd MMM yyyy HH:mm")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Original Total</p>
                    <p className="font-medium">{formatCurrency(selectedOrder.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Refund Amount</p>
                    <p className="font-medium text-destructive">
                      -{formatCurrency(selectedOrder.refund_amount || selectedOrder.total)}
                    </p>
                  </div>
                </div>

                {/* Commission Reversals */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Affiliate Commission Reversals
                  </h3>
                  {commissionReversals && commissionReversals.length > 0 ? (
                    <div className="rounded-lg border border-border/50 divide-y divide-border/50">
                      {commissionReversals.map((commission) => (
                        <div
                          key={commission.id}
                          className="p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">
                              {commission.profile?.display_name || commission.profile?.email || "Unknown Affiliate"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Commission: {formatCurrency(commission.commission_amount / 100)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={commission.status === "reversed" ? "destructive" : "secondary"}
                            >
                              {commission.status}
                            </Badge>
                            {getReversalStatus(commission.reversed_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-3 px-4 bg-muted/30 rounded-lg">
                      No affiliate commissions for this order
                    </p>
                  )}
                </div>

                {/* Seller Earnings Reversals */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Seller Earnings Reversals
                  </h3>
                  {sellerReversals && sellerReversals.length > 0 ? (
                    <div className="rounded-lg border border-border/50 divide-y divide-border/50">
                      {sellerReversals.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">
                              {transaction.store?.name || "Unknown Store"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Net Earnings: {formatCurrency(transaction.net_amount)}
                            </p>
                          </div>
                          {getReversalStatus(transaction.refunded_at)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-3 px-4 bg-muted/30 rounded-lg">
                      No seller earnings for this order
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}