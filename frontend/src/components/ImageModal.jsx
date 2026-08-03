import React, { useState, useEffect } from 'react';
import { X, ExternalLink, BookOpen, Clock, Calendar, CheckCircle, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export const ImageModal = ({ isOpen, onClose, hourData, studentName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when modal opens or hourData changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [isOpen, hourData]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, hourData]);

  if (!isOpen || !hourData) return null;

  const images = hourData.image_urls || (hourData.image_url ? [hourData.image_url] : []);
  const hasImages = images.length > 0;
  const currentImage = images[currentIndex];

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shadow-sm">
              H{hourData.hour_number}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{hourData.subject}</span>
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Verified Work
                </span>
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                {studentName && <span className="text-blue-700 font-semibold">{studentName}</span>}
                {studentName && <span>•</span>}
                <span className="flex items-center gap-1 font-mono"><Clock className="w-3.5 h-3.5 text-slate-400" /> {hourData.time_slot}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Image Viewport */}
        <div className="relative flex-1 bg-slate-100/80 flex items-center justify-center overflow-hidden min-h-0 group">
          {hasImages ? (
            <>
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="absolute left-4 z-10 p-3 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-slate-700 shadow-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition hover:scale-105 cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={handleNext}
                    disabled={currentIndex === images.length - 1}
                    className="absolute right-4 z-10 p-3 rounded-full bg-white/90 backdrop-blur border border-slate-200 text-slate-700 shadow-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition hover:scale-105 cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image Counter Pill */}
              {images.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-slate-900/70 backdrop-blur-md text-white text-sm font-semibold rounded-full shadow-lg">
                  Photo {currentIndex + 1} of {images.length}
                </div>
              )}

              {/* Current Image */}
              <div className="w-full h-full p-4 flex items-center justify-center">
                <img
                  key={currentImage}
                  src={currentImage}
                  alt={`Hour ${hourData.hour_number} Proof ${currentIndex + 1}`}
                  className="max-h-full max-w-full object-contain rounded-xl border border-slate-300 shadow-lg bg-white animate-in fade-in zoom-in-95 duration-200"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500">No image proof uploaded for this study hour</p>
            </div>
          )}
        </div>

        {/* Thumbnail Strip (only if multiple images) */}
        {images.length > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 px-2 -mx-2 hide-scrollbar">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    currentIndex === idx 
                      ? 'border-blue-600 shadow-md scale-105' 
                      : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <img src={imgUrl} className="w-full h-full object-cover bg-white" alt={`Thumbnail ${idx + 1}`} />
                  {currentIndex === idx && (
                    <div className="absolute inset-0 bg-blue-600/10 pointer-events-none"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="flex items-center gap-1.5 font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-400" />
            Uploaded: {hourData.created_at ? new Date(hourData.created_at).toLocaleString() : 'Today'}
          </span>

          {hasImages && (
            <a
              href={currentImage}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 font-semibold text-sm shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              Open Original / Download
            </a>
          )}
        </div>

      </div>
    </div>
  );
};

export default ImageModal;
