-- Add student submission types used by the mission submit flow
ALTER TYPE public.submission_type ADD VALUE IF NOT EXISTS 'code';
ALTER TYPE public.submission_type ADD VALUE IF NOT EXISTS 'stl';

-- Optional storage bucket for STL / image uploads (API uses service role upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mission-submissions',
  'mission-submissions',
  false,
  52428800,
  ARRAY[
    'model/stl',
    'application/sla',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;
