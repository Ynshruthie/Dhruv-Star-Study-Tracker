import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContextDefinition';
import { ShieldCheck, GraduationCap, ArrowRight, AlertCircle, UserPlus, LogIn, CheckCircle, KeyRound } from 'lucide-react';
import api from '../utils/api';

export const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('student');
  const [mode, setMode] = useState('login'); // 'login', 'signup', or 'forgot' (teacher-only)
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupTeacherId, setSignupTeacherId] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupInviteCode, setSignupInviteCode] = useState('');
  const [resetTeacherId, setResetTeacherId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetInviteCode, setResetInviteCode] = useState('');

  const switchTab = (tab) => {
    setActiveTab(tab);
    setMode('login');
    setStudentId('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  const switchTeacherMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
  };

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (signupPassword !== signupConfirmPassword) {
      return setError('Passwords do not match.');
    }
    if (signupPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/teacher-signup', {
        name: signupName,
        teacher_id: signupTeacherId,
        password: signupPassword,
        invite_code: signupInviteCode
      });

      // Auto-login after signup
      localStorage.setItem('dhruv_token', data.token);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (resetPassword !== resetConfirmPassword) {
      return setError('Passwords do not match.');
    }
    if (resetPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/teacher-forgot-password', {
        teacher_id: resetTeacherId,
        password: resetPassword,
        invite_code: resetInviteCode
      });
      localStorage.setItem('dhruv_token', data.token);
      localStorage.setItem('dhruv_user', JSON.stringify(data.user));
      window.location.reload();
    } catch (err) {
      const serverMessage = err.response?.data?.error;
      const statusMessage = err.response?.status
        ? `Password reset is unavailable (server returned ${err.response.status}). Restart the backend and try again.`
        : 'The backend could not be reached. Please confirm it is running.';
      setError(serverMessage || statusMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-105px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-md">

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-md mb-4 overflow-hidden">
              <img src="/logo.png" alt="Dhruv Star Academy Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Dhruv Star Study Tracker
            </h2>
            <p className="text-slate-500 text-sm mt-1.5">
              Daily Attendance &amp; Self-Study Portal
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => switchTab('student')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </button>

            <button
              type="button"
              onClick={() => switchTab('teacher')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Teacher
            </button>
          </div>

          {/* Teacher: Login / Signup sub-toggle */}
          {activeTab === 'teacher' && (
            <div className="grid grid-cols-3 gap-1 mb-5 p-1 bg-amber-50 border border-amber-200 rounded-lg">
              <button
                type="button"
                onClick={() => switchTeacherMode('login')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  mode === 'login' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchTeacherMode('signup')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  mode === 'signup' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create Account
              </button>
              <button
                type="button"
                onClick={() => switchTeacherMode('forgot')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  mode === 'forgot' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Reset Password
              </button>
            </div>
          )}

          {/* Error / Success Messages */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* ── SIGN IN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {activeTab === 'student' ? 'Student ID' : 'Teacher ID'}
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  placeholder={activeTab === 'student' ? 'e.g. STU001' : 'e.g. DSAT01'}
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full h-11 rounded-lg font-semibold text-sm text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── TEACHER SIGN UP FORM ── */}
          {mode === 'signup' && activeTab === 'teacher' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Dhruvan M"
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teacher ID</label>
                <input
                  type="text"
                  required
                  value={signupTeacherId}
                  onChange={(e) => setSignupTeacherId(e.target.value.toUpperCase())}
                  placeholder="e.g. DSAT01"
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Invite Code
                  <span className="ml-1.5 text-xs font-normal text-slate-400">(provided by your administrator)</span>
                </label>
                <input
                  type="password"
                  required
                  value={signupInviteCode}
                  onChange={(e) => setSignupInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg font-semibold text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Teacher Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'forgot' && activeTab === 'teacher' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-slate-500">Use your administrator-provided invite code to set a new teacher password.</p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teacher ID</label>
                <input type="text" required value={resetTeacherId} onChange={(e) => setResetTeacherId(e.target.value.toUpperCase())} placeholder="e.g. DSAT01" className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                <input type="password" required value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Min. 6 characters" className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                <input type="password" required value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Invite Code</label>
                <input type="password" required value={resetInviteCode} onChange={(e) => setResetInviteCode(e.target.value)} placeholder="Enter invite code" className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition" />
              </div>
              <button type="submit" disabled={loading} className="w-full h-11 rounded-lg font-semibold text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><KeyRound className="w-4 h-4" /><span>Reset Password</span></>}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
