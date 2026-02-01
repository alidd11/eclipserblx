import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Store, CheckCircle2, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const CURRENT_TOS_VERSION = "1.0";

interface StoreWithAgreement {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  status: string;
  created_at: string;
  owner_email?: string;
  owner_name?: string;
  agreement_signed_at?: string;
  agreement_version?: string;
}

export default function SellerAgreements() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  // Fetch all approved stores with their agreement status
  const { data: stores, isLoading } = useQuery({
    queryKey: ['admin-seller-agreements'],
    queryFn: async () => {
      // Get all approved stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, store_id, name, slug, logo_url, owner_id, status, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (storesError) throw storesError;

      // Get all signed agreements for current version
      const { data: agreements, error: agreementsError } = await supabase
        .from('seller_agreements')
        .select('store_id, signed_at, agreement_version')
        .eq('agreement_version', CURRENT_TOS_VERSION);

      if (agreementsError) throw agreementsError;

      // Get owner profiles
      const ownerIds = storesData?.map(s => s.owner_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, display_name')
        .in('user_id', ownerIds);

      // Map agreements to stores
      const agreementMap = new Map(
        agreements?.map(a => [a.store_id, { signed_at: a.signed_at, version: a.agreement_version }]) || []
      );
      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { email: p.email, name: p.display_name }]) || []
      );

      return storesData?.map(store => ({
        ...store,
        owner_email: profileMap.get(store.owner_id)?.email,
        owner_name: profileMap.get(store.owner_id)?.name,
        agreement_signed_at: agreementMap.get(store.id)?.signed_at,
        agreement_version: agreementMap.get(store.id)?.version,
      })) as StoreWithAgreement[];
    },
  });

  // Filter stores based on tab and search
  const filteredStores = stores?.filter(store => {
    const matchesSearch = 
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.store_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.owner_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "pending") {
      return matchesSearch && !store.agreement_signed_at;
    } else if (activeTab === "signed") {
      return matchesSearch && !!store.agreement_signed_at;
    }
    return matchesSearch;
  }) || [];

  const pendingCount = stores?.filter(s => !s.agreement_signed_at).length || 0;
  const signedCount = stores?.filter(s => !!s.agreement_signed_at).length || 0;

  return (
    <AdminLayout requiredPermissions={['view_seller_stores']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Seller Agreements</h1>
          <p className="text-muted-foreground">
            Track which stores have signed the Seller Terms of Service (v{CURRENT_TOS_VERSION})
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Approved Stores</CardDescription>
              <CardTitle className="text-3xl">{stores?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Signed Agreements
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">{signedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Signatures
              </CardDescription>
              <CardTitle className="text-3xl text-amber-500">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Alert for pending */}
        {pendingCount > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-500">Stores Inactive Until Signed</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pendingCount} store{pendingCount !== 1 ? 's are' : ' is'} currently inactive because they 
                    have not signed the Seller Terms of Service.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Tabs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stores, owners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="signed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Signed ({signedCount})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({stores?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading stores...
                  </div>
                ) : filteredStores.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {activeTab === "pending" ? (
                      <>
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p>All stores have signed the agreement!</p>
                      </>
                    ) : (
                      <>
                        <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No stores found matching your search.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Store ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStores.map((store) => (
                        <TableRow key={store.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={store.logo_url || undefined} />
                                <AvatarFallback>
                                  <Store className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{store.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{store.owner_name || 'Unknown'}</p>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {store.store_id}
                            </code>
                          </TableCell>
                          <TableCell>
                            {store.agreement_signed_at ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Signed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                            {store.agreement_signed_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(store.agreement_signed_at), { addSuffix: true })}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(store.created_at), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/store/${store.slug}`} target="_blank">
                              <Button variant="ghost" size="sm" className="gap-2">
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Store
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}