-- =============================================================================
-- KONSTRUKT Academy — Seed verification queries
-- Run in Supabase SQL Editor AFTER supabase/seed.sql (with Clerk IDs replaced)
-- =============================================================================

-- Row counts per table
SELECT 'modules' AS table_name, COUNT(*)::bigint AS row_count FROM public.modules
UNION ALL SELECT 'cohorts', COUNT(*) FROM public.cohorts
UNION ALL SELECT 'users (all)', COUNT(*) FROM public.users
UNION ALL SELECT 'users (students)', COUNT(*) FROM public.users WHERE role = 'student'
UNION ALL SELECT 'users (trainers)', COUNT(*) FROM public.users WHERE role = 'trainer'
UNION ALL SELECT 'users (admins)', COUNT(*) FROM public.users WHERE role = 'admin'
UNION ALL SELECT 'progress', COUNT(*) FROM public.progress
UNION ALL SELECT 'submissions', COUNT(*) FROM public.submissions
UNION ALL SELECT 'print_queue', COUNT(*) FROM public.print_queue
UNION ALL SELECT 'tutor_conversations', COUNT(*) FROM public.tutor_conversations
UNION ALL SELECT 'tutor_messages', COUNT(*) FROM public.tutor_messages
ORDER BY table_name;

-- Expected after full seed:
-- modules: 10 | cohorts: 2 | progress: 30 | submissions: 5 | print_queue: 4
-- tutor_conversations: 2 | tutor_messages: 6

-- Module catalog
SELECT id, title, badge_name, mission_layer::text, sort_order
FROM public.modules
ORDER BY id;

-- Student progress summary
SELECT
  u.id AS student_id,
  u.tokens_remaining,
  c.name AS cohort,
  COUNT(*) FILTER (WHERE p.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE p.status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE p.status = 'pending_review') AS pending_review,
  COUNT(*) FILTER (WHERE p.status = 'locked') AS locked
FROM public.users u
LEFT JOIN public.cohorts c ON c.id = u.cohort_id
LEFT JOIN public.progress p ON p.student_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, u.tokens_remaining, c.name
ORDER BY u.id;

-- Cohort ↔ trainer mapping
SELECT c.name, c.trainer_id, u.role AS trainer_role
FROM public.cohorts c
LEFT JOIN public.users u ON u.id = c.trainer_id
ORDER BY c.name;

-- Print queue board
SELECT
  pq.status,
  u.id AS student_id,
  pq.printer_assigned,
  s.module_id,
  s.submission_type::text
FROM public.print_queue pq
JOIN public.users u ON u.id = pq.student_id
LEFT JOIN public.submissions s ON s.id = pq.submission_id
ORDER BY pq.status, pq.created_at;

-- Tutor chat sample
SELECT
  tc.id AS conversation_id,
  tc.student_id,
  tc.module_id,
  COUNT(tm.id) AS message_count
FROM public.tutor_conversations tc
LEFT JOIN public.tutor_messages tm ON tm.conversation_id = tc.id
GROUP BY tc.id, tc.student_id, tc.module_id
ORDER BY tc.module_id;
