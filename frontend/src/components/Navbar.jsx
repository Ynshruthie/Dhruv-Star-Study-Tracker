import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContextDefinition';
import { LogOut, ShieldCheck, Clock, GraduationCap, RefreshCw } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, simulatedTime } = useContext(AuthContext);
  const [timeStr, setTimeStr] = useState('');
  const [reloading, setReloading] = useState(false);

  const handleReload = () => {
    setReloading(true);
    // This is a document reload, rather than a dashboard data refresh, so the
    // entire mobile app is restarted and fetches its latest application state.
    window.location.reload();
  };

  useEffect(() => {
    const updateTime = () => {
      if (simulatedTime) {
        setTimeStr(`${simulatedTime}:00 AM (Simulated)`);
      } else {
        const now = new Date();
        setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [simulatedTime]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-3 sm:px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Header */}
        <div className="min-w-0 flex flex-1 items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-0.5 shadow-sm shrink-0">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Dhruv Star Academy Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="whitespace-nowrap text-[11px] sm:text-lg font-bold text-slate-900 tracking-tight">
                DHRUV STAR <span className="text-blue-600 font-semibold">ACADEMY</span>
              </h1>
              <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Study Tracker
              </span>
            </div>
            <p className="text-[9px] leading-tight sm:text-xs text-slate-500">Daily Attendance &amp; Self-Study Monitoring System</p>
          </div>
        </div>

        {/* Live Digital Clock Widget */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-mono text-xs text-slate-700">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900">{timeStr}</span>
        </div>

        {/* User Info & Actions */}
        {user && (
          <div className="shrink-0 flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                {user.role === 'teacher' ? (
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-semibold text-slate-900">{user.name}</div>
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                  <span>{user.student_id}</span>
                  <span className="text-slate-300">•</span>
                  <span className="capitalize text-blue-600 font-medium">{user.role}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReload}
              disabled={reloading}
              aria-label="Reload app"
              title="Reload app"
              className="sm:hidden p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 border border-slate-200 rounded-lg transition flex items-center justify-center cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
