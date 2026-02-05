import { useState, useEffect } from 'react';
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
import { 
  Shield, 
  Users, 
  Package, 
  MessageCircle, 
  BarChart3, 
  FileText,
  Star,
  Crown,
  Zap,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PRIMARY_ADMIN_EMAIL = 'alicanimir1@gmail.com';

const normalizeRoleKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    // Replace any non-alphanumeric run with underscores
    .replace(/[^a-z0-9]+/g, '_')
    // Trim underscores from edges
    .replace(/^_+|_+$/g, '')
    // Collapse multiple underscores
    .replace(/_+/g, '_');

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserHierarchy?: number;
  userEmail?: string;
  editRole?: {
    id: string;
    name: string;
    display_name: string;
    color: string;
    icon: string;
    hierarchy_level: number;
    description: string | null;
    is_system: boolean;
  } | null;
}

const ICON_OPTIONS = [
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'package', label: 'Package', icon: Package },
  { value: 'message-circle', label: 'Message', icon: MessageCircle },
  { value: 'bar-chart-3', label: 'Chart', icon: BarChart3 },
  { value: 'file-text', label: 'File', icon: FileText },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'crown', label: 'Crown', icon: Crown },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'eye', label: 'Eye', icon: Eye },
];

const COLOR_OPTIONS = [
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-amber-500', label: 'Amber' },
  { value: 'bg-cyan-500', label: 'Cyan' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-indigo-500', label: 'Indigo' },
  { value: 'bg-orange-500', label: 'Orange' },
  { value: 'bg-teal-500', label: 'Teal' },
];

export function CreateRoleDialog({ open, onOpenChange, editRole, currentUserHierarchy = 0, userEmail }: CreateRoleDialogProps) {
  const isPrimaryAdmin = userEmail === PRIMARY_ADMIN_EMAIL;
  const queryClient = useQueryClient();
  const isEditing = !!editRole;
  
  // Calculate max allowed hierarchy level (can only create roles at or below own level)
  const maxAllowedHierarchy = currentUserHierarchy;
  
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    color: 'bg-gray-500',
    icon: 'shield',
    hierarchy_level: 10,
    description: '',
  });

  // Properly sync form data when editRole changes or dialog opens
  useEffect(() => {
    if (open && editRole) {
      setFormData({
        name: editRole.name,
        display_name: editRole.display_name,
        color: editRole.color,
        icon: editRole.icon,
        hierarchy_level: editRole.hierarchy_level,
        description: editRole.description || '',
      });
    } else if (open && !editRole) {
      setFormData({
        name: '',
        display_name: '',
        color: 'bg-gray-500',
        icon: 'shield',
        hierarchy_level: Math.min(10, maxAllowedHierarchy),
        description: '',
      });
    }
  }, [open, editRole, maxAllowedHierarchy]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('custom_roles')
        .insert({
          name: normalizeRoleKey(data.name),
          display_name: data.display_name,
          color: data.color,
          icon: data.icon,
          hierarchy_level: data.hierarchy_level,
          description: data.description || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Role created successfully');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create role: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const updateData: Record<string, unknown> = {
        display_name: data.display_name,
        color: data.color,
        icon: data.icon,
        hierarchy_level: data.hierarchy_level,
        description: data.description || null,
      };
      
      // Only primary admin can change the system name
      if (isPrimaryAdmin && data.name) {
        updateData.name = normalizeRoleKey(data.name);
      }
      
      const { error } = await supabase
        .from('custom_roles')
        .update(updateData)
        .eq('id', editRole!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Role updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to update role: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      color: 'bg-gray-500',
      icon: 'shield',
      hierarchy_level: 10,
      description: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim()) {
      toast.error('Role name is required');
      return;
    }

    const generatedName = normalizeRoleKey(formData.display_name);
    const finalName = formData.name.trim()
      ? normalizeRoleKey(formData.name)
      : generatedName;

    if (!finalName) {
      toast.error('System name could not be generated. Please enter a system name with letters/numbers.');
      return;
    }
    
    // Enforce hierarchy constraint
    if (formData.hierarchy_level > maxAllowedHierarchy) {
      toast.error(`You can only create roles with hierarchy level ${maxAllowedHierarchy} or lower`);
      return;
    }
    
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      // Auto-generate name from display_name if not provided
      const dataToSubmit = {
        ...formData,
        name: finalName,
      };
      createMutation.mutate(dataToSubmit);
    }
  };

  const SelectedIcon = ICON_OPTIONS.find(i => i.value === formData.icon)?.icon || Shield;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? isPrimaryAdmin 
                ? 'Update the role settings. As primary admin, you can edit all roles.'
                : 'Update the role settings. System roles cannot have their name changed.'
              : 'Create a new role with custom permissions.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => {
                const nextDisplayName = e.target.value;
                setFormData(prev => {
                  // In create mode, keep system name in sync *only* while it's empty
                  if (!isEditing && !prev.name.trim()) {
                    return {
                      ...prev,
                      display_name: nextDisplayName,
                      name: normalizeRoleKey(nextDisplayName),
                    };
                  }
                  return { ...prev, display_name: nextDisplayName };
                });
              }}
              placeholder="e.g. Content Moderator"
              disabled={editRole?.is_system && !isPrimaryAdmin}
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="name">System Name (optional)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    name: normalizeRoleKey(e.target.value),
                  }))
                }
                placeholder="Auto-generated from display name"
              />
              <p className="text-xs text-muted-foreground">
                Used internally. Leave blank to auto-generate.
              </p>
            </div>
          )}

          {isEditing && isPrimaryAdmin && (
            <div className="space-y-2">
              <Label htmlFor="name">System Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  name: normalizeRoleKey(e.target.value),
                }))}
                placeholder="e.g. content_moderator"
              />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Changing this will automatically migrate all users with this role
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <SelectedIcon className="h-4 w-4" />
                      <span>{ICON_OPTIONS.find(i => i.value === formData.icon)?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(option => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${formData.color}`} />
                      <span>{COLOR_OPTIONS.find(c => c.value === formData.color)?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${option.value}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hierarchy">Hierarchy Level</Label>
            <Input
              id="hierarchy"
              type="number"
              min="1"
              max={maxAllowedHierarchy}
              value={formData.hierarchy_level}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 10;
                setFormData(prev => ({ 
                  ...prev, 
                  hierarchy_level: Math.min(value, maxAllowedHierarchy) 
                }));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Higher levels can manage lower levels. Your max: {maxAllowedHierarchy}
            </p>
            {formData.hierarchy_level > maxAllowedHierarchy && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Level exceeds your hierarchy. Max allowed: {maxAllowedHierarchy}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this role's responsibilities"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
