import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Clock, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export const TimeBanner = () => {
  const { simulatedTime, setSimulatedTime } = useContext(AuthContext);

  return (
    <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border-b border-indigo-500/20 px-4 py-2 text-xs sm:text-sm text-slate-300 flex flex-wrap items-center justify-between gap-3 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${simulatedTime ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${simulatedTime ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
        </span>
        <div className="flex items-center gap-1.5 font-medium text-slate-200">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>Attendance Rule: <strong className="text-amber-300 font-semibold">4:30 AM – 5:30 AM</strong></span>
        </div>
        {simulatedTime && (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            SIMULATING: {simulatedTime} AM
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-400 text-xs hidden md:inline">Test Window:</span>
        <button
          onClick={() => setSimulatedTime('05:00')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition ${
            simulatedTime === '05:00'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          ⏰ Set 05:00 AM (Open)
        </button>
        <button
          onClick={() => setSimulatedTime('06:00')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition ${
            simulatedTime === '06:00'
              ? 'bg-rose-600 text-white shadow-sm shadow-rose-900'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          🚫 Set 06:00 AM (Closed)
        </button>
        {simulatedTime && (
          <button
            onClick={() => setSimulatedTime(null)}
            className="px-2.5 py-1 rounded text-xs font-medium bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Use Live System Clock
          </button>
        )}
      </div>
    </div>
  );
};

export default TimeBanner;
