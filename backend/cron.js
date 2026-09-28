const cron = require('node-cron');
const { supabase } = require('./db');

const PHOTO_RETENTION_MS = 48 * 60 * 60 * 1000;

const parsePayload = (raw) => {
  if (typeof raw !== 'string') return null;
  try {
    const payload = JSON.parse(raw);
    return payload && typeof payload === 'object' && Array.isArray(payload.images)
      ? payload
      : null;
  } catch {
    return null;
  }
};

const cleanupExpiredStudyImages = async () => {
  const cutoff = new Date(Date.now() - PHOTO_RETENTION_MS).toISOString();
  const { data: expired, error } = await supabase
    .from('study_photo_uploads')
    .select('id, object_path, study_hour_id')
    .lte('uploaded_at', cutoff)
    .order('uploaded_at')
    .limit(500);

  if (error) {
    console.error('Could not find expired study photos:', error.message);
    return;
  }
  if (!expired?.length) return;

  for (let offset = 0; offset < expired.length; offset += 100) {
    const batch = expired.slice(offset, offset + 100);
    const paths = batch.map((photo) => photo.object_path);
    const { error: storageError } = await supabase.storage
      .from('study-photos')
      .remove(paths);
    if (storageError) {
      console.error('Could not delete expired study photos:', storageError.message);
      continue;
    }

    const byHour = new Map();
    for (const photo of batch) {
      const hourPaths = byHour.get(photo.study_hour_id) || [];
      hourPaths.push(photo.object_path);
      byHour.set(photo.study_hour_id, hourPaths);
    }

    let databaseUpdated = true;
    for (const [hourId, hourPaths] of byHour) {
      const { data: row, error: readError } = await supabase
        .from('study_hours')
        .select('id, image_url')
        .eq('id', hourId)
        .maybeSingle();
      if (readError) {
        databaseUpdated = false;
        console.error('Could not read expired photo references:', readError.message);
        break;
      }
      if (!row) continue;
      const payload = parsePayload(row.image_url);
      if (!payload) continue;
      payload.images = payload.images.filter((image) =>
        !hourPaths.some((path) => image === path || String(image).includes(path))
      );
      const { error: updateError } = await supabase
        .from('study_hours')
        .update({ image_url: JSON.stringify(payload) })
        .eq('id', hourId);
      if (updateError) {
        databaseUpdated = false;
        console.error('Could not clear expired photo references:', updateError.message);
        break;
      }
    }

    if (!databaseUpdated) continue;
    const { error: metadataError } = await supabase
      .from('study_photo_uploads')
      .delete()
      .in('id', batch.map((photo) => photo.id));
    if (metadataError) {
      console.error('Could not clear expired photo metadata:', metadataError.message);
    } else {
      console.log(`Deleted ${batch.length} study photos older than 48 hours.`);
    }
  }
};

cron.schedule('* * * * *', cleanupExpiredStudyImages, { timezone: 'Asia/Kolkata' });