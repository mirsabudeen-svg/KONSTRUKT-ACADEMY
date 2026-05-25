-- =============================================================================
-- KONSTRUKT ACADEMY — FULL SEED DATA (READY TO RUN)
-- All Clerk IDs replaced. Run in KONSTRUKT ACADEMY Supabase SQL Editor.
-- Run AFTER migrations 001 → 002 → 003 → 004
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1: Reset test data (users table preserved — synced from Clerk)
-- ---------------------------------------------------------------------------
UPDATE public.users SET cohort_id = NULL;
UPDATE public.cohorts SET trainer_id = NULL;

TRUNCATE TABLE public.tutor_messages RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tutor_conversations RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.print_queue RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.submissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.cohorts RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.modules RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- STEP 2: Seed 10 modules
-- ---------------------------------------------------------------------------
INSERT INTO public.modules (
  id, title, description, mission_layer, badge_name, required_hardware, sort_order
) VALUES
  (1, 'Launch Sequence',
   'Orientation, safety oath, and tool-kit mastery.',
   'THINK', 'Initiated Builder',
   ARRAY['Safety Kit', 'ESP32-S3', 'Breadboard'], 1),

  (2, 'Wiring Bay',
   'AI thinking, WHAT+STYLE+DETAILS, and first prompts.',
   'THINK', 'Prompt Engineer',
   ARRAY['Chat Workstation', 'Fusion 360'], 2),

  (3, 'Servo Calibration',
   'Idea-to-object pipeline and Meshy walkthrough.',
   'DESIGN', 'First Builder',
   ARRAY['Bambu A1 Mini', 'MG996R Servo', 'Meshy.ai'], 3),

  (4, 'First Movement',
   'Robot anatomy: ESP32-S3, PCA9685, MG996R servos.',
   'DESIGN', 'Mechanics Explorer',
   ARRAY['ESP32-S3', 'PCA9685', 'MG996R'], 4),

  (5, 'Pick & Place',
   'Mission concepts, 180mm boundary, manufacturable design.',
   'DESIGN', 'Robot Designer',
   ARRAY['Bambu A1 Mini', 'Calipers', 'PLA Filament'], 5),

  (6, 'Sensor Dock',
   'Print queue system, pre-flight checks, quality inspection.',
   'BUILD', 'Fabrication Operator',
   ARRAY['Bambu A1 Mini', 'Bambu Studio'], 6),

  (7, 'AI Prompt Lab',
   'Base frame assembly, servo alignment, symmetry checks.',
   'BUILD', 'Assembler Level 1',
   ARRAY['MG996R', 'Servo Horn Kit', 'ESP32-S3'], 7),

  (8, '3D Forge',
   'Upper arm, four-bar linkage, wrist, parallel gripper.',
   'BUILD', 'Assembler Level 2',
   ARRAY['MG996R', 'Linkage Kit', 'Power Supply 5V/10A'], 8),

  (9, 'Mission Challenge',
   'Sequential motion code, calibration, debugging.',
   'OPERATE', 'Robot Commander',
   ARRAY['ESP32-S3', 'PCA9685', 'MG996R x6', '5V/10A PSU'], 9),

  (10, 'Graduation Flight',
   'Showcase checklist, demo, Certified KONTRAKTOR graduation.',
   'OPERATE', 'Certified Kontraktor',
   ARRAY['Full Kit', 'Demo Stage Kit'], 10);

-- ---------------------------------------------------------------------------
-- STEP 3: Upsert test users
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, role, tokens_remaining) VALUES
  ('user_3E8XWJKR8jWwyw5Wr7nhkbXz689', 'admin',   10),
  ('user_3E8XsMHyjBCj5q0Ubs3lIVvl7mP', 'trainer', 10),
  ('user_3E8Y9jwNaZWLFiybN6rh9B7XpKl', 'trainer', 10),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 'student',  8),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 'student', 10),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 'student', 10)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  tokens_remaining = EXCLUDED.tokens_remaining;

-- ---------------------------------------------------------------------------
-- STEP 4: Cohorts
-- ---------------------------------------------------------------------------
INSERT INTO public.cohorts (id, name, start_date, trainer_id) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Batch 01 — Kannur',    '2026-06-01', 'user_3E8XsMHyjBCj5q0Ubs3lIVvl7mP'),
  ('c1000000-0000-0000-0000-000000000002', 'Batch 02 — Kozhikode', '2026-07-01', 'user_3E8Y9jwNaZWLFiybN6rh9B7XpKl');

