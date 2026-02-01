import { Link } from "react-router-dom";
import { FileText, Users, Printer, ExternalLink, Globe } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PublicDocument {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  href: string;
  category: string;
  lastUpdated: string;
}

const publicDocuments: PublicDocument[] = [
  {
    id: "seller-recruitment",
    title: "Seller Recruitment Document",
    description: "Professional PDF document outlining marketplace benefits, commission rates, and comparison with competitors. Use for recruiting new sellers.",
    icon: Users,
    href: "/admin/seller-recruitment",
    category: "Recruitment",
    lastUpdated: "January 2025",
  },
];

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case "recruitment":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "marketing":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "legal":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "announcement":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function PublicDocuments() {
  return (
    <AdminLayout requiredPermissions={['manage_seller_stores']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Public Documents</h1>
          <p className="text-muted-foreground">
            Documents intended for public release, recruitment, and marketing
          </p>
        </div>

        {/* Documents Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publicDocuments.map((doc) => (
            <Card key={doc.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <doc.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className={getCategoryColor(doc.category)}>
                    {doc.category}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3">{doc.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {doc.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Updated: {doc.lastUpdated}
                  </span>
                  <Link to={doc.href}>
                    <Button size="sm" variant="outline" className="gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State (shown when no documents) */}
        {publicDocuments.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No public documents yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Documents for public release will appear here when created.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Printing Documents</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All documents are print-optimized. Click "View" to open a document, then use the 
                  "Print / Save as PDF" button to download a professional PDF version for distribution.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
