-- Supabase Schema Migration

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mentor TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS mentor TEXT;

-- Store a mentor as a user login ID. The application additionally verifies
-- that this ID belongs to a teacher before assigning it to a student.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_mentor_user_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_mentor_user_id_fkey
      FOREIGN KEY (mentor) REFERENCES users(student_id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_mentor_idx ON users(mentor);

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
-- Policies live in Supabase's shared storage schema, so they can remain even
-- after this app's tables are deleted. Drop them first to keep this script
-- safe to run repeatedly.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'study-photos');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'study-photos');
