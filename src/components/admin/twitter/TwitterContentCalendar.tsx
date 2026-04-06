import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface XTheme {
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  accent: string;
  trendBg: string;
  [key: string]: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export function TwitterContentCalendar({ xTheme }: { xTheme: XTheme }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startOfMonth = new Date(year, month, 1).toISOString();
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: posts } = useQuery({
    queryKey: ['twitter-calendar-posts', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twitter_posts')
        .select('id, content, status, posted_at, scheduled_for, post_type, ai_generated')
        .or(`posted_at.gte.${startOfMonth},scheduled_for.gte.${startOfMonth}`)
        .or(`posted_at.lte.${endOfMonth},scheduled_for.lte.${endOfMonth}`)
        .order('posted_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const postsByDate = useMemo(() => {
    const map: Record<string, typeof posts> = {};
    posts?.forEach((p) => {
      const dateStr = (p.posted_at || p.scheduled_for || '').slice(0, 10);
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr]!.push(p);
    });
    return map;
  }, [posts]);

  const days = getMonthDays(year, month);
  const today = new Date().toISOString().slice(0, 10);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedPosts = selectedDate ? postsByDate[selectedDate] ?? [] : [];

  const statusDot = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-[#00ba7c]';
      case 'queued': return 'bg-[#1d9bf0]';
      case 'draft': return 'bg-[#ffd400]';
      case 'failed': return 'bg-[#f4212e]';
      default: return 'bg-[#71767b]';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${xTheme.border} border-b`}>
        <div className="flex items-center gap-2">
          <CalendarIcon className={`h-4 w-4 ${xTheme.accent}`} />
          <span className={`text-[15px] font-bold ${xTheme.text}`}>Content Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className={`p-1.5 rounded-full ${xTheme.hover} transition-colors`}>
            <ChevronLeft className={`h-4 w-4 ${xTheme.textSecondary}`} />
          </button>
          <span className={`text-[14px] font-semibold ${xTheme.text} min-w-[140px] text-center`}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className={`p-1.5 rounded-full ${xTheme.hover} transition-colors`}>
            <ChevronRight className={`h-4 w-4 ${xTheme.textSecondary}`} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2">
        {DAYS.map((d) => (
          <div key={d} className={`text-center py-2 text-[11px] font-medium uppercase tracking-wide ${xTheme.textSecondary}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-2 pb-2">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = day.toISOString().slice(0, 10);
          const dayPosts = postsByDate[dateStr] ?? [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`relative flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-[#1d9bf0]/20'
                  : xTheme.hover
              }`}
            >
              <span className={`text-[13px] leading-6 ${
                isToday
                  ? 'bg-[#1d9bf0] text-white rounded-full w-6 h-6 flex items-center justify-center font-bold'
                  : `${xTheme.text}`
              }`}>
                {day.getDate()}
              </span>
              {dayPosts.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayPosts.slice(0, 4).map((p, j) => (
                    <div key={j} className={`h-1 w-1 rounded-full ${statusDot(p.status)}`} />
                  ))}
                  {dayPosts.length > 4 && (
                    <span className={`text-[8px] ${xTheme.textSecondary} ml-0.5`}>+{dayPosts.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className={`${xTheme.border} border-t`}>
          <div className={`px-4 py-2 ${xTheme.border} border-b`}>
            <span className={`text-[13px] font-bold ${xTheme.text}`}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <span className={`text-[13px] ${xTheme.textSecondary} ml-2`}>
              {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedPosts.length === 0 ? (
            <div className={`px-4 py-4 text-center text-[13px] ${xTheme.textSecondary}`}>
              No posts on this date
            </div>
          ) : (
            selectedPosts.map((post) => {
              const time = post.posted_at || post.scheduled_for;
              const timeStr = time ? new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div key={post.id} className={`px-4 py-2.5 ${xTheme.hover} ${xTheme.border} border-b transition-colors`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-2 w-2 rounded-full ${statusDot(post.status)}`} />
                    <span className={`text-[12px] font-medium ${xTheme.textSecondary}`}>{timeStr}</span>
                    <span className={`text-[11px] uppercase ${xTheme.textSecondary}`}>{post.status}</span>
                    {post.ai_generated && (
                      <span className="text-[10px] text-[#1d9bf0] bg-[#1d9bf0]/10 rounded px-1">AI</span>
                    )}
                  </div>
                  <p className={`text-[13px] ${xTheme.text} line-clamp-2 leading-[18px]`}>
                    {post.content?.replace(/\n*#\w+/g, '').trim() || 'Untitled'}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
