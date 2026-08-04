const express = require('express');
const upload = require('../middleware/upload');
const { supabase } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const MAX_IMAGES_PER_SLOT = 25;

const getTodayDateString = (customDate) => {
  if (customDate) return customDate;
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isAllowedScheduleDate = (dateString) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);
  const weekday = parsedDate.getDay();

  return weekday >= 1 && weekday <= 6;
};

const getClockContext = (simulatedTime) => {
  if (simulatedTime && typeof simulatedTime === 'string' && simulatedTime.includes(':')) {
    const [hourStr, minuteStr] = simulatedTime.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    return {
      hour,
      minute,
      totalMinutes: (hour * 60) + minute,
      hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    };
  }

  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    totalMinutes: (now.getHours() * 60) + now.getMinutes(),
    hhmm: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  };
};

const minutesToHHMM = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const hhmmToMinutes = (value) => {
  if (!value || typeof value !== 'string' || !value.includes(':')) return null;
  const [hourStr, minuteStr] = value.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return (hour * 60) + minute;
};

const formatHHMM = (value) => {
  const minutes = hhmmToMinutes(value);
  if (minutes == null) return value || '';

  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const buildTimeRangeLabel = (start, end) => `${formatHHMM(start)} - ${formatHHMM(end)}`;

const parseStoredHourPayload = (raw, fallbackTimeSlot = '') => {
  const basePayload = {
    images: [],
    managerType: 'SELF',
    attendanceStatus: 'PENDING',
    attendanceMarkedAt: null,
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    actualEnd: null
  };

  if (!raw) {
    return { ...basePayload };
  }

  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      return {
        ...basePayload,
        ...parsed,
        images: Array.isArray(parsed.images) ? parsed.images : []
      };
    } catch (error) {
      return { ...basePayload };
    }
  }

  if (Array.isArray(raw)) {
    return { ...basePayload, images: raw };
  }

  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return {
        ...basePayload,
        images: Array.isArray(parsed) ? parsed : []
      };
    } catch (error) {
      return { ...basePayload };
    }
  }

  if (typeof raw === 'string') {
    return { ...basePayload, images: [raw] };
  }

  return { ...basePayload };
};

const serializeHourPayload = (payload) => JSON.stringify({
  images: Array.isArray(payload.images) ? payload.images : [],
  managerType: payload.managerType || 'SELF',
  attendanceStatus: payload.attendanceStatus || 'PENDING',
  attendanceMarkedAt: payload.attendanceMarkedAt || null,
  plannedStart: payload.plannedStart || null,
  plannedEnd: payload.plannedEnd || null,
  actualStart: payload.actualStart || null,
  actualEnd: payload.actualEnd || null
});

const deriveSlotState = (hourRow, currentMinutes) => {
  const payload = parseStoredHourPayload(hourRow.image_url, hourRow.time_slot);
  const managerType = payload.managerType || 'SELF';
  const plannedStartMinutes = hhmmToMinutes(payload.plannedStart);
  const plannedEndMinutes = hhmmToMinutes(payload.plannedEnd);
  const actualStartMinutes = hhmmToMinutes(payload.actualStart);
  const actualEndMinutes = hhmmToMinutes(payload.actualEnd);

  let attendanceStatus = payload.attendanceStatus || 'PENDING';

  if (
    managerType === 'SELF' &&
    attendanceStatus === 'PENDING' &&
    plannedEndMinutes != null &&
    currentMinutes >= plannedEndMinutes
  ) {
    attendanceStatus = 'ABSENT';
  }

  const markButtonEnabled = (
    managerType === 'SELF' &&
    attendanceStatus === 'PENDING' &&
    plannedStartMinutes != null &&
    plannedEndMinutes != null &&
    currentMinutes >= plannedStartMinutes &&
    currentMinutes < plannedEndMinutes
  );

  const uploadWindowOpen = managerType === 'PARENT'
    ? true
    : (
      attendanceStatus === 'PRESENT' &&
      actualStartMinutes != null &&
      actualEndMinutes != null &&
      currentMinutes >= actualStartMinutes &&
      currentMinutes < actualEndMinutes
    );

  return {
    payload: {
      ...payload,
      managerType,
      attendanceStatus
    },
    plannedLabel: payload.plannedStart && payload.plannedEnd
      ? buildTimeRangeLabel(payload.plannedStart, payload.plannedEnd)
      : hourRow.time_slot || '',
    activeLabel: payload.actualStart && payload.actualEnd
      ? buildTimeRangeLabel(payload.actualStart, payload.actualEnd)
      : null,
    images: payload.images || [],
    managerType,
    attendanceStatus,
    markButtonEnabled,
    uploadWindowOpen,
    plannedStartMinutes,
    plannedEndMinutes,
    actualStartMinutes,
    actualEndMinutes
  };
};

