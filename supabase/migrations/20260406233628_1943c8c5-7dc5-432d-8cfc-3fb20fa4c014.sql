
DROP VIEW IF EXISTS public.staff_performance_summary;

CREATE OR REPLACE VIEW public.staff_performance_summary AS
WITH base AS (
  SELECT
    sa.user_id,
    p.display_name,
    p.staff_id,
    COUNT(CASE WHEN sa.activity_type = 'ticket_completed' THEN 1 END) AS tickets_resolved,
    COUNT(CASE WHEN sa.activity_type = 'ticket_claimed' THEN 1 END) AS tickets_claimed,
    COUNT(CASE WHEN sa.activity_type = 'chat_completed' THEN 1 END) AS chats_completed,
    COUNT(CASE WHEN sa.activity_type = 'chat_claimed' THEN 1 END) AS chats_claimed,
    COUNT(*) AS total_actions,
    COALESCE((
      SELECT SUM(dl.duration_minutes)::numeric / 60.0
      FROM staff_duty_logs dl
      WHERE dl.user_id = sa.user_id AND dl.clock_in >= NOW() - INTERVAL '30 days'
    ), 0) AS duty_hours_30d,
    MAX(sa.created_at) AS last_active_at
  FROM staff_activity sa
  JOIN profiles p ON p.user_id = sa.user_id
  WHERE sa.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY sa.user_id, p.display_name, p.staff_id
),
csat AS (
  SELECT
    st.assigned_to AS user_id,
    ROUND(AVG(ts.rating)::numeric, 1) AS avg_csat
  FROM ticket_satisfaction ts
  JOIN support_tickets st ON st.id = ts.ticket_id
  WHERE st.assigned_to IS NOT NULL AND ts.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY st.assigned_to
),
sla AS (
  SELECT
    assigned_to AS user_id,
    ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)::numeric, 0) AS avg_first_response_minutes,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)::numeric, 0) AS avg_resolution_minutes
  FROM support_tickets
  WHERE assigned_to IS NOT NULL
    AND created_at >= NOW() - INTERVAL '30 days'
    AND first_response_at IS NOT NULL
  GROUP BY assigned_to
)
SELECT
  b.user_id,
  b.display_name,
  b.staff_id,
  b.tickets_resolved,
  b.tickets_claimed,
  b.chats_completed,
  b.chats_claimed,
  b.total_actions,
  b.duty_hours_30d,
  b.last_active_at,
  COALESCE(c.avg_csat, 0) AS avg_csat,
  COALESCE(s.avg_first_response_minutes, 0) AS avg_first_response_minutes,
  COALESCE(s.avg_resolution_minutes, 0) AS avg_resolution_minutes
FROM base b
LEFT JOIN csat c ON c.user_id = b.user_id
LEFT JOIN sla s ON s.user_id = b.user_id;
