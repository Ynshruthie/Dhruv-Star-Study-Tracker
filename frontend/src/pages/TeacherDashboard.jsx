import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import ImageModal from '../components/ImageModal';
import { 
  Users, CheckCircle2, Clock, XCircle, Search, Filter, 
  Calendar, RefreshCw, Eye, BookOpen, AlertTriangle, FileText, Check, X, Camera
} from 'lucide-react';

export const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, SUBMITTED, PENDING, ABSENT
  const [activeModalHour, setActiveModalHour] = useState(null);
  const [activeModalStudent, setActiveModalStudent] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher/dashboard?date=${selectedDate}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch teacher dashboard data:', err);
    } font: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400">Loading teacher monitoring metrics...</span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || { totalStudents: 0, presentCount: 0, absentCount: 0, submittedCount: 0, pendingCount: 0 };
  const students = data?.students || [];

  // Filtering
  const filteredStudents = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          st.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'SUBMITTED') return st.overallStatus === 'Submitted';
    if (statusFilter === 'PENDING') return st.overallStatus === 'Pending';
    if (statusFilter === 'ABSENT') return st.overallStatus === 'Absent';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-950/60 border border-purple-500/30 px-3 py-1 rounded-full mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Dhruv Star Academy • Teacher Monitoring Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Daily Attendance &amp; 4-Hour Study Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Real-time tracking of student attendance (4:30–5:30 AM) and self-study work submissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-mono focus:outline-none"
            />
          </div>

          <button
            onClick={fetchDashboard}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition text-xs font-medium flex items-center gap-1.5 shadow"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Enrolled */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.totalStudents}</div>
          <div className="text-[11px] text-slate-500">Active Roster</div>
        </div>

        {/* Card 2: Attendance Present */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Attendance Marked</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300">{metrics.presentCount}</div>
          <div className="text-[11px] text-slate-400">4:30–5:30 AM Window</div>
        </div>

        {/* Card 3: 4/4 Hours Completed */}
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/20 space-y-1">
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <span>4/4 Study Submitted</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-300">{metrics.submittedCount}</div>
          <div className="text-[11px] text-slate-400">All 4 Proofs Attached</div>
        </div>

        {/* Card 4: Pending Hours */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span>Incomplete / Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">{metrics.pendingCount}</div>
          <div className="text-[11px] text-slate-400">&lt; 4 Hours Uploaded</div>
        </div>

        {/* Card 5: Missed Attendance / Absent */}
        <div className="glass-card rounded-2xl p-5 border border-rose-500/20 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <span>Missed Attendance</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-300">{metrics.absentCount}</div>
          <div className="text-[11px] text-rose-400/80">Marked Absent</div>
        </div>

      </div>

      {/* SEARCH AND FILTERS */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name or ID..."
            className="w-full corporate-input pl-10 text-xs sm:text-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">Filter:</span>
          {[
            { id: 'ALL', label: 'All Students' },
            { id: 'SUBMITTED', label: '✅ Submitted (4/4)' },
            { id: 'PENDING', label: '⏳ Pending (<4)' },
            { id: 'ABSENT', label: '❌ Absent' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                statusFilter === btn.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* STUDENT PROGRESS TABLE */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Student Name &amp; ID</th>
                <th className="py-4 px-6">Attendance (4:30-5:30 AM)</th>
                <th className="py-4 px-6 text-center">Hour 1</th>
                <th className="py-4 px-6 text-center">Hour 2</th>
                <th className="py-4 px-6 text-center">Hour 3</th>
                <th className="py-4 px-6 text-center">Hour 4</th>
                <th className="py-4 px-6 text-right">Overall Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No student records matching your filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isPresent = st.attendance.marked && st.attendance.status === 'PRESENT';

                  return (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Student Name & ID */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">{st.name}</div>
                        <div className="font-mono text-slate-400 text-xs">{st.student_id}</div>
                      </td>

                      {/* Attendance Column */}
                      <td className="py-4 px-6">
                        {isPresent ? (
                          <div className="space-y-1">
                            <StatusBadge status="PRESENT" type="attendance" size="small" />
                            <div className="text-[11px] text-slate-400 font-mono">
                              Marked: {st.attendance.time}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <StatusBadge status="ABSENT" type="attendance" size="small" />
                            <div className="text-[11px] text-rose-400/80">Missed window</div>
                          </div>
                        )}
                      </td>

                      {/* Hour 1 .. 4 Columns */}
                      {st.hours.map((h) => (
                        <td key={h.hour_number} className="py-4 px-6 text-center">
                          {h.completed ? (
                            <button
                              onClick={() => {
                                setActiveModalHour(h);
                                setActiveModalStudent(st.name);
                              }}
                              className="group inline-flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-900 hover:bg-indigo-950 border border-emerald-500/40 hover:border-indigo-500 transition cursor-pointer"
                              title={`View ${h.subject} proof`}
                            >
                              <span className="text-emerald-400 font-bold flex items-center gap-1 text-xs">
                                <Camera className="w-3.5 h-3.5" /> 📷 View
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]">
                                {h.subject}
                              </span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-950/40 border border-rose-500/20 text-rose-400 font-bold text-xs" title="Study hour not submitted">
                              ❌
                            </span>
                          )}
                        </td>
                      ))}

                      {/* Overall Status Badge */}
                      <td className="py-4 px-6 text-right">
                        <StatusBadge status={st.overallStatus} type="study" />
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox Viewer */}
      <ImageModal
        isOpen={!!activeModalHour}
        onClose={() => setActiveModalHour(null)}
        hourData={activeModalHour}
        studentName={activeModalStudent}
      />
    </div>
  );
};

export default TeacherDashboard;
