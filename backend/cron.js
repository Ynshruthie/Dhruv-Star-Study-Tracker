const cron = require('node-cron');
const { supabase } = require('./db');

const parseImageUrls = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'null' || trimmed === '[]') return [];
    if (trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed); } catch (e) {}
    }
    return [trimmed];
  }
  return [];
};

const extractFilePathFromUrl = (url) => {
  try {
    const normalizedUrl = String(url).trim();
    if (!normalizedUrl) return null;

    const bucketStr = '/storage/v1/object/public/study-photos/';
    const idx = normalizedUrl.indexOf(bucketStr);
    if (idx !== -1) {
      return normalizedUrl.substring(idx + bucketStr.length).split('?')[0];
    }

    const legacyBucketStr = '/study-photos/';
    const legacyIdx = normalizedUrl.indexOf(legacyBucketStr);
    if (legacyIdx !== -1) {
      return normalizedUrl.substring(legacyIdx + legacyBucketStr.length).split('?')[0];
    }
  } catch (e) {
    console.error('Error extracting path from URL:', url);
  }
  return null;
};

const cleanupExpiredStudyImages = async () => {
  console.log('Running 48-hour photo cleanup cron job...');

  try {
    const thresholdDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: oldRecords, error: fetchError } = await supabase
      .from('study_hours')
      .select('id, image_url, created_at')
      .lt('created_at', thresholdDate);

    if (fetchError) {
      console.error('Error fetching old records for cleanup:', fetchError);
      return;
    }

    if (!oldRecords || oldRecords.length === 0) {
      console.log('No old photos to clean up.');
      return;
    }

    const filesToDelete = [];
    const recordIdsToClear = [];

    for (const record of oldRecords) {
      const urls = parseImageUrls(record.image_url);
      if (urls.length === 0) continue;

      for (const url of urls) {
        const path = extractFilePathFromUrl(url);
        if (path) filesToDelete.push(path);
      }

      recordIdsToClear.push(record.id);
    }

    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('study-photos')
        .remove(filesToDelete);

      if (deleteError) {
        console.error('Error deleting files from Storage:', deleteError);
      } else {
        console.log(`Successfully deleted ${filesToDelete.length} files from Storage.`);
      }
    }

    if (recordIdsToClear.length > 0) {
      const { error: updateError } = await supabase
        .from('study_hours')
        .update({ image_url: '[]' })
        .in('id', recordIdsToClear);

      if (updateError) {
        console.error('Error clearing image URLs in DB:', updateError);
      } else {
        console.log(`Successfully cleared image URLs for ${recordIdsToClear.length} records.`);
      }
    }
  } catch (err) {
    console.error('Failed to run cleanup cron job:', err);
  }
};

cron.schedule('0 * * * *', cleanupExpiredStudyImages);

console.log('Cron job for 48-hour image cleanup initialized.');
