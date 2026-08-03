import React from 'react';
import { X, ExternalLink, BookOpen, Clock, Calendar, CheckCircle } from 'lucide-react';

export const ImageModal = ({ isOpen, onClose, hourData, studentName }) => {
  if (!isOpen || !hourData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              H{hourData.hour_number}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{hourData.subject}</span>
                <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                  <CheckCircle className="w-3 h-3" /> Verified Work
                </span>
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                {studentName && <span className="text-indigo-300 font-medium">{studentName}</span>}
                {studentName && <span>•</span>}
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> {hourData.time_slot}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Image Content */}
        <div className="p-4 sm:p-6 bg-slate-950/50 flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
          {hourData.image_url ? (
            <img
              src={hourData.image_url}
              alt={`Hour ${hourData.hour_number} ${hourData.subject}`}
              className="max-h-[65vh] w-auto object-contain rounded-xl border border-slate-800 shadow-xl"
            />
          ) : (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>No image proof uploaded for this study hour</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Uploaded: {hourData.created_at ? new Date(hourData.created_at).toLocaleString() : 'Today'}
          </span>

          {hourData.image_url && (
            <a
              href={hourData.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 rounded-lg transition flex items-center gap-1.5 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Full Resolution
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
