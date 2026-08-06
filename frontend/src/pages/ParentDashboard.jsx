import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import ImageModal from '../components/ImageModal';
import { AlertCircle, CalendarClock, CheckCircle2, Clock3, ImagePlus, Upload, Users } from 'lucide-react';

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const getReviewWeekStart = () => {
  const today = new Date();
  const monday = new Date(today);
  const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;
  monday.setDate(today.getDate() - offset);
  return formatDate(monday);
};

export const ParentDashboard = () => {
  const { user, simulatedTime } = useContext(AuthContext);
  const [date, setDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingHour, setUploadingHour] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [week, setWeek] = useState({ dates: [], by_date: {} });
  const [weekStart] = useState(getReviewWeekStart);

  const fetchSlots = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/study/today');
      setHours((data.hours || []).filter((hour) => hour.manager_type === 'PARENT'));
      setDate(data.date);
      setCurrentTime(data.current_time_label);
    } catch (err) {
      console.error('Failed to load parent dashboard:', err);
      setError('Failed to load parent-managed slots.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyStudy = async () => {
    try {
      const { data } = await api.get(`/study/week?week_start=${weekStart}`);
      setWeek({ dates: data.dates || [], by_date: data.by_date || {} });
    } catch (err) {
      console.error('Failed to load weekly study summary:', err);
      setError('Failed to load the weekly study summary.');
    }
  };

  useEffect(() => {
    fetchSlots();
    fetchWeeklyStudy();
  }, [simulatedTime]);

  const totalPhotos = useMemo(
    () => hours.reduce((sum, hour) => sum + (hour.photo_count || 0), 0),
    [hours]
  );

  const handleUpload = async (hourNumber, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploadingHour(hourNumber);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const { data } = await api.post(`/study/slots/${hourNumber}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage(`Parent uploaded ${data.hour.photo_count} photo${data.hour.photo_count > 1 ? 's' : ''} for Slot ${hourNumber}.`);
      await fetchSlots();
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
            Only slots marked as `Parent` in the Student Dashboard appear here. Parents can upload photos anytime for these slots.
          </p>
        </div>

        <div className="text-right text-sm text-slate-500">
          <div>Date: <span className="font-mono font-semibold text-slate-900">{date}</span></div>
          <div>Current Time: <span className="font-mono font-semibold text-blue-700">{currentTime}</span></div>
          <div>Parent Slots: <span className="font-mono font-semibold text-slate-900">{hours.length}</span></div>
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
            <h2 className="text-lg font-bold text-slate-900">This Week&apos;s Study Plan &amp; Progress</h2>
            <p className="text-sm text-slate-500">What your child studied from Monday through Saturday, including uploaded proof.</p>
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
          <span>No parent-managed slots yet. Students need to choose `Parent` for a slot in the Student Dashboard first.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hours.map((hour) => (
            <div key={hour.hour_number} className="clean-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                    {hour.hour_number}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{hour.subject}</div>
                    <div className="text-xs text-slate-500">{hour.scheduled_time_slot}</div>
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

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Parent-managed slots do not use timed attendance. Photos can be uploaded here at any time.
              </div>

              <label className="w-full border-2 border-dashed border-amber-300 bg-amber-50/60 hover:bg-amber-50 rounded-xl px-4 py-4 flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer">
                <Upload className="w-5 h-5 text-amber-700" />
                <span className="text-sm font-semibold text-amber-800">
                  {uploadingHour === hour.hour_number ? 'Uploading...' : 'Upload Parent Photos'}
                </span>
                <span className="text-xs text-amber-700">
                  Upload anytime for this slot. The 48-hour cleanup still applies after upload.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingHour === hour.hour_number}
                  onChange={(event) => handleUpload(hour.hour_number, event.target.files)}
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
                        key={`${hour.hour_number}-${index}`}
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
          ))}
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
