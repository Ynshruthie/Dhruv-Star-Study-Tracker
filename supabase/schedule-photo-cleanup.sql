CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'study-photo-48-hour-cleanup';

SELECT cron.schedule(
  'study-photo-48-hour-cleanup',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://jumdofsyxjbukbqrjcqs.supabase.co/functions/v1/api/maintenance/cleanup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'photo_cleanup_bearer'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);