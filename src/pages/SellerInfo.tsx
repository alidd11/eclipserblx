import { Printer, Download, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SellerInfoContent } from "@/components/seller/SellerInfoContent";

export default function SellerInfo() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-optimized styles */}
      <style>
        {`
          @media print {
            /* Hide non-essential elements */
            .no-print,
            header,
            footer:not(.print-footer),
            nav,
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

      <div className="min-h-screen bg-background">
        {/* Navigation Bar - Hidden on Print */}
        <nav className="no-print sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Eclipse
            </Link>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print / Save PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Link to="/auth">
                <Button size="sm" className="gap-2">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 print-container max-w-6xl">
          <SellerInfoContent />
        </main>

        {/* Footer - Hidden on Print */}
        <footer className="no-print border-t border-border py-8 mt-12">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Eclipse. All rights reserved.</p>
            <div className="flex justify-center gap-4 mt-4 text-sm">
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
