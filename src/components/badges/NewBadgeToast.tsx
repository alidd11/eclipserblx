import { useEffect } from 'react';
import { Badge as BadgeType } from '@/hooks/useBadges';
import { BadgeIcon } from './BadgeIcon';
import { toast } from 'sonner';

interface NewBadgeToastProps {
  badges: BadgeType[];
  onClear: () => void;
}

export function NewBadgeToast({ badges, onClear }: NewBadgeToastProps) {
  useEffect(() => {
    if (badges.length === 0) return;

    badges.forEach((badge, index) => {
      setTimeout(() => {
        toast.custom(
          (id) => (
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg flex items-center gap-3 min-w-[300px]">
              <BadgeIcon icon={badge.icon} color={badge.color} size="md" earned />
              <div className="flex-1">
                <p className="font-semibold text-sm">Badge Earned! 🎉</p>
                <p className="text-sm text-foreground">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </div>
          ),
          {
            duration: 5000,
            position: 'bottom-right',
          }
        );
      }, index * 1500); // Stagger notifications
    });

    // Clear after all toasts shown
    const timeout = setTimeout(() => {
      onClear();
    }, badges.length * 1500 + 5000);

    return () => clearTimeout(timeout);
  }, [badges, onClear]);

  return null;
}
