
import React from 'react';
import { Report } from '../types';
import { Clock, AlertTriangle, Cloud, Construction, ThumbsUp, XCircle, AlertCircle } from 'lucide-react';
import { supabase, getUserId } from '../lib/supabase';

interface ReportCardProps {
  report: Report;
  onClick: (lat: number, lng: number) => void;
}

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now.getTime() - past.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  
  if (diffInMins < 1) return 'Ahora';
  if (diffInMins < 60) return `${diffInMins}m`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  return past.toLocaleDateString();
};

const ReportIcon = ({ type, size = 16 }: { type: string, size?: number }) => {
  switch (type) {
    case 'Accidente Pesado': return <AlertTriangle className="text-red-500" size={size} />;
    case 'Obras': return <Construction className="text-orange-500" size={size} />;
    case 'Tráfico Lento': return <Clock className="text-yellow-400" size={size} />;
    case 'Clima': return <Cloud className="text-blue-500" size={size} />;
    default: return <AlertCircle className="text-slate-400" size={size} />;
  }
};

const ReportCard: React.FC<ReportCardProps> = ({ report, onClick }) => {
  const handleVote = async (e: React.MouseEvent, voto: 'sigue' | 'despejado') => {
    e.stopPropagation();
    const { error } = await supabase
      .from('validaciones')
      .insert({
        reporte_id: report.id,
        voto,
        usuario_id: getUserId()
      });
    if (error) console.error('Error al votar:', error);
  };

  return (
    <div 
      onClick={() => onClick(report.latitud, report.longitud)}
      className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl mb-3 transition-all active:scale-[0.98] hover:bg-slate-800/60 cursor-pointer"
    >
      <div className="p-3 flex gap-4">
        {/* Miniatura a la izquierda */}
        <div className="shrink-0">
          {report.foto_url ? (
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner">
              <img 
                src={report.foto_url} 
                alt="Miniatura" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-slate-900/50 border border-slate-700 flex flex-col items-center justify-center text-yellow-400">
              <AlertCircle size={28} />
              <span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Sin evidencia</span>
            </div>
          )}
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-black text-yellow-400 text-xs uppercase leading-none tracking-tight truncate pr-2">
                {report.tipo}
              </h3>
              <span className="shrink-0 text-[9px] text-slate-500 font-black uppercase">
                {formatTimeAgo(report.created_at)}
              </span>
            </div>
            
            <p className="text-slate-200 text-[11px] mt-1.5 line-clamp-2 leading-relaxed font-bold tracking-tight">
              {report.descripcion}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-700/30">
            <div className="flex gap-4">
              <button 
                onClick={(e) => handleVote(e, 'sigue')}
                className="flex items-center gap-1 text-[8px] font-black text-slate-400 hover:text-yellow-400 transition-colors uppercase"
              >
                <ThumbsUp size={12} /> Confirmar
              </button>
              <button 
                onClick={(e) => handleVote(e, 'despejado')}
                className="flex items-center gap-1 text-[8px] font-black text-slate-400 hover:text-emerald-400 transition-colors uppercase"
              >
                <XCircle size={12} /> Despejado
              </button>
            </div>
            <ReportIcon type={report.tipo} size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
