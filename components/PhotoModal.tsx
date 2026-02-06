
import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoModalProps {
  photos: string[];
  onClose: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({ photos, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20"
      >
        <X size={28} />
      </button>

      <div className="relative w-full max-w-4xl h-full flex items-center justify-center group">
        <img 
          src={photos[currentIndex]} 
          alt="Evidencia" 
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />

        {photos.length > 1 && (
          <>
            <button 
              onClick={prev}
              className="absolute left-2 p-4 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={32} />
            </button>
            <button 
              onClick={next}
              className="absolute right-2 p-4 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={32} />
            </button>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
              {photos.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-yellow-400 w-6' : 'bg-white/30'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 text-white/60 text-xs font-black uppercase tracking-widest">
        Foto {currentIndex + 1} de {photos.length}
      </div>
    </div>
  );
};

export default PhotoModal;
