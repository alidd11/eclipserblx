import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PRODUCT_CATEGORIES = [
  'Scripts & Code',
  'UI Kits & Assets',
  'Game Templates',
  'Plugins & Tools',
  'Graphics & Models',
  'Audio & Music',
  'Other',
];

export interface SellerFormValues {
  storeName: string;
  storeDescription: string;
  productCategory: string;
  discordServerInvite: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
}

interface StepDetailsProps {
  formValues: SellerFormValues;
  setFormValues: (updates: Partial<SellerFormValues>) => void;
}

export function StepDetails({ formValues, setFormValues }: StepDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="storeName">Store Name *</Label>
        <Input
          id="storeName"
          placeholder="My Awesome Store"
          value={formValues.storeName}
          onChange={(e) => setFormValues({ storeName: e.target.value })}
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">{formValues.storeName.length}/50 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeDescription">Store Description</Label>
        <Textarea
          id="storeDescription"
          placeholder="Describe what you'll sell and what makes your store unique..."
          value={formValues.storeDescription}
          onChange={(e) => setFormValues({ storeDescription: e.target.value })}
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="productCategory">Primary Category</Label>
        <Select
          value={formValues.productCategory}
          onValueChange={(v) => setFormValues({ productCategory: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="What will you sell?" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
