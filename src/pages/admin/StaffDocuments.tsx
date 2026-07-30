import { FileText, Users, Printer, FolderOpen, BookOpen, ClipboardList } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
      return "bg-primary/10 text-primary border-primary/20";
    case "policy":
      return "bg-primary/10 text-primary border-primary/20";
    case "procedure":
      return "bg-success/10 text-success border-success/20";
    case "reference":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function StaffDocuments() {
  return (
    <AdminLayout requiredPermissions={['manage_staff']}>
      <div className="space-y-4">
        <AdminPageHeader title="Staff Documents" description="Internal resources, training materials, and policy documents for staff" />

        {/* Documents Grid */}
        {staffDocuments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {staffDocuments.map((doc) => (
              <div key={doc.id} className="group hover:border-primary/50 transition-colors ease-emphasized">
                <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <doc.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline" className={getCategoryColor(doc.category)}>
                      {doc.category}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm text-lg mt-3">{doc.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {doc.description}
                  </p>
                </div>
                <div className="p-4 pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated: {doc.lastUpdated}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="border border-border rounded-xl overflow-hidden border-dashed">
            <div className="p-4 flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No staff documents yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                Internal training materials, policy documents, and procedure guides will appear here when created.
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="border border-border rounded-xl overflow-hidden bg-muted/30 border-dashed">
          <div className="p-4 pt-6">
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
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
