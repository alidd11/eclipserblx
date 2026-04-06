import { useState, useRef } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Receipt, Download, Printer, Calendar, PoundSterling, TrendingUp, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { format } from '@/lib/dateUtils';
import { SITE_NAME } from '@/lib/constants';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';

// UK tax year: 6 April – 5 April
function getTaxYears(): { label: string; startDate: string; endDate: string }[] {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed
  const currentDay = new Date().getDate();
  
  // If before April 6, current tax year started last year
  const latestTaxYearStart = (currentMonth < 3 || (currentMonth === 3 && currentDay < 6))
    ? currentYear - 1
    : currentYear;

  const years = [];
  for (let y = latestTaxYearStart; y >= latestTaxYearStart - 3; y--) {
    years.push({
      label: `${y}/${y + 1}`,
      startDate: `${y}-04-06`,
      endDate: `${y + 1}-04-05`,
    });
  }
  return years;
}

export default function SellerTaxSummary() {
  const isInsideHub = useIsInsideHub();
  const { store } = useSellerStatus();
  const taxYears = getTaxYears();
  const [selectedYear, setSelectedYear] = useState(taxYears[0].label);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedTaxYear = taxYears.find(y => y.label === selectedYear)!;

  const { data: summary, isLoading } = useQuery({
    queryKey: ['seller-tax-summary', store?.id, selectedYear],
    queryFn: async () => {
      if (!store?.id) return null;

      // Fetch all transactions in the tax year
      const { data: transactions, error } = await supabase
        .from('seller_transactions')
        .select('gross_amount, net_amount, platform_fee, stripe_fee, created_at, type, refunded_at')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .gte('created_at', selectedTaxYear.startDate + 'T00:00:00Z')
        .lte('created_at', selectedTaxYear.endDate + 'T23:59:59Z')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const validSales = (transactions || []).filter(t => !t.refunded_at);
      const refundedSales = (transactions || []).filter(t => t.refunded_at);

      const totalGross = validSales.reduce((sum, t) => sum + (t.gross_amount || 0), 0);
      const totalCommission = validSales.reduce((sum, t) => sum + (t.platform_fee || 0), 0);
      const totalStripeFees = validSales.reduce((sum, t) => sum + (t.stripe_fee || 0), 0);
      const totalNet = validSales.reduce((sum, t) => sum + (t.net_amount || 0), 0);
      const totalRefunded = refundedSales.reduce((sum, t) => sum + (t.gross_amount || 0), 0);

      // Monthly breakdown
      const monthlyData: Record<string, { gross: number; commission: number; fees: number; net: number; count: number }> = {};
      validSales.forEach(t => {
        const month = format(new Date(t.created_at!), 'yyyy-MM');
        if (!monthlyData[month]) {
          monthlyData[month] = { gross: 0, commission: 0, fees: 0, net: 0, count: 0 };
        }
        monthlyData[month].gross += t.gross_amount || 0;
        monthlyData[month].commission += t.platform_fee || 0;
        monthlyData[month].fees += t.stripe_fee || 0;
        monthlyData[month].net += t.net_amount || 0;
        monthlyData[month].count += 1;
      });

      return {
        totalGross,
        totalCommission,
        totalStripeFees,
        totalNet,
        totalRefunded,
        saleCount: validSales.length,
        refundCount: refundedSales.length,
        monthly: Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({ month, ...data })),
      };
    },
    enabled: !!store?.id,
    staleTime: 60000,
  });

  // Fetch payouts for the year
  const { data: payouts } = useQuery({
    queryKey: ['seller-tax-payouts', store?.id, selectedYear],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data, error } = await supabase
        .from('seller_payouts_safe' as any)
        .select('amount, status, created_at, completed_at')
        .eq('store_id', store.id)
        .eq('status', 'completed')
        .gte('created_at', selectedTaxYear.startDate + 'T00:00:00Z')
        .lte('created_at', selectedTaxYear.endDate + 'T23:59:59Z')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const totalPaidOut = payouts?.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;

  const handlePrint = () => {
    window.print();
  };

  const fmt = (n: number) => `£${n.toFixed(2)}`;

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        {!isInsideHub && (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold">Tax Summary</h1>
              <p className="text-sm text-muted-foreground">
                Annual earnings statement for your tax return
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taxYears.map(y => (
                  <SelectItem key={y.label} value={y.label}>
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Print / PDF
            </Button>
        </div>

        {/* Disclaimer */}
        <div className="border border-border rounded-xl overflow-hidden border-amber-500/30 bg-amber-500/5">
          <div className="p-4 pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-500">Tax Responsibility Notice</p>
                <p className="text-xs text-muted-foreground mt-1">
                  As a seller on {SITE_NAME}, you are independently responsible for reporting your earnings 
                  to HMRC and paying any applicable income tax, National Insurance, or VAT. This summary is 
                  provided for your records only and does not constitute tax advice. We recommend consulting 
                  a qualified accountant.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="space-y-6 print:p-8">
          {/* Print Header (visible only when printing) */}
          <div className="hidden print:block mb-8">
            <h1 className="text-2xl font-bold">{SITE_NAME} — Seller Earnings Statement</h1>
            <p className="text-sm">Store: {store?.name} | Tax Year: {selectedYear} ({selectedTaxYear.startDate} to {selectedTaxYear.endDate})</p>
            <p className="text-sm">Generated: {format(new Date(), 'dd MMMM yyyy HH:mm')}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !summary || summary.saleCount === 0 ? (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="p-4 py-12 text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No sales recorded for tax year {selectedYear}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="p-4 pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Gross Sales</p>
                    <p className="text-xl font-bold">{fmt(summary.totalGross)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{summary.saleCount} sales</p>
                  </div>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="p-4 pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Platform Commission</p>
                    <p className="text-xl font-bold text-destructive">-{fmt(summary.totalCommission)}</p>
                  </div>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="p-4 pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Payment Processing Fees</p>
                    <p className="text-xl font-bold text-destructive">-{fmt(summary.totalStripeFees)}</p>
                  </div>
                </div>
                <div className="border border-border rounded-xl overflow-hidden border-primary/30">
                  <div className="p-4 pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Net Earnings (Taxable)</p>
                    <p className="text-xl font-bold text-primary">{fmt(summary.totalNet)}</p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="p-4 pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Refunded Sales</p>
                    <p className="text-lg font-semibold">{summary.refundCount}</p>
                    <p className="text-xs text-muted-foreground">{fmt(summary.totalRefunded)} refunded</p>
                  </div>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="p-4 pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Paid Out</p>
                    <p className="text-lg font-semibold">{fmt(totalPaidOut)}</p>
                    <p className="text-xs text-muted-foreground">{payouts?.length || 0} payouts</p>
                  </div>
                </div>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="p-4 pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Effective Commission Rate</p>
                    <p className="text-lg font-semibold">
                      {summary.totalGross > 0 ? ((summary.totalCommission / summary.totalGross) * 100).toFixed(1) : '0'}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5" />
                    Monthly Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tax year {selectedYear} ({selectedTaxYear.startDate} to {selectedTaxYear.endDate})
                  </p>
                </div>
                <div className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Fees</TableHead>
                        <TableHead className="text-right">Net Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.monthly.map((m) => (
                        <TableRow key={m.month}>
                          <TableCell className="font-medium">
                            {format(new Date(m.month + '-01'), 'MMMM yyyy')}
                          </TableCell>
                          <TableCell className="text-right">{m.count}</TableCell>
                          <TableCell className="text-right">{fmt(m.gross)}</TableCell>
                          <TableCell className="text-right text-destructive">-{fmt(m.commission)}</TableCell>
                          <TableCell className="text-right text-destructive">-{fmt(m.fees)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(m.net)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="border-t-2">
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">{summary.saleCount}</TableCell>
                        <TableCell className="text-right font-bold">{fmt(summary.totalGross)}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">-{fmt(summary.totalCommission)}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">-{fmt(summary.totalStripeFees)}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{fmt(summary.totalNet)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Footer for Print */}
              <div className="hidden print:block mt-8 pt-4 border-t text-xs text-gray-500">
                <p>This document is generated by {SITE_NAME} for record-keeping purposes only.</p>
                <p>It does not constitute tax advice. Please consult a qualified accountant for tax guidance.</p>
                <p>Store ID: {store?.id} | Store: {store?.name}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