UPDATE public.users SET cohort_id = 'c1000000-0000-0000-0000-000000000001'
  WHERE id IN ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 'user_3E8YL29cb3gD6KyeakuDuF2mnIw');

UPDATE public.users SET cohort_id = 'c1000000-0000-0000-0000-000000000002'
  WHERE id = 'user_3E8YRU2qbVDs0P90f1RvmmMNnKR';

-- ---------------------------------------------------------------------------
-- STEP 5: Progress
-- Student 1 (Advanced): 4 completed, 1 in_progress, 5 locked
-- ---------------------------------------------------------------------------
INSERT INTO public.progress (student_id, module_id, status, score) VALUES
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 1,  'completed',   95),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 2,  'completed',   88),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 3,  'completed',   92),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 4,  'completed',   85),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 5,  'in_progress', NULL),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 6,  'locked',      NULL),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 7,  'locked',      NULL),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 8,  'locked',      NULL),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 9,  'locked',      NULL),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 10, 'locked',      NULL);

-- Student 2 (Beginner): 1 completed, 1 pending_review, 8 locked
INSERT INTO public.progress (student_id, module_id, status, score) VALUES
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 1,  'completed',      78),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 2,  'pending_review', NULL),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 3,  'locked',         NULL),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 4,  'locked',         NULL),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 5,  'locked',         NULL),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 6,  'locked',         NULL),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 7,  'locked',         NULL),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 8,  'locked',         NULL),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 9,  'locked',         NULL),
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 10, 'locked',         NULL);

-- Student 3 (Fresh): 1 in_progress, 9 locked
INSERT INTO public.progress (student_id, module_id, status, score) VALUES
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 1,  'in_progress', NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 2,  'locked',      NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 3,  'locked',      NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 4,  'locked',      NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 5,  'locked',      NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 6,  'locked',      NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 7,  'locked',      NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 8,  'locked',      NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 9,  'locked',      NULL),
  ('user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 10, 'locked',      NULL);

-- ---------------------------------------------------------------------------
-- STEP 6: Submissions
-- ---------------------------------------------------------------------------
INSERT INTO public.submissions (
  id, student_id, module_id, submission_type, content_url, status, submitted_at, reviewed_at, reviewed_by
) VALUES
  (
    'd2000000-0000-0000-0000-000000000001',
    'user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 1, 'code',
    'void setup() { Serial.begin(115200); servo1.attach(13); }
void loop() { servo1.write(90); delay(1000); servo1.write(0); delay(1000); }',
    'approved', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days',
    'user_3E8XsMHyjBCj5q0Ubs3lIVvl7mP'
  ),
  (
    'd2000000-0000-0000-0000-000000000002',
    'user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 2, 'prompt_text',
    '{"text":"WHAT: safety quiz answers. STYLE: concise. DETAILS: PPE list complete."}',
    'approved', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days',
    'user_3E8XsMHyjBCj5q0Ubs3lIVvl7mP'
  ),
  (
    'd2000000-0000-0000-0000-000000000003',
    'user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 3, 'stl',
    'mission-submissions/user_3E8YHWHIBQF9bi91aHtIGyNn2CB/3/gripper-v1.stl',
    'approved', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days',
    'user_3E8XsMHyjBCj5q0Ubs3lIVvl7mP'
  ),
  (
    'd2000000-0000-0000-0000-000000000004',
    'user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 4, 'stl',
    'mission-submissions/user_3E8YHWHIBQF9bi91aHtIGyNn2CB/4/wiring-diagram.png',
    'approved', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days',
    'user_3E8XsMHyjBCj5q0Ubs3lIVvl7mP'
  ),
  (
    'd2000000-0000-0000-0000-000000000005',
    'user_3E8YL29cb3gD6KyeakuDuF2mnIw', 2, 'code',
    'void setup() { myServo.attach(9); }
void loop() { myServo.write(180); delay(1000); }',
    'pending', NOW() - INTERVAL '2 days', NULL, NULL
  );

-- ---------------------------------------------------------------------------
-- STEP 7: Print queue
-- ---------------------------------------------------------------------------
INSERT INTO public.print_queue (id, student_id, submission_id, status, printer_assigned) VALUES
  ('b4000000-0000-0000-0000-000000000001', 'user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 'd2000000-0000-0000-0000-000000000003', 'completed',          'Bambu_A1_Mini'),
  ('b4000000-0000-0000-0000-000000000002', 'user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 'd2000000-0000-0000-0000-000000000004', 'completed',          'Bambu_A1_Mini'),
  ('b4000000-0000-0000-0000-000000000003', 'user_3E8YL29cb3gD6KyeakuDuF2mnIw', 'd2000000-0000-0000-0000-000000000005', 'waiting_for_printer','Bambu_A1_Mini'),
  ('b4000000-0000-0000-0000-000000000004', 'user_3E8YRU2qbVDs0P90f1RvmmMNnKR', NULL,                                   'waiting_for_printer','Bambu_A1_Mini');

-- ---------------------------------------------------------------------------
-- STEP 8: Tutor conversations + messages
-- ---------------------------------------------------------------------------
INSERT INTO public.tutor_conversations (id, student_id, module_id, messages) VALUES
  (
    'a3000000-0000-0000-0000-000000000001',
    'user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 5,
    '[
      {"role":"user","content":"What is inverse kinematics?","at":"2026-05-18T10:00:00Z"},
      {"role":"assistant","content":"Great question! Before I explain, what do you think happens when you move your elbow versus your wrist?","at":"2026-05-18T10:00:05Z"}
    ]'::jsonb
  ),
  (
    'a3000000-0000-0000-0000-000000000002',
    'user_3E8YRU2qbVDs0P90f1RvmmMNnKR', 1,
    '[
      {"role":"user","content":"What are servos?","at":"2026-05-19T14:00:00Z"},
      {"role":"assistant","content":"Servos are motors that know their angle! Can you think of something at home that moves to a specific position and holds it?","at":"2026-05-19T14:00:04Z"}
    ]'::jsonb
  );

INSERT INTO public.tutor_messages (conversation_id, role, content, created_at) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'user',      'What is inverse kinematics?',
   NOW() - INTERVAL '2 days'),
  ('a3000000-0000-0000-0000-000000000001', 'assistant', 'Great question! Before I explain, what do you think happens when you move your elbow versus your wrist?',
   NOW() - INTERVAL '2 days' + INTERVAL '5 seconds'),
  ('a3000000-0000-0000-0000-000000000002', 'user',      'What are servos?',
   NOW() - INTERVAL '1 day'),
  ('a3000000-0000-0000-0000-000000000002', 'assistant', 'Servos are motors that know their angle! Can you think of something at home that moves to a specific position and holds it?',
   NOW() - INTERVAL '1 day' + INTERVAL '4 seconds'),
  ('a3000000-0000-0000-0000-000000000002', 'user',      'Write me the full code for mission 1',
   NOW() - INTERVAL '1 day' + INTERVAL '2 minutes'),
  ('a3000000-0000-0000-0000-000000000002', 'assistant', 'I won''t paste full code — but let''s start together. What pin will you use on the ESP32-S3, and why move one servo at a time?',
   NOW() - INTERVAL '1 day' + INTERVAL '2 minutes' + INTERVAL '6 seconds');

