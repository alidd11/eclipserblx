import { Link } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface SellerDocumentPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function SellerDocumentPage({ title, subtitle, children }: SellerDocumentPageProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <SellerLayout>
      <style>
        {`
          @media print {
            .no-print, header, footer:not(.print-footer), nav, aside, .seller-sidebar, .chat-widget, .cookie-banner {
              display: none !important;
            }
            body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 1.5cm; size: A4; }
            .print-container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
            .card { border: 1px solid #e5e7eb !important; box-shadow: none !important; break-inside: avoid; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}
      </style>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
          <div className="flex items-center gap-4">
            <Link to="/seller/documents">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        <div className="print-container">
          {children}
        </div>
      </div>
    </SellerLayout>
  );
}
