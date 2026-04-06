import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Button } from '@/components/ui/button';
import { SectionList, type StoreSection } from '@/components/seller/builder/SectionList';
import { SectionSettings } from '@/components/seller/builder/SectionSettings';
import { BuilderPreview } from '@/components/seller/builder/BuilderPreview';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Save, ExternalLink, Loader2, RotateCcw, Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const DEFAULT_SECTIONS: StoreSection[] = [
  { id: 'banner', type: 'banner', label: 'Banner', visible: true },
  { id: 'header', type: 'header', label: 'Store Header', visible: true },
  { id: 'best_sellers', type: 'best_sellers', label: 'Best Sellers', visible: true, config: { limit: 4 } },
  { id: 'products', type: 'products', label: 'All Products', visible: true },
  { id: 'trust_signals', type: 'trust_signals', label: 'Trust Signals', visible: true },
  { id: 'custom_sections', type: 'custom_sections', label: 'Custom Sections', visible: true },
  { id: 'reviews', type: 'reviews', label: 'Reviews', visible: true },
  { id: 'recommendations', type: 'recommendations', label: 'Recommendations', visible: true },
];

function parseSavedLayout(storeLayout: any): StoreSection[] | null {
  if (!storeLayout?.sections || !Array.isArray(storeLayout.sections)) return null;
  
  return storeLayout.sections.map((s) => ({
    id: s.type,
    type: s.type,
    label: DEFAULT_SECTIONS.find(d => d.type === s.type)?.label || s.type,
    visible: s.visible ?? true,
    config: s.config || undefined,
  }));
}

export default function SellerStoreBuilder() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sections, setSections] = useState<StoreSection[]>(DEFAULT_SECTIONS);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Load saved layout
  const { data: savedLayout, isLoading } = useQuery({
    queryKey: ['store-layout', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const { data } = await supabase
        .from('stores')
        .select('store_layout')
        .eq('id', store.id)
        .single();
      return data?.store_layout;
    },
    enabled: !!store?.id,
  });

  useEffect(() => {
    if (savedLayout) {
      const parsed = parseSavedLayout(savedLayout);
      if (parsed) setSections(parsed);
    }
  }, [savedLayout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setHasChanges(true);
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
    setHasChanges(true);
  }, []);

  const updateConfig = useCallback((id: string, config: Record<string, any>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, config } : s))
    );
    setHasChanges(true);
  }, []);

  const resetToDefault = useCallback(() => {
    setSections(DEFAULT_SECTIONS);
    setSelectedId(null);
    setHasChanges(true);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No store');
      
      const layoutData = {
        sections: sections.map(s => ({
          type: s.type,
          visible: s.visible,
          ...(s.config && Object.keys(s.config).length > 0 ? { config: s.config } : {}),
        })),
      };

      const { error } = await supabase
        .from('stores')
        .update({ store_layout: layoutData } as any)
        .eq('id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Store layout saved!');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['store-layout'] });
      queryClient.invalidateQueries({ queryKey: ['store'] });
    },
    onError: () => {
      toast.error('Failed to save layout');
    },
  });

  const selectedSection = sections.find(s => s.id === selectedId);
  const storeUrl = store?.slug ? `/store/${store.slug}` : '';

  const sidePanel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">Sections</h2>
          <p className="text-[11px] text-muted-foreground">Drag to reorder, toggle to show/hide</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetToDefault}
          className="text-xs h-7 gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <SectionList
              sections={sections}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggleVisibility={toggleVisibility}
            />
          </SortableContext>
        </DndContext>
      </div>

      {/* Section settings */}
      {selectedSection && (
        <div className="border-t border-border p-4 bg-muted/20">
          <SectionSettings
            section={selectedSection}
            onUpdateConfig={updateConfig}
          />
        </div>
      )}
    </div>
  );

  const previewPanel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Live Preview</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <Button
              variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPreviewMode('desktop')}
              haptic={false}
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPreviewMode('mobile')}
              haptic={false}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
          {storeUrl && (
            <Link to={storeUrl} target="_blank" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              View Store
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <BuilderPreview
          sections={sections}
          storeName={store?.name}
          accentColor={store?.accent_color || undefined}
          selectedId={selectedId}
          previewMode={previewMode}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SellerLayout>
    );
  }

  const saveButton = (
    <Button
      onClick={() => saveMutation.mutate()}
      disabled={!hasChanges || saveMutation.isPending}
      size="sm"
      className="gap-1.5"
    >
      {saveMutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      Save Layout
    </Button>
  );

  return (
    <SellerLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Store Builder</h1>
          <p className="text-sm text-muted-foreground">Drag sections to reorder your storefront</p>
        </div>
        {saveButton}
      </div>
      {isMobile ? (
        <div className="space-y-4">
          {sidePanel}
          {previewPanel}
        </div>
      ) : (
        <div className="h-[calc(100dvh-8rem)] border border-border rounded-lg overflow-hidden bg-card">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              {sidePanel}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={65}>
              {previewPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </SellerLayout>
  );
}
