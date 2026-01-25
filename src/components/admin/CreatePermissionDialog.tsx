import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Pencil, Settings, Shield } from 'lucide-react';

interface CreatePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPermission?: {
    id: string;
    name: string;
    description: string | null;
    category: string;
  } | null;
  existingCategories: string[];
}

const CATEGORY_OPTIONS = [
  { value: 'pages', label: 'Page Access', icon: Eye },
  { value: 'actions', label: 'Actions', icon: Pencil },
  { value: 'settings', label: 'Settings', icon: Settings },
  { value: 'admin', label: 'Admin', icon: Shield },
];

export function CreatePermissionDialog({ 
  open, 
  onOpenChange, 
  editPermission,
  existingCategories 
}: CreatePermissionDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editPermission;
  
  const [formData, setFormData] = useState({
    name: editPermission?.name || '',
    description: editPermission?.description || '',
    category: editPermission?.category || 'pages',
    customCategory: '',
  });

  const [useCustomCategory, setUseCustomCategory] = useState(false);

  // Combine default categories with existing ones from DB
  const allCategories = [...new Set([
    ...CATEGORY_OPTIONS.map(c => c.value),
    ...existingCategories
  ])];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const category = useCustomCategory ? data.customCategory : data.category;
      const { error } = await supabase
        .from('permissions')
        .insert({
          name: data.name.toLowerCase().replace(/\s+/g, '_'),
          description: data.description || null,
          category,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast.success('Permission created successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create permission: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const category = useCustomCategory ? data.customCategory : data.category;
      const { error } = await supabase
        .from('permissions')
        .update({
          description: data.description || null,
          category,
        })
        .eq('id', editPermission!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast.success('Permission updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to update permission: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('id', editPermission!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permission deleted successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to delete permission: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'pages',
      customCategory: '',
    });
    setUseCustomCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() && !isEditing) {
      toast.error('Permission name is required');
      return;
    }
    
    if (useCustomCategory && !formData.customCategory.trim()) {
      toast.error('Custom category name is required');
      return;
    }
    
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Permission' : 'Create New Permission'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the permission settings.'
              : 'Create a new permission that can be assigned to roles.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Permission Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. view_analytics"
              disabled={isEditing}
            />
            {!isEditing && (
              <p className="text-xs text-muted-foreground">
                Use snake_case. This cannot be changed later.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            {!useCustomCategory ? (
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map(cat => {
                    const option = CATEGORY_OPTIONS.find(o => o.value === cat);
                    const Icon = option?.icon || Settings;
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{option?.label || cat}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.customCategory}
                onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                placeholder="e.g. reports"
              />
            )}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setUseCustomCategory(!useCustomCategory)}
            >
              {useCustomCategory ? 'Use existing category' : 'Create custom category'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this permission allows"
              rows={2}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing && (
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this permission? This will remove it from all roles.')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="sm:mr-auto"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? 'Save Changes' : 'Create Permission'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