-- ---------------------------------------------------------------------------
-- STEP 9: Gamification seed (student 1 — 4 modules × 100 XP = 400 base)
-- ---------------------------------------------------------------------------
UPDATE public.users SET
  total_xp = 400,
  level = 'Design Engineer',
  current_streak = 3,
  longest_streak = 5
WHERE id = 'user_3E8YHWHIBQF9bi91aHtIGyNn2CB';

INSERT INTO public.xp_events (student_id, event_type, xp_earned, module_id, description, created_at) VALUES
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 'module_completed', 100, 1, 'Launch Sequence completed', NOW() - INTERVAL '14 days'),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 'module_completed', 100, 2, 'Wiring Bay completed', NOW() - INTERVAL '12 days'),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 'module_completed', 100, 3, 'Servo Calibration completed', NOW() - INTERVAL '10 days'),
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 'module_completed', 100, 4, 'First Movement completed', NOW() - INTERVAL '7 days');

INSERT INTO public.streaks (student_id, current_streak, longest_streak, last_activity_date) VALUES
  ('user_3E8YHWHIBQF9bi91aHtIGyNn2CB', 3, 5, CURRENT_DATE - INTERVAL '1 day')
ON CONFLICT (student_id) DO UPDATE SET
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  last_activity_date = EXCLUDED.last_activity_date;

UPDATE public.users SET
  total_xp = 100,
  level = 'Circuit Cadet'
WHERE id = 'user_3E8YL29cb3gD6KyeakuDuF2mnIw';

INSERT INTO public.xp_events (student_id, event_type, xp_earned, module_id, description, created_at) VALUES
  ('user_3E8YL29cb3gD6KyeakuDuF2mnIw', 'module_completed', 100, 1, 'Launch Sequence completed', NOW() - INTERVAL '5 days');

COMMIT;