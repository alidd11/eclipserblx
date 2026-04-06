import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

 const { data: navLinks = [] } = useQuery({
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
 const linkUrl = newUrl;
 if (newType === 'page' && !linkUrl) throw new Error('Please select a page');
 if (newType === 'external' && !linkUrl) throw new Error('URL is required');

 const { error } = await supabase
 .from('store_nav_links')
 .insert({
 store_id: storeId,
 label: newLabel.trim(),
 url: linkUrl,
 link_type: newType,
 display_order: navLinks.length,
 is_visible: true,
 } as any);
 if (error) throw error;
 },
 onSuccess: () => {
 toast.success('Navigation link added');
 setNewLabel('');
 setNewUrl('');
 queryClient.invalidateQueries({ queryKey: ['store-nav-links', storeId] });
 },
 onError: (err: any) => toast.error(err.message),
 });

 const deleteLink = useMutation({
 mutationFn: async (id: string) => {
 const { error } = await supabase.from('store_nav_links').delete().eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 toast.success('Link removed');
 queryClient.invalidateQueries({ queryKey: ['store-nav-links', storeId] });
 },
 });

 const toggleVisible = useMutation({
 mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
 const { error } = await supabase
 .from('store_nav_links')
 .update({ is_visible: visible } as any)
 .eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['store-nav-links', storeId] });
 },
 });

 const linkTypeIcon = (type: string) => {
 switch (type) {
 case 'page': return <FileText className="h-3.5 w-3.5" />;
 case 'category': return <LayoutGrid className="h-3.5 w-3.5" />;
 case 'external': return <ExternalLink className="h-3.5 w-3.5" />;
 default: return <Link2 className="h-3.5 w-3.5" />;
 }
 };

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <Link2 className="h-5 w-5" />
 Store Navigation
 </h3>
 <p className="text-sm text-muted-foreground">
 Control what links appear in your store's sidebar navigation
 </p>
 </div>
 <div className="p-4 space-y-4">
 {navLinks.length > 0 && (
 <div className="space-y-2">
 {navLinks.map((link) => (
 <div
 key={link.id}
 className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
 >
 <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
 <div className="flex items-center gap-2 text-muted-foreground">
 {linkTypeIcon(link.link_type)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">{link.label}</p>
 <p className="text-xs text-muted-foreground truncate">{link.url || 'No URL'}</p>
 </div>
 <Switch
 checked={link.is_visible}
 onCheckedChange={(v) => toggleVisible.mutate({ id: link.id, visible: v })}
 />
 <Button
 variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
 onClick={() => deleteLink.mutate(link.id)}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 ))}
 </div>
 )}

 <div className="p-4 rounded-lg border border-dashed border-border space-y-3">
 <p className="text-sm font-medium">Add Navigation Link</p>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-xs">Label</Label>
 <Input
 value={newLabel}
 onChange={(e) => setNewLabel(e.target.value)}
 placeholder="e.g. FAQ"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs">Type</Label>
 <Select value={newType} onValueChange={(v) => { setNewType(v); setNewUrl(''); }}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="page">Custom Page</SelectItem>
 <SelectItem value="external">External URL</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1">
 <Label className="text-xs">
 {newType === 'page' ? 'Page' : 'URL'}
 </Label>
 {newType === 'page' ? (
 <Select value={newUrl} onValueChange={setNewUrl}>
 <SelectTrigger><SelectValue placeholder="Select page" /></SelectTrigger>
 <SelectContent>
 {pages.map((p: any) => (
 <SelectItem key={p.id} value={`/store/${storeSlug}/page/${p.slug}`}>
 {p.title}
 </SelectItem>
 ))}
 {pages.length === 0 && (
 <div className="px-3 py-2 text-xs text-muted-foreground">
 No published pages yet.
 </div>
 )}
 </SelectContent>
 </Select>
 ) : (
 <Input
 value={newUrl}
 onChange={(e) => setNewUrl(e.target.value)}
 placeholder="https://..."
 />
 )}
 </div>
 </div>
 <Button
 size="sm"
 onClick={() => addLink.mutate()}
 disabled={addLink.isPending || !newLabel.trim()}
 >
 <Plus className="h-4 w-4 mr-1" />
 Add Link
 </Button>
 </div>
 </div>
 </div>
 );
}
