import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Users, Scale, ExternalLink, CheckCircle2, Clock, Filter, Bell, BellDot } from "lucide-react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSellerStatus } from "@/hooks/useSellerStatus";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const CURRENT_TOS_VERSION = "1.0";

interface StaticDocument {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  href: string;
  category: string;
  requiresSignature?: boolean;
}

const staticDocuments: StaticDocument[] = [
  {
    id: "seller-tos",
    title: "Seller Terms of Service",
    description: "The legal agreement between your store and Eclipse. Store owners must sign this agreement to operate on the marketplace.",
    icon: Scale,
    href: "/seller/documents/terms",
    category: "legal",
    requiresSignature: true,
  },
  {
    id: "seller-guide",
    title: "Seller Success Guide",
    description: "Learn about Eclipse's marketplace benefits, commission rates, and how to maximize your earnings as a seller.",
    icon: Users,
    href: "/seller/documents/guide",
    category: "guide",
  },
];

const DEFAULT_CATEGORIES = [
  { value: "general", label: "General", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  { value: "legal", label: "Legal", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "policy", label: "Policy", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "guide", label: "Guide", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "announcement", label: "Announcement", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "training", label: "Training", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
];

const getCategoryColor = (category: string) => {
  const found = DEFAULT_CATEGORIES.find(c => c.value === category.toLowerCase());
  return found?.color || "bg-muted text-muted-foreground";
};

const getCategoryLabel = (category: string) => {
  const found = DEFAULT_CATEGORIES.find(c => c.value === category.toLowerCase());
  return found?.label || category.charAt(0).toUpperCase() + category.slice(1);
};

export default function SellerDocuments() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Check if the store has signed the current ToS version
  const { data: agreement, isLoading: agreementLoading } = useQuery({
    queryKey: ['seller-agreement', store?.id, CURRENT_TOS_VERSION],
    queryFn: async () => {
      if (!store?.id) return null;
      
      const { data, error } = await supabase
        .from('seller_agreements')
        .select('*')
        .eq('store_id', store.id)
        .eq('agreement_version', CURRENT_TOS_VERSION)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Fetch dynamic documents from admin
  const { data: dynamicDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['seller-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_documents')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch unread notifications
  const { data: notifications } = useQuery({
    queryKey: ['seller-document-notifications', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('seller_document_notifications')
        .select('*')
        .eq('store_id', store.id)
        .is('read_at', null);
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!store?.id,
  });

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!store?.id) return;
      
      const { error } = await supabase
        .from('seller_document_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('store_id', store.id)
        .eq('document_id', documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-document-notifications'] });
    },
  });

  // Get all unique categories
  const allCategories = useMemo(() => {
    const staticCats = staticDocuments.map(d => d.category.toLowerCase());
    const dynamicCats = dynamicDocuments?.map(d => d.category.toLowerCase()) || [];
    return [...new Set([...staticCats, ...dynamicCats])];
  }, [dynamicDocuments]);

  // Filter documents
  const filteredStaticDocs = useMemo(() => {
    if (selectedCategory === "all") return staticDocuments;
    return staticDocuments.filter(d => d.category.toLowerCase() === selectedCategory);
  }, [selectedCategory]);

  const filteredDynamicDocs = useMemo(() => {
    if (!dynamicDocuments) return [];
    if (selectedCategory === "all") return dynamicDocuments;
    return dynamicDocuments.filter(d => d.category.toLowerCase() === selectedCategory);
  }, [dynamicDocuments, selectedCategory]);

  const hasUnread = (documentId: string) => {
    return notifications?.some(n => n.document_id === documentId);
  };

  const hasSigned = !!agreement;
  const unreadCount = notifications?.length || 0;

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Documents
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              Legal agreements and resources for your store
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {selectedCategory === "all" ? "All Categories" : getCategoryLabel(selectedCategory)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100] bg-card">
              <DropdownMenuItem onClick={() => setSelectedCategory("all")}>
                All Categories
              </DropdownMenuItem>
              {allCategories.map(cat => (
                <DropdownMenuItem key={cat} onClick={() => setSelectedCategory(cat)}>
                  <Badge variant="outline" className={`${getCategoryColor(cat)} mr-2`}>
                    {getCategoryLabel(cat)}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedCategory !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedCategory("all")}>
              Clear filter
            </Button>
          )}
        </div>

        {/* Action Required Banner */}
        {!agreementLoading && !hasSigned && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Scale className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-500">Action Required</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please review and sign the Seller Terms of Service agreement to ensure your store
                    remains in good standing on the Eclipse marketplace.
                  </p>
                  <Link to="/seller/documents/terms">
                    <Button size="sm" className="mt-3">
                      Review Agreement
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Static Documents Grid */}
        {filteredStaticDocs.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredStaticDocs.map((doc) => {
              const isSigned = doc.id === "seller-tos" && hasSigned;
              const needsSignature = doc.requiresSignature && !isSigned;

              return (
                <Card key={doc.id} className="group hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <doc.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.requiresSignature && (
                          isSigned ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Signed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )
                        )}
                        <Badge variant="outline" className={getCategoryColor(doc.category)}>
                          {getCategoryLabel(doc.category)}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-3">{doc.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {doc.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-end">
                      <Link to={doc.href}>
                        <Button 
                          size="sm" 
                          variant={needsSignature ? "default" : "outline"} 
                          className="gap-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {needsSignature ? "Sign Agreement" : "View"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dynamic Documents from Admin */}
        {documentsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-full mt-2" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredDynamicDocs.length > 0 && (
          <div className="space-y-4">
            {filteredStaticDocs.length > 0 && (
              <h2 className="text-lg font-semibold text-muted-foreground">Additional Resources</h2>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDynamicDocs.map((doc) => {
                const isUnread = hasUnread(doc.id);
                
                return (
                  <Card 
                    key={doc.id} 
                    className={`group hover:border-primary/50 transition-colors ${isUnread ? "border-primary/30 bg-primary/5" : ""}`}
                    onClick={() => isUnread && markReadMutation.mutate(doc.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0 relative">
                          <FileText className="h-5 w-5 text-primary" />
                          {isUnread && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <BellDot className="h-3 w-3" />
                              New
                            </Badge>
                          )}
                          <Badge variant="outline" className={getCategoryColor(doc.category)}>
                            {getCategoryLabel(doc.category)}
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-3">{doc.title}</CardTitle>
                      {doc.description && (
                        <CardDescription className="line-clamp-2">
                          {doc.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Added: {format(new Date(doc.created_at), "MMM d, yyyy")}
                        </span>
                        {doc.external_url && (
                          <a
                            href={doc.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button size="sm" variant="outline" className="gap-2">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Section */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Important Documents</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  These documents govern your relationship with Eclipse as a seller. Please ensure you've 
                  reviewed and signed all required agreements. Contact support if you have any questions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
