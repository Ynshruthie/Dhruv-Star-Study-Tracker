CREATE TABLE IF NOT EXISTS teacher_acknowledgements (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  reaction TEXT NOT NULL DEFAULT 'THUMBS_UP',
  comment TEXT,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);
