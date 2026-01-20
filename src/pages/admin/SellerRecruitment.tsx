import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SellerInfoContent } from "@/components/seller/SellerInfoContent";

export default function SellerRecruitment() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout requiredRoles={["admin"]}>
      {/* Print-optimized styles */}
      <style>
        {`
          @media print {
            /* Hide non-essential elements */
            .no-print,
            header,
            footer:not(.print-footer),
            nav,
            aside,
            .admin-sidebar,
            .chat-widget,
            .cookie-banner {
              display: none !important;
            }
            
            /* Reset background for print */
            body {
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* Page setup */
            @page {
              margin: 1.5cm;
              size: A4;
            }
            
            /* Ensure content flows properly */
            .print-container {
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            
            /* Card styling for print */
            .card {
              border: 1px solid #e5e7eb !important;
              box-shadow: none !important;
              break-inside: avoid;
            }
            
            /* Table styling for print */
            table {
              font-size: 10pt !important;
            }
            
            th, td {
              padding: 8px !important;
              border: 1px solid #e5e7eb !important;
            }
            
            /* Gradient text fallback for print */
            .bg-clip-text {
              -webkit-background-clip: text !important;
              background-clip: text !important;
            }
            
            /* Ensure colors print */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Page breaks */
            .print\\:break-before-page {
              break-before: page;
            }
            
            .print\\:break-inside-avoid {
              break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold">Seller Recruitment Document</h1>
            <p className="text-muted-foreground">
              Internal document for seller recruitment - Admin access only
            </p>
          </div>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Main Content */}
        <div className="print-container">
          <SellerInfoContent />
        </div>
      </div>
    </AdminLayout>
  );
}
