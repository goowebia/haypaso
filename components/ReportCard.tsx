
import React from 'react';
import { Report } from '../types';
import { Clock, AlertTriangle } from 'lucide-react';
import { supabase, getUserId } from '../lib/supabase';

interface ReportCardProps {
  report: Report;
  onClick: (lat: number, lng: number) => void;
}

const formatTimeAgo = (dateString: string) => {
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diff < 1) return 'Ahora';
  if (diff < 60) return `${diff}m`;
  return `${Math.floor(diff/60)}h`;
};

const ReportCard: React.FC<ReportCardProps> = ({ report, onClick }) => {
  const handleVote = async (e: React.MouseEvent, voto: 'sigue' | 'despejado') => {
    e.stopPropagation();
    await supabase.from('validaciones').insert({
      reporte_id: report.id,
      voto,
      usuario_id: getUserId()
    });
  };

  return (
    <div 
      onClick={() => onClick(report.latitud, report.longitud)}
      className="bg-slate-800 border border-slate-700 rounded-3xl p-5 mb-4 active:scale-[0.98] transition-transform cursor-pointer shadow-lg"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400/10 p-1.5 rounded-lg border border-yellow-400/20">
            <AlertTriangle size={16} className="text-yellow-400" />
          </div>
          <h3 className="font-black text-white text-[11px] uppercase tracking-tight">{report.tipo}</h3>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
          <Clock size={10} />
          {formatTimeAgo(report.created_at)}
        </div>
      </div>

      <p className="text-slate-300 text-[11px] font-medium leading-relaxed mb-4">
        {report.descripcion || 'Sin descripción adicional.'}
      </p>

      {/* Grid de Fotos */}
      {report.fotos && report.fotos.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {report.fotos.map((foto, idx) => (
            <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
              <img src={foto} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 mt-2 border-t border-slate-700/50 pt-4">
        <button 
          onClick={(e) => handleVote(e, 'sigue')}
          className="flex-1 bg-slate-700/50 hover:bg-yellow-400/10 hover:text-yellow-400 text-[10px] font-black text-slate-400 py-2.5 rounded-xl uppercase tracking-tighter transition-colors border border-transparent hover:border-yellow-400/30"
        >
          Sigue ahí ({report.votos_sigue || 0})
        </button>
        <button 
          onClick={(e) => handleVote(e, 'despejado')}
          className="flex-1 bg-slate-700/50 hover:bg-emerald-400/10 hover:text-emerald-400 text-[10px] font-black text-slate-400 py-2.5 rounded-xl uppercase tracking-tighter transition-colors border border-transparent hover:border-emerald-400/30"
        >
          Despejado
        </button>
      </div>
    </div>
  );
};

export default ReportCard;
