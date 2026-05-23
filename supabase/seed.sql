-- Seed 10 curriculum modules (idempotent) — aligned with 002_foundation_prd_schema
INSERT INTO public.modules (
  id,
  title,
  description,
  mission_layer,
  badge_name,
  required_hardware,
  sort_order
) VALUES
  (1, 'Launch Sequence', 'Orientation, safety oath, and tool-kit mastery.', 'THINK', 'Initiated Builder', ARRAY['Safety Kit'], 1),
  (2, 'Wiring Bay', 'AI thinking, WHAT+STYLE+DETAILS, and first prompts.', 'THINK', 'Prompt Engineer', ARRAY['Chat Workstation'], 2),
  (3, 'Servo Calibration', 'Idea-to-object pipeline and Meshy walkthrough.', 'DESIGN', 'First Builder', ARRAY['Bambu A1 Mini'], 3),
  (4, 'First Movement', 'Robot anatomy: ESP32-S3, PCA9685, MG996R servos.', 'DESIGN', 'Mechanics Explorer', ARRAY['ESP32-S3', 'PCA9685', 'MG996R'], 4),
  (5, 'Pick & Place', 'Mission concepts, 180mm boundary, manufacturable design.', 'DESIGN', 'Robot Designer', ARRAY['Bambu A1 Mini', 'Calipers'], 5),
  (6, 'Sensor Dock', 'Print queue system, pre-flight checks, quality inspection.', 'BUILD', 'Fabrication Operator', ARRAY['Bambu A1 Mini'], 6),
  (7, 'AI Prompt Lab', 'Base frame assembly, servo alignment, symmetry checks.', 'BUILD', 'Assembler Level 1', ARRAY['MG996R', 'Servo Horn Kit'], 7),
  (8, '3D Forge', 'Upper arm, four-bar linkage, wrist, parallel gripper.', 'BUILD', 'Assembler Level 2', ARRAY['MG996R', 'Linkage Kit'], 8),
  (9, 'Mission Challenge', 'Sequential motion code, calibration, debugging.', 'OPERATE', 'Robot Commander', ARRAY['ESP32-S3', '5V/10A PSU'], 9),
  (10, 'Graduation Flight', 'Showcase checklist, demo, Certified KONTRAKTOR graduation.', 'OPERATE', 'Certified Kontraktor', ARRAY['Demo Stage Kit'], 10)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  mission_layer = EXCLUDED.mission_layer,
  badge_name = EXCLUDED.badge_name,
  required_hardware = EXCLUDED.required_hardware,
  sort_order = EXCLUDED.sort_order;
