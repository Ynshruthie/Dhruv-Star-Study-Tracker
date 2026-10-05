CREATE TABLE IF NOT EXISTS booking_settings (
  id TEXT PRIMARY KEY CHECK (id = 'global'),
  booking_open BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO booking_settings (id, booking_open)
VALUES ('global', FALSE)
ON CONFLICT (id) DO NOTHING;
