import { Link } from "react-router-dom";
import { FileText, Users, Scale, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSellerStatus } from "@/hooks/useSellerStatus";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CURRENT_TOS_VERSION = "1.0";

interface Document {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  href: string;
  category: string;
  requiresSignature?: boolean;
}

const documents: Document[] = [
  {
    id: "seller-tos",
    title: "Seller Terms of Service",
    description: "The legal agreement between your store and Eclipse. Store owners must sign this agreement to operate on the marketplace.",
    icon: Scale,
    href: "/seller/documents/terms",
    category: "Legal",
    requiresSignature: true,
  },
  {
    id: "seller-guide",
    title: "Seller Success Guide",
    description: "Learn about Eclipse's marketplace benefits, commission rates, and how to maximize your earnings as a seller.",
    icon: Users,
    href: "/seller/documents/guide",
    category: "Resources",
  },
];

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case "legal":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "resources":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function SellerDocuments() {
  const { store } = useSellerStatus();

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

  const hasSigned = !!agreement;

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Legal agreements and resources for your store
          </p>
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

        {/* Documents Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((doc) => {
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
                        {doc.category}
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