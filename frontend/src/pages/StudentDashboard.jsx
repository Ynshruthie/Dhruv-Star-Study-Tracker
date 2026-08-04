import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import ImageModal from '../components/ImageModal';
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Save,
  TimerReset,
  Upload,
  Users,
  XCircle
} from 'lucide-react';

const SUBJECT_OPTIONS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Social',
  'Kannada',
  'Hindi',
  'English',
  'Self Study',
  'Notes Completion',
  'Project',
  'Exam Preparation'
];

const DEFAULT_SLOTS = [
  { subject: 'Mathematics', planned_start: '05:30', planned_end: '06:30', manager_type: 'SELF' },
  { subject: 'Science', planned_start: '06:30', planned_end: '07:30', manager_type: 'SELF' },
  { subject: 'English', planned_start: '20:00', planned_end: '21:00', manager_type: 'PARENT' },
  { subject: 'Physics', planned_start: '21:00', planned_end: '22:00', manager_type: 'SELF' }
];

const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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

const getDefaultScheduleDate = () => {
  const today = new Date();
  const candidate = new Date(today);

  while (!isAllowedScheduleDate(formatDateForInput(candidate))) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return formatDateForInput(candidate);
};

const buildFormSlots = () => DEFAULT_SLOTS.map((slot) => ({ ...slot }));

const buildEmptyHours = () => [1, 2, 3, 4].map((hourNumber) => ({
  hour_number: hourNumber,
  subject: '',
  scheduled_time_slot: '',
  active_time_slot: '',
  attendance_status: 'UNSCHEDULED',
  manager_type: 'SELF',
  mark_button_enabled: false,
  upload_window_open: false,
  image_urls: [],
  photo_count: 0
}));

const statusStyles = {
  PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ABSENT: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PARENT: 'bg-violet-50 text-violet-700 border-violet-200',
  UNSCHEDULED: 'bg-slate-100 text-slate-600 border-slate-200'
};

const statusLabels = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  PENDING: 'Waiting',
  PARENT: 'Parent',
  UNSCHEDULED: 'Not Scheduled'
};

