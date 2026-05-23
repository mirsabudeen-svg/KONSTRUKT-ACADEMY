-- Seed 10 curriculum modules (idempotent)
INSERT INTO modules (id, title, description, badge_name, sort_order) VALUES
  (1, 'Launch Sequence', 'Meet your robot arm, safety checks, and first power-on.', 'Ignition Cadet', 1),
  (2, 'Wiring Bay', 'Connect ESP32-S3 and PCA9685 — learn your ship''s nervous system.', 'Wire Weaver', 2),
  (3, 'Servo Calibration', 'Tune MG996R joints one at a time. Remember: sequential motion only!', 'Joint Jockey', 3),
  (4, 'First Movement', 'Write your first Arduino sketch with safe delay() between servos.', 'Motion Pilot', 4),
  (5, 'Pick & Place', 'Program a grab-and-drop routine for academy cargo.', 'Cargo Captain', 5),
  (6, 'Sensor Dock', 'Add inputs and react to the environment like a real rover.', 'Sensor Scout', 6),
  (7, 'AI Prompt Lab', 'Master WHAT + STYLE + DETAILS for better code generation.', 'Prompt Ensign', 7),
  (8, '3D Forge', 'Design a printable part and submit to the Bambu print queue.', 'Forge Apprentice', 8),
  (9, 'Mission Challenge', 'Combine code, sensors, and prints into one capstone build.', 'Challenge Chief', 9),
  (10, 'Graduation Flight', 'Present your arm to trainers and earn the KONSTRUKT badge.', 'Star Engineer', 10)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  badge_name = EXCLUDED.badge_name,
  sort_order = EXCLUDED.sort_order;
