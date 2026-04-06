import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, isBefore, startOfDay } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface SelectedSlot {
  date: Date;
  time: string; // '09:00' | '13:00' | '17:00' | '21:00'
  slotId: string;
}

interface AdSlotPickerProps {
  tier: 'basic' | 'pro' | 'premium';
  userId: string;
  value: SelectedSlot | null;
  onChange: (slot: SelectedSlot | null) => void;
}

// Booking windows by tier (days ahead)
const BOOKING_WINDOWS: Record<string, number> = {
  basic: 1,    // same-day or next-day
  pro: 3,      // up to 3 days ahead
  premium: 7,  // up to 7 days ahead
};

const TIME_LABELS: Record<string, string> = {
  '18:00': '6:00 PM',
  '19:00': '7:00 PM',
  '20:00': '8:00 PM',
  '22:00': '10:00 PM',
};

const ALL_SLOTS = ['18:00', '19:00', '20:00', '22:00'];

export function AdSlotPicker({ tier, userId, value, onChange }: AdSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value?.date ?? undefined);

  const maxDaysAhead = BOOKING_WINDOWS[tier] ?? 1;
  const today = startOfDay(new Date());
  const maxDate = addDays(today, maxDaysAhead);

  // Fetch all slots for the next 14 days
  const { data: slots, isLoading } = useQuery({
    queryKey: ['ad-schedule-slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_schedule_slots')
        .select('id, slot_date, slot_time, user_id')
        .gte('slot_date', format(today, 'yyyy-MM-dd'))
        .lte('slot_date', format(addDays(today, 13), 'yyyy-MM-dd'))
        .order('slot_date', { ascending: true })
        .order('slot_time', { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5 * 60_000, // 5 minutes (relaxed from 2 min)
    staleTime: 2 * 60_000,
  });

  // Check if user already has a pending booked slot
  const { data: existingBooking } = useQuery({
    queryKey: ['user-pending-slot', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_schedule_slots')
        .select('id, slot_date, slot_time')
        .eq('user_id', userId)
        .gte('slot_date', format(today, 'yyyy-MM-dd'))
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const getSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return ALL_SLOTS.map((time) => {
      const dbSlot = slots?.find(s => s.slot_date === dateStr && s.slot_time === time);
      const isTaken = !!dbSlot?.user_id;
      const isMySlot = dbSlot?.user_id === userId;
      const isPast = isBefore(
        new Date(`${dateStr}T${time}:00`),
        new Date()
      );
      return { time, id: dbSlot?.id, isTaken, isMySlot, isPast };
    });
  };

  const isDateDisabled = (date: Date) => {
    const start = startOfDay(date);
    return isBefore(start, today) || isBefore(maxDate, start);
  };

  const handleSlotSelect = (slotId: string, date: Date, time: string) => {
    if (value?.slotId === slotId) {
      // Deselect
      onChange(null);
    } else {
      onChange({ date, time, slotId });
    }
  };

  return (
    <div className="space-y-4">
      {/* Tier booking window note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>
          {tier === 'basic' && 'Basic plan: book same-day or next-day slots only'}
          {tier === 'pro' && 'Pro plan: book up to 3 days ahead'}
          {tier === 'premium' && 'Premium plan: book up to 7 days ahead'}
        </span>
      </div>

      {existingBooking && existingBooking.id !== value?.slotId && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-500 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          You already have a slot booked on {existingBooking.slot_date} at {TIME_LABELS[existingBooking.slot_time] ?? existingBooking.slot_time}. 
          Cancel it first or it will be replaced.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendar */}
        <div>
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={isDateDisabled}
            className="p-3 pointer-events-auto rounded-lg border border-border"
          />
        </div>

        {/* Slots for selected date */}
        <div className="space-y-2">
          {!selectedDate ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground py-8 text-center">
              Select a date to see available time slots
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full py-8">
              <span className="text-sm text-muted-foreground">Loading slots...</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">{format(selectedDate, 'EEEE, d MMMM')}</p>
              <div className="space-y-2">
                {getSlotsForDate(selectedDate).map(({ time, id, isTaken, isMySlot, isPast }) => {
                  const isSelected = value?.slotId === id;
                  const isUnavailable = (isTaken && !isMySlot) || isPast || !id;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => id && handleSlotSelect(id, selectedDate, time)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground"
                          : isUnavailable
                            ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                            : "border-border bg-card hover:border-primary/50 text-foreground cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="font-medium">{TIME_LABELS[time]}</span>
                        <span className="text-xs text-muted-foreground">UK time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <Badge variant="default" className="text-xs">Selected</Badge>
                        )}
                        {isPast ? (
                          <span className="text-xs text-muted-foreground">Passed</span>
                        ) : isTaken && !isMySlot ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Booked</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-500">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Available</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {value && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
          ✅ Slot selected: <strong>{format(value.date, 'EEEE d MMMM')}</strong> at <strong>{TIME_LABELS[value.time]}</strong> UK time
        </div>
      )}
    </div>
  );
}