export const StudentDashboard = () => {
  const { user, simulatedTime } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(getDefaultScheduleDate);
  const [date, setDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [hours, setHours] = useState(buildEmptyHours);
  const [formSlots, setFormSlots] = useState(buildFormSlots);
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [markingHour, setMarkingHour] = useState(null);
  const [uploadingHour, setUploadingHour] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchSlots = async (requestedDate = selectedDate) => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get(`/study/today?date=${requestedDate}`);
      const nextHours = buildEmptyHours();
      const nextFormSlots = buildFormSlots();

      (data.hours || []).forEach((hour) => {
        nextHours[hour.hour_number - 1] = hour;
        nextFormSlots[hour.hour_number - 1] = {
          subject: hour.subject || nextFormSlots[hour.hour_number - 1].subject,
          planned_start: hour.planned_start || nextFormSlots[hour.hour_number - 1].planned_start,
          planned_end: hour.planned_end || nextFormSlots[hour.hour_number - 1].planned_end,
          manager_type: hour.manager_type || nextFormSlots[hour.hour_number - 1].manager_type
        };
      });

      setHours(nextHours);
      setFormSlots(nextFormSlots);
      setDate(data.date);
      setCurrentTime(data.current_time_label);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
      setError('Failed to load today’s student slots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, simulatedTime]);

  const scheduledCount = useMemo(
    () => hours.filter((hour) => hour.attendance_status !== 'UNSCHEDULED').length,
    [hours]
  );

  const selfCount = useMemo(
    () => formSlots.filter((slot) => slot.manager_type === 'SELF').length,
    [formSlots]
  );

  const parentCount = 4 - selfCount;

  const updateFormSlot = (index, field, value) => {
    setFormSlots((prev) => prev.map((slot, idx) => (
      idx === index ? { ...slot, [field]: value } : slot
    )));
    setMessage('');
    setError('');
  };

  const handleSaveSchedule = async (event) => {
    event.preventDefault();
    setSavingSchedule(true);
    setMessage('');
    setError('');

    try {
      await api.post('/study/schedule', { date: selectedDate, slots: formSlots });
      setMessage(`Student schedule saved for ${selectedDate}. Self slots stay in this dashboard, and Parent slots are now visible in the Parent Dashboard.`);
      await fetchSlots(selectedDate);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save the selected schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleMarkPresent = async (hourNumber) => {
    setMarkingHour(hourNumber);
    setMessage('');
    setError('');

    try {
      const { data } = await api.post(`/study/slots/${hourNumber}/mark`, {});
      setMessage(`Slot ${hourNumber} started. Active study time is now ${data.hour.active_time_slot}.`);
      await fetchSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark this slot.');
    } finally {
      setMarkingHour(null);
    }
  };

  const handleUpload = async (hourNumber, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploadingHour(hourNumber);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const { data } = await api.post(`/study/slots/${hourNumber}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage(`Uploaded ${data.hour.photo_count} photo${data.hour.photo_count > 1 ? 's' : ''} for Slot ${hourNumber}.`);
      await fetchSlots();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload photos.');
    } finally {
      setUploadingHour(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="clean-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Dhruv Star Academy • Student Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Students Lead the Day for <span className="text-blue-600">{user?.name}</span>
          </h1>
          <p className="text-sm text-slate-500">
            Create all 4 slots here, choose whether each slot is handled by you or by a parent, and use attendance tracking only for Self-managed slots.
          </p>
        </div>

        <div className="text-right text-sm text-slate-500">
          <div className="flex items-center justify-end gap-2">
            <label htmlFor="student-schedule-date" className="font-medium text-slate-600">Schedule Date:</label>
            <input
              id="student-schedule-date"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                if (!isAllowedScheduleDate(nextDate)) {
                  setError('Schedules can only be created for Monday to Saturday. Sunday is reserved for review.');
                  return;
                }
                setSelectedDate(nextDate);
                setError('');
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>Current Time: <span className="font-mono font-semibold text-blue-700">{currentTime}</span></div>
          <div>Scheduled Slots: <span className="font-mono font-semibold text-slate-900">{scheduledCount} / 4</span></div>
        </div>
      </div>

      {(error || message) && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
          error
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {error ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
          <span>{error || message}</span>
        </div>
      )}

      <form onSubmit={handleSaveSchedule} className="space-y-6">
        <div className="clean-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Your 4 Slots</h2>
              <p className="text-sm text-slate-500">
                Use Monday to Saturday for the weekly plan. Sunday is reserved for review and is not available for new scheduling. `Self` means the student must click present in time. `Parent` means the slot moves to the Parent Dashboard for uploading anytime.
              </p>
            </div>

            <div className="flex gap-3 text-xs font-semibold">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Self: {selfCount}</span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Parent: {parentCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formSlots.map((slot, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 p-5 space-y-4 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                      S{index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Slot {index + 1}</div>
                      <div className="text-xs text-slate-500">Choose subject, time and owner</div>
                    </div>
                  </div>

                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    slot.manager_type === 'SELF'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {slot.manager_type === 'SELF' ? 'Student Handles' : 'Parent Handles'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Subject</label>
                  <select
                    value={slot.subject}
                    onChange={(event) => updateFormSlot(index, 'subject', event.target.value)}
                    className="w-full corporate-select text-sm"
                  >
                    {SUBJECT_OPTIONS.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Start Time</label>
                    <input
                      type="time"
                      value={slot.planned_start}
                      onChange={(event) => updateFormSlot(index, 'planned_start', event.target.value)}
                      className="w-full corporate-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">End Time</label>
                    <input
                      type="time"
                      value={slot.planned_end}
                      onChange={(event) => updateFormSlot(index, 'planned_end', event.target.value)}
                      className="w-full corporate-input text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Who Will Handle This Slot?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateFormSlot(index, 'manager_type', 'SELF')}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        slot.manager_type === 'SELF'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Self</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateFormSlot(index, 'manager_type', 'PARENT')}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        slot.manager_type === 'PARENT'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Parent</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              Save once after choosing all 4 slots. Parent slots will appear in the Parent Dashboard immediately.
            </div>

            <button
              type="submit"
              disabled={savingSchedule}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{savingSchedule ? 'Saving Slots...' : 'Save 4 Slots'}</span>
            </button>
          </div>
        </div>
      </form>

      <div className="clean-card p-6 space-y-2">
        <div className="flex items-center gap-2 text-slate-900">
          <CalendarClock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold">Live Slot Tracking</h2>
        </div>
        <p className="text-sm text-slate-500">
          Self slots stay here for attendance and timed uploads. Parent slots are visible here for reference but are completed from the Parent Dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hours.map((hour) => {
          const unscheduled = hour.attendance_status === 'UNSCHEDULED';
          const isSelfManaged = hour.manager_type !== 'PARENT';
          const canUpload = hour.upload_window_open && isSelfManaged;

          return (
            <div key={hour.hour_number} className="clean-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {hour.hour_number}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {hour.subject || `Slot ${hour.hour_number}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {unscheduled ? 'Schedule this slot above first' : hour.scheduled_time_slot}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    hour.manager_type === 'PARENT'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {hour.manager_type === 'PARENT' ? 'Parent' : 'Self'}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[hour.attendance_status] || statusStyles.PENDING}`}>
                    {statusLabels[hour.attendance_status] || hour.attendance_status}
                  </span>
                </div>
              </div>

              {hour.active_time_slot && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Active Slot: <span className="font-mono font-bold">{hour.active_time_slot}</span>
                </div>
              )}

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-slate-400" />
                  <span>Scheduled Window: <span className="font-mono text-slate-900">{hour.scheduled_time_slot || '--'}</span></span>
                </div>

                <div className="flex items-center gap-2">
                  <TimerReset className="w-4 h-4 text-slate-400" />
                  <span>Attendance Clicked At: <span className="font-mono text-slate-900">{hour.attendance_marked_at || '--'}</span></span>
                </div>

                <div className="flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-slate-400" />
                  <span>Uploaded Photos: <span className="font-mono text-slate-900">{hour.photo_count || 0}</span></span>
                </div>
              </div>

              {!unscheduled && !isSelfManaged && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  This is a Parent slot. It has been sent to the Parent Dashboard, and parents can upload photos there anytime.
                </div>
              )}

              {!unscheduled && isSelfManaged && hour.attendance_status === 'PRESENT' && canUpload && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                  Student upload is open only during the active slot time shown above.
                </div>
              )}

              {!unscheduled && isSelfManaged && hour.attendance_status === 'ABSENT' && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                  This Self slot closed before attendance was marked, so it is absent.
                </div>
              )}

              {isSelfManaged ? (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    disabled={!hour.mark_button_enabled || markingHour === hour.hour_number || unscheduled}
                    onClick={() => handleMarkPresent(hour.hour_number)}
                    className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition ${
                      hour.mark_button_enabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {markingHour === hour.hour_number ? 'Starting Slot...' : 'Mark Present'}
                  </button>

                  <label className={`w-full border-2 border-dashed rounded-xl px-4 py-4 flex flex-col items-center justify-center gap-2 text-center transition ${
                    canUpload
                      ? 'border-blue-300 bg-blue-50/60 hover:bg-blue-50 cursor-pointer'
                      : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}>
                    <Upload className="w-5 h-5" />
                    <span className="text-sm font-semibold">
                      {uploadingHour === hour.hour_number ? 'Uploading...' : 'Upload Slot Photos'}
                    </span>
                    <span className="text-xs">
                      {canUpload ? 'Upload only during the active slot time.' : 'Self uploads unlock only after present is marked in time.'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={!canUpload || uploadingHour === hour.hour_number}
                      onChange={(event) => handleUpload(hour.hour_number, event.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Student actions are disabled for this slot because the parent is responsible for uploading the proof.
                </div>
              )}

              {hour.image_urls?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded Proofs</div>
                  <div className="flex flex-wrap gap-2">
                    {hour.image_urls.map((imageUrl, index) => (
                      <button
                        type="button"
                        key={`${hour.hour_number}-${index}`}
                        onClick={() => setSelectedImage(hour)}
                        className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:border-blue-400 transition"
                      >
                        <img src={imageUrl} alt={`Slot ${hour.hour_number} proof ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        hourData={selectedImage}
        studentName={user?.name}
      />
    </div>
  );
};

export default StudentDashboard;
