import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ComparisonFeature {
  feature: string;
  eclipse: string | boolean;
  clearlyDev: string | boolean;
  kwStudio: string | boolean;
  robloxStore: string | boolean;
}

const comparisonData: ComparisonFeature[] = [
  {
    feature: "Asset Ownership",
    eclipse: "You retain 100% IP",
    clearlyDev: "Broad sublicensable license",
    kwStudio: "KW/Creator retains rights",
    robloxStore: "You retain IP",
  },
  {
    feature: "Commission Rate",
    eclipse: "15% (10% Eclipse+) on NET",
    clearlyDev: "Service fees vary",
    kwStudio: "Varies by license",
    robloxStore: "30% flat rate",
  },
  {
    feature: "Fee Calculation",
    eclipse: "After Stripe fees",
    clearlyDev: "Mixed/unclear",
    kwStudio: "License-based",
    robloxStore: "Before deductions",
  },
  {
    feature: "Payout Methods",
    eclipse: "Stripe / PayPal / Bank",
    clearlyDev: "USD via Stripe",
    kwStudio: "Platform credits",
    robloxStore: "DevEx required",
  },
  {
    feature: "Currency",
    eclipse: "GBP (£) direct",
    clearlyDev: "USD only",
    kwStudio: "Robux/credits",
    robloxStore: "Robux → USD",
  },
  {
    feature: "Platform Lock-in",
    eclipse: "None - sell anywhere",
    clearlyDev: "Broad platform rights",
    kwStudio: "Non-transferable",
    robloxStore: "Roblox only",
  },
  {
    feature: "Store Customization",
    eclipse: "5 themes + 7 colors",
    clearlyDev: "Basic profile",
    kwStudio: "Minimal",
    robloxStore: "None",
  },
  {
    feature: "Team Management",
    eclipse: true,
    clearlyDev: false,
    kwStudio: false,
    robloxStore: false,
  },
  {
    feature: "Discord Webhooks",
    eclipse: true,
    clearlyDev: false,
    kwStudio: false,
    robloxStore: false,
  },
  {
    feature: "Scheduled Releases",
    eclipse: true,
    clearlyDev: false,
    kwStudio: false,
    robloxStore: false,
  },
  {
    feature: "AI Security Scan",
    eclipse: "Lua analysis + virus scan",
    clearlyDev: "Manual moderation",
    kwStudio: "Manual review",
    robloxStore: "Basic automated",
  },
  {
    feature: "Derivative Claims",
    eclipse: "No platform claims",
    clearlyDev: "Platform may create",
    kwStudio: "Creator/KW retains",
    robloxStore: "Roblox terms apply",
  },
];

const getCellStyle = (value: string | boolean, isEclipse: boolean) => {
  if (isEclipse) {
    return "bg-primary/10 text-primary font-medium";
  }
  return "";
};

const renderValue = (value: string | boolean) => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-green-500 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-destructive mx-auto" />
    );
  }
  return value;
};

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto print:overflow-visible print:w-full">
      <Table className="print:w-full print:table-fixed print:text-[9pt]">
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="w-[140px] print:w-[15%] font-bold text-foreground print:text-[9pt] print:p-1">Feature</TableHead>
            <TableHead className="text-center bg-primary/5 text-primary font-bold min-w-[120px] print:w-[21%] print:text-[9pt] print:p-1">
              Eclipse ✨
            </TableHead>
            <TableHead className="text-center min-w-[120px] print:w-[21%] print:text-[9pt] print:p-1">ClearlyDev</TableHead>
            <TableHead className="text-center min-w-[120px] print:w-[21%] print:text-[9pt] print:p-1">KW Studio</TableHead>
            <TableHead className="text-center min-w-[120px] print:w-[22%] print:text-[9pt] print:p-1">Roblox Creator Store</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparisonData.map((row, index) => (
            <TableRow key={index} className="border-border">
              <TableCell className="font-medium text-foreground print:text-[9pt] print:p-1">{row.feature}</TableCell>
              <TableCell className={`text-center print:text-[9pt] print:p-1 ${getCellStyle(row.eclipse, true)}`}>
                {renderValue(row.eclipse)}
              </TableCell>
              <TableCell className="text-center text-muted-foreground print:text-[9pt] print:p-1">
                {renderValue(row.clearlyDev)}
              </TableCell>
              <TableCell className="text-center text-muted-foreground print:text-[9pt] print:p-1">
                {renderValue(row.kwStudio)}
              </TableCell>
              <TableCell className="text-center text-muted-foreground print:text-[9pt] print:p-1">
                {renderValue(row.robloxStore)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
