import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronDown, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkProductActionsProps {
  products: any[];
  storeId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function BulkProductActions({ 
  products, 
  storeId, 
  selectedIds, 
  onSelectionChange 
}: BulkProductActionsProps) {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const allSelected = products.length > 0 && selectedIds.length === products.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < products.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(products.map(p => p.id));
    }
  };

  const toggleProduct = (productId: string) => {
    if (selectedIds.includes(productId)) {
      onSelectionChange(selectedIds.filter(id => id !== productId));
    } else {
      onSelectionChange([...selectedIds, productId]);
    }
  };

  const bulkUpdateStatus = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .in('id', selectedIds)
        .eq('store_id', storeId);

      if (error) throw error;
      return { isActive, count: selectedIds.length };
    },
    onSuccess: ({ isActive, count }) => {
      toast.success(`${count} product(s) ${isActive ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      onSelectionChange([]);
    },
    onError: (error) => {
      toast.error('Failed to update products: ' + error.message);
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedIds)
        .eq('store_id', storeId);

      if (error) throw error;
      return selectedIds.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} product(s) deleted`);
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      onSelectionChange([]);
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to delete products: ' + error.message);
    },
  });

  const isPending = bulkUpdateStatus.isPending || bulkDelete.isPending;

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
        <Checkbox
          checked={allSelected}
          ref={(el) => {
            if (el) {
              (el as any).indeterminate = someSelected;
            }
          }}
          onCheckedChange={toggleAll}
          aria-label="Select all products"
        />
        <span className="text-sm text-muted-foreground">
          {selectedIds.length > 0 ? (
            <>
              <span className="font-medium text-foreground">{selectedIds.length}</span> selected
            </>
          ) : (
            'Select products for bulk actions'
          )}
        </span>

        {selectedIds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Bulk Actions
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => bulkUpdateStatus.mutate(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Activate Selected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkUpdateStatus.mutate(false)}>
                <EyeOff className="h-4 w-4 mr-2" />
                Deactivate Selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Product(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} product(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDelete.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ProductCheckboxProps {
  productId: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function ProductCheckbox({ productId, isSelected, onToggle }: ProductCheckboxProps) {
  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={() => onToggle(productId)}
      aria-label="Select product"
      onClick={(e) => e.stopPropagation()}
    />
  );
}
