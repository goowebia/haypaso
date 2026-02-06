
import React from 'react';
import { Report } from '../types';
import { Clock, AlertTriangle, Cloud, Construction, ThumbsUp, XCircle, AlertCircle, Map, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { supabase, getUserId } from '../lib/supabase';

interface ReportCardProps {
  report: Report;
  onClick: (lat: number, lng: number) => void;
  onPhotoClick: (urls: string[]) => void;
}

const formatReportDate = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  
  if (isToday) return `Hoy, ${time}`;
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${d.toLocaleDateString('es-MX', options)}, ${time}`;
};

const ReportCard: React.FC<ReportCardProps> = ({ report, onClick, onPhotoClick }) => {
  // Manejar el caso donde foto_url sea un string JSON de un array o un string simple
  let photos: string[] = [];
  try {
    if (report.foto_url) {
      if (report.foto_url.startsWith('[')) {
        photos = JSON.parse(report.foto_url);
      } else {
        photos = [report.foto_url];
      }
    }
  } catch (e) {
    photos = report.foto_url ? [report.foto_url] : [];
  }

  const openNavigation = (e: React.MouseEvent, provider: 'waze' | 'google') => {
    e.stopPropagation();
    const { latitud, longitud } = report;
    const url = provider === 'waze' 
      ? `https://www.waze.com/ul?ll=${latitud},${longitud}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
    window.open(url, '_blank');
  };

  return (
    <div 
      onClick={() => onClick(report.latitud, report.longitud)}
      className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl mb-3 transition-all active:scale-[0.99] hover:bg-slate-800/60 cursor-pointer"
    >
      <div className="p-3 flex gap-4">
        {/* Galería / Miniatura */}
        <div className="shrink-0 relative">
          {photos.length > 0 ? (
            <div 
              onClick={(e) => { e.stopPropagation(); onPhotoClick(photos); }}
              className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner group relative"
            >
              <img src={photos[0]} alt="Reporte" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              {photos.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black flex items-center gap-1">
                  <ImageIcon size={10} /> +{photos.length - 1}
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ExternalLink size={16} className="text-white" />
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl bg-slate-900/50 border border-slate-700 flex flex-col items-center justify-center text-slate-600">
              <AlertCircle size={24} />
              <span className="text-[8px] font-black mt-1 uppercase">Sin fotos</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <h3 className={`font-black text-xs uppercase tracking-tight truncate pr-2 ${
                report.tipo === 'Accidente Pesado' ? 'text-red-500' : 'text-yellow-400'
              }`}>
                {report.tipo}
              </h3>
              <span className="shrink-0 text-[10px] text-slate-500 font-bold">
                {formatReportDate(report.created_at)}
              </span>
            </div>
            
            <p className="text-slate-200 text-[11px] mt-1 line-clamp-2 leading-tight font-bold">
              {report.descripcion}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
             <button 
                onClick={(e) => openNavigation(e, 'waze')}
                className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 active:bg-blue-500 active:text-white transition-colors"
              >
                <Map size={10} /> WAZE
              </button>
              <button 
                onClick={(e) => openNavigation(e, 'google')}
                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 active:bg-emerald-500 active:text-white transition-colors"
              >
                <ExternalLink size={10} /> GOOGLE MAPS
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
