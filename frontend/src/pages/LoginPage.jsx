import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Star, ShieldCheck, GraduationCap, Lock, ArrowRight, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'teacher'
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(studentId, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please check your ID and Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (id, pass, role) => {
    setActiveTab(role);
    setStudentId(id);
    setPassword(pass);
    setError('');
    setLoading(true);
    try {
      await login(id, pass);
    } catch (err) {
      setError(err.response?.data?.error || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative Background Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-xl">
        {/* Main Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 border border-slate-800">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-purple-600 p-0.5 shadow-xl shadow-indigo-500/20 mb-4">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Dhruv Star Study Tracker
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Dhruv Star Academy • Daily Attendance &amp; Self-Study Portal
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setStudentId('');
                setPassword('');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                activeTab === 'student'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Portal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('teacher');
                setStudentId('TCH001');
                setPassword('admin123');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                activeTab === 'teacher'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Teacher Dashboard</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                {activeTab === 'student' ? 'Student ID' : 'Teacher ID'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  placeholder={activeTab === 'student' ? 'e.g. STU001' : 'e.g. TCH001'}
                  className="w-full corporate-input font-mono pl-10 uppercase"
                />
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full corporate-input pl-10"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 py-3 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'student'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-900/40'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-900/40'
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to {activeTab === 'student' ? 'Student Account' : 'Teacher Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Panel */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>⚡ Quick One-Click Demo Accounts</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-normal">Pre-loaded</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('STU001', 'password123', 'student')}
                className="text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">Rahul Sharma</span>
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded">4/4 Done</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">STU001 • Student</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('STU002', 'password123', 'student')}
                className="text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">Sneha Patel</span>
                  <span className="text-[10px] font-mono bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded">2/4 Pending</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">STU002 • Student</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('STU003', 'password123', 'student')}
                className="text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-rose-300">Arjun Verma</span>
                  <span className="text-[10px] font-mono bg-rose-950 text-rose-400 px-1.5 py-0.5 rounded">Absent</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">STU003 • Student</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('TCH001', 'admin123', 'teacher')}
                className="text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 group-hover:text-purple-200">Prof. Vikramaditya</span>
                  <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded">Teacher</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">TCH001 • Teacher Admin</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
