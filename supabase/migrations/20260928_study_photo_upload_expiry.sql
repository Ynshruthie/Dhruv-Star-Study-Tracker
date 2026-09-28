CREATE TABLE IF NOT EXISTS public.study_photo_uploads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  object_path TEXT NOT NULL UNIQUE,
  study_hour_id INTEGER NOT NULL REFERENCES public.study_hours(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS study_photo_uploads_expiry_idx
  ON public.study_photo_uploads (uploaded_at);

ALTER TABLE public.study_photo_uploads ENABLE ROW LEVEL SECURITY;

INSERT INTO public.study_photo_uploads (object_path, study_hour_id, uploaded_at)
SELECT objects.name, hours.id, objects.created_at
FROM storage.objects AS objects
JOIN public.study_hours AS hours
  ON position(objects.name IN hours.image_url) > 0
WHERE objects.bucket_id = 'study-photos'
ON CONFLICT (object_path) DO NOTHING;

NOTIFY pgrst, 'reload schema';