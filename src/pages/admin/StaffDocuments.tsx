import { FileText, Users, Printer, FolderOpen, BookOpen, ClipboardList } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StaffDocument {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  category: string;
  lastUpdated: string;
}

const staffDocuments: StaffDocument[] = [
  // Add staff documents here as needed
  // Example:
  // {
  //   id: "onboarding-guide",
  //   title: "Staff Onboarding Guide",
  //   description: "Complete guide for new staff members including policies, procedures, and access setup.",
  //   icon: BookOpen,
  //   category: "Training",
  //   lastUpdated: "January 2025",
  // },
];

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case "training":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "policy":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "procedure":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "reference":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function StaffDocuments() {
  return (
    <AdminLayout requiredPermissions={['manage_staff']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Staff Documents</h1>
          <p className="text-muted-foreground">
            Internal resources, training materials, and policy documents for staff
          </p>
        </div>

        {/* Documents Grid */}
        {staffDocuments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {staffDocuments.map((doc) => (
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No staff documents yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                Internal training materials, policy documents, and procedure guides will appear here when created.
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
                <h3 className="font-semibold">Document Categories</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Staff documents are organized by category: <strong>Training</strong> (onboarding, guides), 
                  <strong> Policy</strong> (rules, standards), <strong> Procedure</strong> (step-by-step processes), 
                  and <strong> Reference</strong> (quick lookup materials).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
