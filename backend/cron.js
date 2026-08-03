const cron = require('node-cron');
const { supabase } = require('./db');

const parseImageUrls = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return [raw];
};

const extractFilePathFromUrl = (url) => {
  // Supabase public URL format:
  // https://[PROJECT_REF].supabase.co/storage/v1/object/public/study-photos/[STUDENT_ID]/[FILENAME]
  try {
    const bucketStr = '/study-photos/';
    const idx = url.indexOf(bucketStr);
    if (idx !== -1) {
      return url.substring(idx + bucketStr.length);
    }
  } catch (e) {
    console.error('Error extracting path from URL:', url);
  }
  return null;
};

// This cron job runs every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running 48-hour photo cleanup cron job...');
  try {
    // Calculate the timestamp for 48 hours ago
    const thresholdDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Fetch study hours that are older than 48 hours and still have image URLs
    const { data: oldRecords, error: fetchError } = await supabase
      .from('study_hours')
      .select('id, image_url, created_at')
      .lt('created_at', thresholdDate)
      .neq('image_url', '[]')
      .neq('image_url', 'null');

    if (fetchError) {
      console.error('Error fetching old records for cleanup:', fetchError);
      return;
    }

    if (!oldRecords || oldRecords.length === 0) {
      console.log('No old photos to clean up.');
      return;
    }

    let filesToDelete = [];
    let recordIdsToClear = [];

    for (const record of oldRecords) {
      const urls = parseImageUrls(record.image_url);
      if (urls.length > 0) {
        urls.forEach(url => {
          const path = extractFilePathFromUrl(url);
          if (path) filesToDelete.push(path);
        });
        recordIdsToClear.push(record.id);
      }
    }

    // If there are files to delete, delete them from Supabase Storage
    if (filesToDelete.length > 0) {
      const { data, error: deleteError } = await supabase.storage
        .from('study-photos')
        .remove(filesToDelete);

      if (deleteError) {
        console.error('Error deleting files from Storage:', deleteError);
      } else {
        console.log(`Successfully deleted ${filesToDelete.length} files from Storage.`);
      }
    }

    // Update the DB records to clear the image_urls so we don't try to delete them again
    // and so the UI knows they are gone
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
});

console.log('Cron job for 48-hour image cleanup initialized.');
