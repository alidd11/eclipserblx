import { TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gamepad2, Webhook } from 'lucide-react';
import { format } from '@/lib/dateUtils';

interface Transaction {
  id: string;
  created_at: string;
  roblox_username: string;
  roblox_user_id: string;
  product_name: string;
  robux_amount: number;
  robux_after_tax: number;
}

interface RobloxTransactionsTabProps {
  recentTransactions: Transaction[];
}

export function RobloxTransactionsTab({ recentTransactions }: RobloxTransactionsTabProps) {
  return (
    <TabsContent value="transactions" className="space-y-4">
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Webhook className="h-5 w-5" />Recent Robux Transactions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Latest purchases made with Robux</p>
        </div>
        <div className="p-4">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No Robux transactions yet</p>
              <p className="text-sm">Transactions will appear here once customers purchase with Robux</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">After Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(tx.created_at), 'MMM d, HH:mm')}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{tx.roblox_username}</p>
                          <p className="text-xs text-muted-foreground">ID: {tx.roblox_user_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{tx.product_name}</TableCell>
                      <TableCell className="text-right font-mono">R${tx.robux_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-500">R${tx.robux_after_tax.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}