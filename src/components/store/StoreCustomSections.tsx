import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface StoreCustomSectionsProps {
  storeId: string;
  accentColor: string;
}

export function StoreCustomSections({ storeId, accentColor }: StoreCustomSectionsProps) {
  const { data: sections } = useQuery({
    queryKey: ['public-store-sections', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_custom_sections')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });

  if (!sections || sections.length === 0) return null;

  return (
    <div className="space-y-6">
      {sections.map((section: any) => (
        <Card key={section.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg" style={{ color: accentColor }}>
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {section.section_type === 'faq' && section.content?.items && (
              <div className="space-y-3">
                {section.content.items.filter((i: any) => i.question).map((item: any, idx: number) => (
                  <div key={idx} className="border-b border-border pb-3 last:border-0">
                    <p className="font-medium text-sm mb-1">{item.question}</p>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {section.section_type === 'testimonials' && section.content?.items && (
              <div className="grid gap-4 sm:grid-cols-2">
                {section.content.items.filter((i: any) => i.text).map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < (item.rating || 5) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                      ))}
                    </div>
                    <p className="text-sm italic mb-2">"{item.text}"</p>
                    {item.name && <p className="text-xs font-medium text-muted-foreground">— {item.name}</p>}
                  </div>
                ))}
              </div>
            )}

            {section.section_type === 'text_block' && section.content?.body && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.content.body}</p>
            )}

            {section.section_type === 'gallery' && section.content?.images && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {section.content.images.map((url: string, idx: number) => (
                  <img key={idx} src={url} alt="" className="rounded-lg object-cover w-full h-32" loading="lazy" />
                ))}
              </div>
            )}

            {section.section_type === 'featured_collection' && section.content?.description && (
              <p className="text-sm text-muted-foreground">{section.content.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
