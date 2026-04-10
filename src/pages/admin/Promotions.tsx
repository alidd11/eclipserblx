import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tags, Gift } from 'lucide-react';
import { DiscountCodesTab } from '@/components/admin/promotions/DiscountCodesTab';
import { SpecialOffersTab } from '@/components/admin/promotions/SpecialOffersTab';

export default function AdminPromotions() {
  const [activeTab, setActiveTab] = useState('discounts');

  return (
    <AdminLayout requiredPermissions={['manage_discounts']}>
      <div className="space-y-4">
        <AdminPageHeader title="Promotions" description="Manage discount codes and special offers" />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile dropdown */}
          <div className="sm:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-auto min-w-[140px] bg-background">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="discounts">
                  <div className="flex items-center gap-2"><Tags className="h-4 w-4" />Discount Codes</div>
                </SelectItem>
                <SelectItem value="offers">
                  <div className="flex items-center gap-2"><Gift className="h-4 w-4" />Special Offers</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden sm:grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="discounts" className="gap-2"><Tags className="h-4 w-4" />Discount Codes</TabsTrigger>
            <TabsTrigger value="offers" className="gap-2"><Gift className="h-4 w-4" />Special Offers</TabsTrigger>
          </TabsList>

          <TabsContent value="discounts" className="space-y-4 mt-6">
            <DiscountCodesTab />
          </TabsContent>

          <TabsContent value="offers" className="space-y-4 mt-6">
            <SpecialOffersTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
