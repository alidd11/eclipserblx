import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Link2, FileText, ExternalLink, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

interface NavLink {
  id: string;
  store_id: string;
  label: string;
  url: string | null;
  link_type: string;
  target_id: string | null;
  display_order: number;
  is_visible: boolean;
}

interface StoreNavEditorProps {
  storeId: string;
  storeSlug: string;
}

export function StoreNavEditor({ storeId, storeSlug }: StoreNavEditorProps) {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('page');

  const { data: navLinks = [], isLoading } = useQuery({
    queryKey: ['store-nav-links', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_nav_links')
        .select('*')
        .eq('store_id', storeId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as NavLink[];
    },
    enabled: !!storeId,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['store-pages', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_pages')
        .select('id, title, slug')
        .eq('store_id', storeId)
        .eq('is_published', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const addLink = useMutation({
    mutationFn: async () => {
      if (!newLabel.trim()) throw new Error('Label is required');
      
      let url = new
