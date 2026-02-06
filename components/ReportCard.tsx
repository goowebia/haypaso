
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
      className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-3 active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          <h3 className="font-black text-white text-xs uppercase">{report.tipo}</h3>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-[9px] font-bold uppercase">
          <Clock size={10} />
          {formatTimeAgo(report.created_at)}
        </div>
      </div>

      <p className="text-slate-300 text-[11px] font-medium leading-tight mb-3">
        {report.descripcion || 'Sin descripción adicional.'}
      </p>

      <div className="flex gap-3 mt-2 border-t border-slate-700 pt-3">
        <button 
          onClick={(e) => handleVote(e, 'sigue')}
          className="text-[9px] font-black text-slate-400 hover:text-yellow-400 uppercase tracking-tighter"
        >
          Sigue ahí ({report.votos_sigue || 0})
        </button>
        <button 
          onClick={(e) => handleVote(e, 'despejado')}
          className="text-[9px] font-black text-slate-400 hover:text-emerald-400 uppercase tracking-tighter"
        >
          Ya despejó
        </button>
      </div>
    </div>
  );
};

export default ReportCard;
