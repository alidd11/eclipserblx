import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StoreTemplate {
  id: string;
  name: string;
  preview: string;
  accentColor: string;
  style: 'minimal' | 'gaming' | 'professional';
}

const templates: StoreTemplate[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    preview: 'Clean & modern with lots of white space',
    accentColor: 'hsl(0 0% 9%)',
    style: 'minimal',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    preview: 'Bold gradients & vibrant colors for gamers',
    accentColor: 'hsl(265 85% 60%)',
    style: 'gaming',
  },
  {
    id: 'professional',
    name: 'Professional',
    preview: 'Polished & refined for serious creators',
    accentColor: 'hsl(210 65% 50%)',
    style: 'professional',
  },
];

interface StoreTemplatesProps {
  selected?: string;
  onSelect: (template: StoreTemplate) => void;
}

export function StoreTemplates({ selected, onSelect }: StoreTemplatesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Palette className="h-4 w-4" />
        <span>Choose a store theme</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {templates.map((template) => {
          const isSelected = selected === template.id;
          return (
            <motion.button
              key={template.id}
              onClick={() => onSelect(template)}
              className={cn(
                'relative rounded-xl border-2 p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border hover:border-primary/30 bg-card'
              )}
            >
              {/* Mini preview */}
              <div className="mb-3 rounded-lg overflow-hidden border border-border">
                <div
                  className="h-8 w-full"
                  style={{ background: template.accentColor }}
                />
                <div className="bg-muted/50 p-2 space-y-1.5">
                  <div className="h-2 w-3/4 rounded bg-muted-foreground/20" />
                  <div className="grid grid-cols-3 gap-1">
                    <div className="h-6 rounded bg-muted-foreground/10" />
                    <div className="h-6 rounded bg-muted-foreground/10" />
                    <div className="h-6 rounded bg-muted-foreground/10" />
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-sm">{template.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{template.preview}</p>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
