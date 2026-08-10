import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContextDefinition';
import api from '../utils/api';
import ImageModal from '../components/ImageModal';
import { AlertCircle, CalendarClock, CheckCircle2, Clock3, ImagePlus, Upload, Users } from 'lucide-react';

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatLiveTime = (timestamp) => new Date(timestamp).toLocaleTimeString('en-US', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
});
const formatHHMM = (time) => {
  const [hour = 0, minute = 0] = String(time || '').split(':').map(Number);
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const timeToMinutes = (time) => {
  if (!time || !time.includes(':')) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return Number.isNaN(hours) || Number.isNaN(minutes) ? null : (hours * 60) + minutes;
};
const getParentUploadState = (hour, now) => {
  const today = formatDate(now);
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
  const endMinutes = timeToMinutes(hour.planned_end);
  if (hour.date !== today) {
    return { isOpen: false, message: `Available after this slot ends on ${new Date(`${hour.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.` };
  }
  if (endMinutes == null || currentMinutes < endMinutes) {
    return { isOpen: false, message: `Available after the planned end time: ${hour.scheduled_time_slot.split(' - ').at(-1) || hour.planned_end}.` };
  }
  return { isOpen: true, message: 'Upload is open for the rest of this scheduled day.' };
};
const getBookedWeekStart = () => {
  const today = new Date();
  const monday = new Date(today);
  // Student booking always targets the upcoming Monday–Saturday week.
  // Use the same dates here so this family's parent view shows that student's
  // saved slots as soon as they are booked.
  monday.setDate(today.getDate() + (today.getDay() === 0 ? 1 : (8 - today.getDay()) % 7));
  return formatDate(monday);
};

export const ParentDashboard = () => {
  const { user, simulatedTime } = useContext(AuthContext);
  const [date, setDate] = useState('');
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingHour, setUploadingHour] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [week, setWeek] = useState({ dates: [], by_date: {} });
  const [weekStart] = useState(getBookedWeekStart);
  const [now, setNow] = useState(() => new Date());

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/study/today');
      setDate(data.date);
    } catch (err) {
      console.error('Failed to load parent dashboard:', err);
      setError('Failed to load parent-managed slots.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeeklyStudy = useCallback(async () => {
    try {
      const { data } = await api.get(`/study/week?week_start=${weekStart}`);
      const byDate = data.by_date || {};
      setWeek({ dates: data.dates || [], by_date: byDate });
      setHours((data.dates || []).flatMap((slotDate) =>
        (byDate[slotDate] || [])
          .filter((hour) => hour.manager_type === 'PARENT')
          .map((hour) => ({ ...hour, date: slotDate }))
      ));
    } catch (err) {
      console.error('Failed to load weekly study summary:', err);
      setError('Failed to load the weekly study summary.');
    }
  }, [weekStart]);

  useEffect(() => {
    fetchSlots();
    fetchWeeklyStudy();
  }, [fetchSlots, fetchWeeklyStudy, simulatedTime]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentTime = simulatedTime
    ? `${formatHHMM(simulatedTime)} (Simulated)`
    : formatLiveTime(now);

  const totalPhotos = useMemo(
    () => hours.reduce((sum, hour) => sum + (hour.photo_count || 0), 0),
    [hours]
  );
  const scheduledParentSlots = useMemo(
    () => Object.values(week.by_date)
      .flat()
      .filter((hour) => hour.manager_type === 'PARENT'),
    [week]
  );

  const handleUpload = async (hourNumber, slotDate, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const slotKey = `${slotDate}-${hourNumber}`;
    setUploadingHour(slotKey);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      formData.append('date', slotDate);

      const { data } = await api.post(`/study/slots/${hourNumber}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage(`Parent uploaded ${data.hour.photo_count} photo${data.hour.photo_count > 1 ? 's' : ''} for the ${slotDate} Slot ${hourNumber}.`);
      await fetchWeeklyStudy();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload parent photos.');
    } finally {
      setUploadingHour(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="clean-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            <Users className="w-3.5 h-3.5" />
            <span>Dhruv Star Academy • Parent Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Parent Upload Space for <span className="text-amber-600">{user?.name}</span>
          </h1>
          <p className="text-sm text-slate-500">
            Parent-managed slots become available here on their scheduled date. The upcoming week below shows every slot your child assigned to a parent.
          </p>
        </div>

        <div className="w-full text-left text-sm text-slate-500 sm:w-auto sm:text-right">
          <div>Date: <span className="font-mono font-semibold text-slate-900">{date}</span></div>
          <div>Current Time: <span className="font-mono font-semibold text-blue-700">{currentTime}</span></div>
          <div>Parent Slots This Week: <span className="font-mono font-semibold text-slate-900">{hours.length}</span></div>
          <div>Scheduled This Week: <span className="font-mono font-semibold text-slate-900">{scheduledParentSlots.length}</span></div>
          <div>Total Photos: <span className="font-mono font-semibold text-slate-900">{totalPhotos}</span></div>
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

      <section className="clean-card overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Booked Study Plan &amp; Progress</h2>
            <p className="text-sm text-slate-500">Your child&apos;s saved Monday–Saturday slots and their uploaded proof.</p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600">Week of {weekStart}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-6 py-3">Day</th><th className="px-6 py-3">Subjects &amp; Slots</th><th className="px-6 py-3">Proof</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {week.dates.map((day) => {
                const daySlots = week.by_date[day] || [];
                const photoCount = daySlots.reduce((count, slot) => count + (slot.photo_count || 0), 0);
                return (
                  <tr key={day}>
                    <td className="px-6 py-4 align-top font-medium text-slate-900">{new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td className="px-6 py-4">
                      {daySlots.length ? <div className="flex flex-wrap gap-2">{daySlots.map((slot) => <span key={slot.hour_number} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"><strong>#{slot.hour_number}</strong> {slot.subject} <span className="text-slate-400">{slot.manager_type === 'PARENT' ? 'Parent' : 'Self'}</span></span>)}</div> : <span className="text-slate-400">No slots booked</span>}
                    </td>
                    <td className="px-6 py-4 align-top text-slate-700">{daySlots.length ? `${photoCount} photo${photoCount === 1 ? '' : 's'} uploaded` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {hours.length === 0 ? (
        <div className="clean-card p-6 text-sm text-slate-600 flex items-center gap-3">
          <CalendarClock className="w-5 h-5 text-slate-400" />
          <span>No parent-managed slots are booked for this student&apos;s upcoming week.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hours.map((hour) => {
            const uploadState = getParentUploadState(hour, now);
            const slotKey = `${hour.date}-${hour.hour_number}`;
            return (
            <div key={`${hour.date}-${hour.hour_number}`} className="clean-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                    {hour.hour_number}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{hour.subject}</div>
                    <div className="text-xs text-slate-500">{new Date(`${hour.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {hour.scheduled_time_slot}</div>
                  </div>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  Parent Slot
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-slate-400" />
                  <span>Planned Timing: <span className="font-mono text-slate-900">{hour.scheduled_time_slot}</span></span>
                </div>

                <div className="flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-slate-400" />
                  <span>Uploaded Photos: <span className="font-mono text-slate-900">{hour.photo_count || 0}</span></span>
                </div>
              </div>

              <div className={`rounded-xl border px-4 py-3 text-xs ${uploadState.isOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {uploadState.isOpen ? 'Parent-managed slot is ready for proof upload. ' : 'Parent proof is locked until the scheduled session ends. '}{uploadState.message}
              </div>

              <label className={`w-full border-2 border-dashed rounded-xl px-4 py-4 flex flex-col items-center justify-center gap-2 text-center transition ${uploadState.isOpen ? 'border-amber-300 bg-amber-50/60 hover:bg-amber-50 cursor-pointer' : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'}`}>
                <Upload className="w-5 h-5 text-amber-700" />
                <span className="text-sm font-semibold text-amber-800">
                  {uploadingHour === slotKey ? 'Uploading...' : uploadState.isOpen ? 'Upload Parent Photos' : 'Upload Locked'}
                </span>
                <span className="text-xs text-amber-700">
                  {uploadState.isOpen ? 'Upload anytime until the end of today. The 48-hour cleanup applies after upload.' : uploadState.message}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!uploadState.isOpen || uploadingHour === slotKey}
                  onChange={(event) => handleUpload(hour.hour_number, hour.date, event.target.files)}
                  className="hidden"
                />
              </label>

              {hour.image_urls?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded Proofs</div>
                  <div className="flex flex-wrap gap-2">
                    {hour.image_urls.map((imageUrl, index) => (
                      <button
                        type="button"
                        key={`${hour.date}-${hour.hour_number}-${index}`}
                        onClick={() => setSelectedImage(hour)}
                        className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:border-amber-400 transition"
                      >
                        <img src={imageUrl} alt={`Parent slot ${hour.hour_number} proof ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        hourData={selectedImage}
        studentName={user?.name}
      />
    </div>
  );
};

export default ParentDashboard;
