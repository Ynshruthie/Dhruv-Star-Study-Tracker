-- Supabase Schema Migration

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT')),
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- 3. Study Submissions Table
CREATE TABLE IF NOT EXISTS study_submissions (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  UNIQUE(student_id, date)
);

-- 4. Study Hours Table
CREATE TABLE IF NOT EXISTS study_hours (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES study_submissions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  hour_number INTEGER NOT NULL CHECK(hour_number IN (1, 2, 3, 4)),
  subject TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date, hour_number)
);

-- 5. Storage Buckets (Run this if you haven't created the bucket yet)
-- Note: You might need to create the bucket 'study-photos' manually via the Supabase Dashboard UI if this fails.
INSERT INTO storage.buckets (id, name, public) VALUES ('study-photos', 'study-photos', true) ON CONFLICT DO NOTHING;

-- Allow public access to the bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'study-photos');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'study-photos');
