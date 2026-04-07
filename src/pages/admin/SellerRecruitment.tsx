import { Download, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useState } from "react";

const PDF_URL = "/documents/Eclipse_Seller_Recruitment_Pack.pdf";

export default function SellerRecruitment() {
  const [showPreview, setShowPreview] = useState(true);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = PDF_URL;
    a.download = "Eclipse_Seller_Recruitment_Pack.pdf";
    a.click();
  };

  return (
    <AdminLayout requiredPermissions={['manage_seller_stores']}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Seller Recruitment Pack</h1>
            <p className="text-xs text-muted-foreground">
              6-page PDF document — download and share with prospective sellers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4 mr-1.5" />
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>
            <Button size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1.5" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Document info */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm">Eclipse_Seller_Recruitment_Pack.pdf</h3>
                <p className="text-xs text-muted-foreground">
                  Executive Summary • Competitive Comparison • Platform Features • Onboarding • Commercial Terms
                </p>
              </div>
            </div>
          </div>

          {showPreview && (
            <div className="bg-muted/20">
              <iframe
                src={PDF_URL}
                className="w-full border-0"
                style={{ height: "calc(100vh - 260px)", minHeight: "500px" }}
                title="Seller Recruitment Pack Preview"
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
