const express = require('express');
const upload = require('../middleware/upload');
const { supabase } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const getTodayDateString = (customDate) => {
  if (customDate) return customDate;
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseImageUrls = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return [raw];
};

// Helper function to upload file buffer to Supabase Storage
const uploadToSupabase = async (student_id, file) => {
  const fileExt = file.originalname.split('.').pop() || 'jpg';
  const fileName = `${student_id}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('study-photos')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload image to storage');
  }

  const { data: urlData } = supabase.storage
    .from('study-photos')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

// GET /api/study/today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const date = getTodayDateString(req.query.date);

    const { data: submission } = await supabase
      .from('study_submissions')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .single();
    
    let hours = [];
    if (submission) {
      const { data } = await supabase
        .from('study_hours')
        .select('*')
        .eq('submission_id', submission.id)
        .order('hour_number', { ascending: true });
      if (data) hours = data;
    } else {
      const { data } = await supabase
        .from('study_hours')
        .select('*')
        .eq('student_id', student_id)
        .eq('date', date)
        .order('hour_number', { ascending: true });
      if (data) hours = data;
    }

    const formattedHours = hours.map(h => {
      const urls = parseImageUrls(h.image_url);
      return {
        ...h,
        image_urls: urls,
        image_url: urls[0] || ''
      };
    });

    res.json({
      date,
      isSubmitted: !!submission,
      submission: submission || null,
      hours: formattedHours
    });
  } catch (err) {
    console.error('Error fetching today study tracker:', err);
    res.status(500).json({ error: 'Failed to fetch study tracker data' });
  }
});

// POST /api/study/submit
router.post('/submit', authenticateToken, upload.fields([
  { name: 'image_1', maxCount: 25 },
  { name: 'image_2', maxCount: 25 },
  { name: 'image_3', maxCount: 25 },
  { name: 'image_4', maxCount: 25 }
]), async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const date = getTodayDateString(req.body.date);

    // Check if already submitted today
    const { data: existingSubmission } = await supabase
      .from('study_submissions')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .single();

    if (existingSubmission) {
      return res.status(400).json({ error: 'You have already submitted your 4-hour study tracker for today.' });
    }

    // Verify attendance has been marked
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .single();

    if (!attendance || attendance.status !== 'PRESENT') {
      return res.status(400).json({ error: 'You must mark morning attendance before submitting your study tracker.' });
    }

    // Parse items for 4 compulsory hours
    const hoursData = [];
    for (let h = 1; h <= 4; h++) {
      const subject = req.body[`subject_${h}`];
      const time_slot = req.body[`time_slot_${h}`];
      const fileArr = req.files ? req.files[`image_${h}`] : null;

      if (!subject || !subject.trim()) {
        return res.status(400).json({ error: `Subject for Hour ${h} is required.` });
      }
      if (!time_slot || !time_slot.trim()) {
        return res.status(400).json({ error: `Study time for Hour ${h} is required.` });
      }
      if (!fileArr || fileArr.length === 0) {
        return res.status(400).json({ error: `Upload at least one image proof for Hour ${h}.` });
      }

      // Upload files to Supabase Storage
      const uploadedUrls = [];
      for (const file of fileArr) {
        const publicUrl = await uploadToSupabase(student_id, file);
        uploadedUrls.push(publicUrl);
      }

      const storedImageValue = JSON.stringify(uploadedUrls);

      hoursData.push({
        hour_number: h,
        subject: subject.trim(),
        time_slot: time_slot.trim(),
        image_url: storedImageValue
      });
    }

    // Create main submission
    const { data: submissionData, error: subErr } = await supabase
      .from('study_submissions')
      .insert({ student_id, date, status: 'COMPLETED' })
      .select()
      .single();

    if (subErr) throw subErr;
    const submissionId = submissionData.id;

    // Insert 4 hour entries
    for (const hData of hoursData) {
      const { error: hErr } = await supabase
        .from('study_hours')
        .insert({
          submission_id: submissionId,
          student_id,
          date,
          hour_number: hData.hour_number,
          subject: hData.subject,
          time_slot: hData.time_slot,
          image_url: hData.image_url
        });
      if (hErr) throw hErr;
    }

    const { data: savedHours } = await supabase
      .from('study_hours')
      .select('*')
      .eq('submission_id', submissionId)
      .order('hour_number', { ascending: true });

    const formattedSavedHours = (savedHours || []).map(h => {
      const urls = parseImageUrls(h.image_url);
      return {
        ...h,
        image_urls: urls,
        image_url: urls[0] || ''
      };
    });

    res.json({
      message: 'All 4 study hours successfully submitted for today!',
      submission_id: submissionId,
      date,
      hours: formattedSavedHours
    });
  } catch (err) {
    console.error('Error submitting study hours:', err);
    res.status(500).json({ error: 'Failed to submit study tracker. ' + (err.message || '') });
  }
});

module.exports = router;