const uploadToSupabase = async (studentId, file) => {
  const fileExt = file.originalname.split('.').pop() || 'jpg';
  const fileName = `${studentId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;

  const { error } = await supabase.storage
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

const formatHourResponse = (hourRow, currentMinutes) => {
  const derived = deriveSlotState(hourRow, currentMinutes);

  return {
    id: hourRow.id,
    hour_number: hourRow.hour_number,
    subject: hourRow.subject,
    manager_type: derived.managerType,
    time_slot: derived.activeLabel || derived.plannedLabel,
    scheduled_time_slot: derived.plannedLabel,
    active_time_slot: derived.activeLabel,
    attendance_status: derived.attendanceStatus,
    attendance_marked_at: derived.payload.attendanceMarkedAt,
    planned_start: derived.payload.plannedStart,
    planned_end: derived.payload.plannedEnd,
    actual_start: derived.payload.actualStart,
    actual_end: derived.payload.actualEnd,
    mark_button_enabled: derived.markButtonEnabled,
    upload_window_open: derived.uploadWindowOpen,
    requires_student_attendance: derived.managerType === 'SELF',
    image_urls: derived.images,
    image_url: derived.images[0] || '',
    photo_count: derived.images.length,
    created_at: hourRow.created_at
  };
};

// GET /api/study/today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const date = getTodayDateString(req.query.date);
    const simTime = req.headers['x-simulated-time'] || req.query.simulated_time;
    const clock = getClockContext(simTime);

    const { data: hours, error } = await supabase
      .from('study_hours')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .order('hour_number', { ascending: true });

    if (error) throw error;

    const formattedHours = (hours || []).map((hour) => formatHourResponse(hour, clock.totalMinutes));

    res.json({
      date,
      current_time: clock.hhmm,
      current_time_label: formatHHMM(clock.hhmm),
      scheduledCount: formattedHours.length,
      hours: formattedHours
    });
  } catch (err) {
    console.error('Error fetching today study tracker:', err);
    res.status(500).json({ error: 'Failed to fetch study tracker data' });
  }
});

// POST /api/study/schedule
router.post('/schedule', authenticateToken, async (req, res) => {
  try {
    const isTeacher = req.user && req.user.role === 'teacher';
    const student_id = isTeacher && req.body.student_id ? req.body.student_id : req.user.student_id;
    const date = getTodayDateString(req.body.date);
    const slots = Array.isArray(req.body.slots) ? req.body.slots : [];

    if (!isAllowedScheduleDate(date)) {
      return res.status(400).json({
        error: 'Schedules can only be created for Monday to Saturday. Sunday is reserved for review.'
      });
    }

    if (slots.length !== 4) {
      return res.status(400).json({ error: 'Exactly 4 study slots are required.' });
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('study_hours')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date);

    if (existingError) throw existingError;

    const existingMap = new Map((existingRows || []).map((row) => [row.hour_number, row]));

    const rowsToUpsert = slots.map((slot, index) => {
      const hour_number = index + 1;
      const subject = (slot.subject || '').trim();
      const plannedStart = slot.planned_start;
      const plannedEnd = slot.planned_end;
      const managerType = String(slot.manager_type || 'SELF').toUpperCase();
      const plannedStartMinutes = hhmmToMinutes(plannedStart);
      const plannedEndMinutes = hhmmToMinutes(plannedEnd);

      if (!subject) {
        throw new Error(`Subject for Slot ${hour_number} is required.`);
      }
      if (!['SELF', 'PARENT'].includes(managerType)) {
        throw new Error(`Choose Self or Parent for Slot ${hour_number}.`);
      }
      if (plannedStartMinutes == null || plannedEndMinutes == null) {
        throw new Error(`Valid start and end time are required for Slot ${hour_number}.`);
      }
      if (plannedEndMinutes <= plannedStartMinutes) {
        throw new Error(`End time must be later than start time for Slot ${hour_number}.`);
      }

      const existingRow = existingMap.get(hour_number);
      const existingPayload = existingRow ? parseStoredHourPayload(existingRow.image_url) : null;
      const existingMatchesIncoming = existingRow && (
        existingRow.subject === subject &&
        (existingPayload?.managerType || 'SELF') === managerType &&
        existingPayload?.plannedStart === plannedStart &&
        existingPayload?.plannedEnd === plannedEnd
      );

      if (
        existingPayload &&
        (
          existingPayload.attendanceStatus === 'PRESENT' ||
          (Array.isArray(existingPayload.images) && existingPayload.images.length > 0)
        )
      ) {
        if (!existingMatchesIncoming && !isTeacher) {
          throw new Error(`Slot ${hour_number} is already active or has uploaded proof, so it cannot be rescheduled.`);
        }

        if (!existingMatchesIncoming && isTeacher) {
          return {
            student_id,
            date,
            hour_number,
            subject,
            time_slot: buildTimeRangeLabel(plannedStart, plannedEnd),
            image_url: serializeHourPayload({
              images: [],
              managerType,
              attendanceStatus: managerType === 'PARENT' ? 'PARENT' : 'PENDING',
              attendanceMarkedAt: null,
              plannedStart,
              plannedEnd,
              actualStart: null,
              actualEnd: null
            })
          };
        }

        return {
          student_id,
          date,
          hour_number,
          subject: existingRow.subject,
          time_slot: existingRow.time_slot,
          image_url: existingRow.image_url
        };
      }

      return {
        student_id,
        date,
        hour_number,
        subject,
        time_slot: buildTimeRangeLabel(plannedStart, plannedEnd),
        image_url: serializeHourPayload({
          images: existingPayload?.images || [],
          managerType,
          attendanceStatus: managerType === 'PARENT' ? 'PARENT' : 'PENDING',
          attendanceMarkedAt: null,
          plannedStart,
          plannedEnd,
          actualStart: null,
          actualEnd: null
        })
      };
    });

    const { error: upsertError } = await supabase
      .from('study_hours')
      .upsert(rowsToUpsert, { onConflict: 'student_id,date,hour_number' });

    if (upsertError) throw upsertError;

    const { data: savedRows, error: fetchError } = await supabase
      .from('study_hours')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .order('hour_number', { ascending: true });

    if (fetchError) throw fetchError;

    res.json({
      message: 'Student schedule saved successfully.',
      date,
      hours: (savedRows || []).map((hour) => formatHourResponse(hour, -1))
    });
  } catch (err) {
    console.error('Error saving study schedule:', err);
    res.status(500).json({ error: err.message || 'Failed to save study schedule.' });
  }
});

// POST /api/study/slots/:hourNumber/mark
router.post('/slots/:hourNumber/mark', authenticateToken, async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const date = getTodayDateString(req.body.date);
    const hour_number = parseInt(req.params.hourNumber, 10);
    const simTime = req.headers['x-simulated-time'] || req.body.simulated_time;
    const clock = getClockContext(simTime);

    if (![1, 2, 3, 4].includes(hour_number)) {
      return res.status(400).json({ error: 'Invalid slot number.' });
    }

    const { data: hourRow, error } = await supabase
      .from('study_hours')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .eq('hour_number', hour_number)
      .single();

    if (error || !hourRow) {
      return res.status(404).json({ error: 'This study slot has not been scheduled yet.' });
    }

    const derived = deriveSlotState(hourRow, clock.totalMinutes);

    if (derived.managerType !== 'SELF') {
      return res.status(400).json({ error: 'Only Self-managed slots use the attendance button.' });
    }

    if (derived.attendanceStatus === 'PRESENT') {
      return res.status(400).json({ error: 'Attendance has already been marked for this slot.' });
    }

    if (!derived.markButtonEnabled) {
      return res.status(400).json({
        error: `Attendance can only be marked between ${derived.plannedLabel}.`,
        attendance_status: derived.attendanceStatus
      });
    }

    const actualStart = clock.hhmm;
    const actualEnd = minutesToHHMM(clock.totalMinutes + 60);
    const displayTime = formatHHMM(actualStart);

    const updatedPayload = {
      ...derived.payload,
      attendanceStatus: 'PRESENT',
      attendanceMarkedAt: displayTime,
      actualStart,
      actualEnd
    };

    const updatedTimeSlot = buildTimeRangeLabel(actualStart, actualEnd);

    const { data: updatedRow, error: updateError } = await supabase
      .from('study_hours')
      .update({
        time_slot: updatedTimeSlot,
        image_url: serializeHourPayload(updatedPayload)
      })
      .eq('id', hourRow.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json({
      message: 'Slot attendance marked successfully.',
      hour: formatHourResponse(updatedRow, clock.totalMinutes)
    });
  } catch (err) {
    console.error('Error marking slot attendance:', err);
    res.status(500).json({ error: err.message || 'Failed to mark slot attendance.' });
  }
});

// POST /api/study/slots/:hourNumber/upload
router.post('/slots/:hourNumber/upload', authenticateToken, upload.array('images', MAX_IMAGES_PER_SLOT), async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const date = getTodayDateString(req.body.date);
    const hour_number = parseInt(req.params.hourNumber, 10);
    const simTime = req.headers['x-simulated-time'] || req.body.simulated_time;
    const clock = getClockContext(simTime);

    if (![1, 2, 3, 4].includes(hour_number)) {
      return res.status(400).json({ error: 'Invalid slot number.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one image.' });
    }

    const { data: hourRow, error } = await supabase
      .from('study_hours')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .eq('hour_number', hour_number)
      .single();

    if (error || !hourRow) {
      return res.status(404).json({ error: 'This study slot has not been scheduled yet.' });
    }

    const derived = deriveSlotState(hourRow, clock.totalMinutes);

    if (derived.managerType === 'SELF') {
      if (derived.attendanceStatus !== 'PRESENT') {
        return res.status(400).json({ error: 'You must mark present for this slot before uploading proof.' });
      }

      if (!derived.uploadWindowOpen) {
        return res.status(400).json({
          error: `Photo upload is only allowed during the active slot time ${derived.activeLabel || derived.plannedLabel}.`
        });
      }
    }

    if ((derived.images.length + req.files.length) > MAX_IMAGES_PER_SLOT) {
      return res.status(400).json({ error: `You can upload up to ${MAX_IMAGES_PER_SLOT} photos for one slot.` });
    }

    const uploadedUrls = [];
    for (const file of req.files) {
      const publicUrl = await uploadToSupabase(student_id, file);
      uploadedUrls.push(publicUrl);
    }

    const updatedPayload = {
      ...derived.payload,
      images: [...derived.images, ...uploadedUrls]
    };

    const { data: updatedRow, error: updateError } = await supabase
      .from('study_hours')
      .update({
        image_url: serializeHourPayload(updatedPayload)
      })
      .eq('id', hourRow.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json({
      message: 'Photos uploaded successfully.',
      hour: formatHourResponse(updatedRow, clock.totalMinutes)
    });
  } catch (err) {
    console.error('Error uploading slot images:', err);
    res.status(500).json({ error: err.message || 'Failed to upload slot images.' });
  }
});

module.exports = router;
