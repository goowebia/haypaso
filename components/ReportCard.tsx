
import React, { useState, useEffect } from 'react';
import { Report, ReportType } from '../types';
import { 
  Clock, X, Maximize2, Loader2, 
  Gauge, AlertOctagon, Shield, 
  HardHat, Car, AlertTriangle, Info, CheckCircle2, Star, AlertCircle, Box
} from 'lucide-react';
import { supabase, getUserId } from '../lib/supabase';

interface ReportCardProps {
  report: Report;
  isNew?: boolean;
  onClick: (lat: number, lng: number) => void;
}

const formatTimeAgo = (dateString: string) => {
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diff < 1) return 'Hace un momento';
  if (diff < 60) return `Hace ${diff} min`;
  const hours = Math.floor(diff / 60);
  return `Hace ${hours} h`;
};

const getCategoryConfig = (type: ReportType) => {
  switch (type) {
    case 'Camino Libre': return { icon: CheckCircle2, color: 'text-emerald-500' };
    case 'Accidente':
    case 'Alto Total': return { icon: AlertOctagon, color: 'text-red-500' };
    case 'Tráfico Pesado':
    case 'Tráfico Lento': return { icon: Gauge, color: 'text-orange-500' };
    case 'Policía Visible':
    case 'Policía Escondido':
    case 'Policía Contrario': return { icon: Shield, color: 'text-blue-500' };
    case 'Obras': return { icon: HardHat, color: 'text-yellow-500' };
    case 'Bache': return { icon: AlertCircle, color: 'text-orange-600' };
    case 'Objeto en el camino': return { icon: Box, color: 'text-stone-500' };
    default: return { icon: Info, color: 'text-slate-500' };
  }
};

const ReportCard: React.FC<ReportCardProps> = ({ report, isNew, onClick }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [currentTime, setCurrentTime] = useState(formatTimeAgo(report.created_at));

  const [localSigue, setLocalSigue] = useState(report.votos_sigue || 0);
  const [localDespejado, setLocalDespejado] = useState(report.votos_despejado || 0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatTimeAgo(report.created_at)), 30000);
    return () => clearInterval(timer);
  }, [report.created_at]);

  const handleVote = async (e: React.MouseEvent, voto: 'sigue' | 'despejado') => {
    e.stopPropagation();
    if (voted || isVoting) return;
    setIsVoting(true);
    if (voto === 'sigue') setLocalSigue(prev => prev + 1);
    else setLocalDespejado(prev => prev + 1);

    try {
      const { error } = await supabase.from('validaciones').insert({ reporte_id: report.id, voto, usuario_id: getUserId() });
      if (error) throw error;
      setVoted(true);
    } catch (err) {
      if (voto === 'sigue') setLocalSigue(prev => prev - 1);
      else setLocalDespejado(prev => prev - 1);
    } finally { setIsVoting(false); }
  };

  const isAlert = localSigue >= 5;
  const isClear = report.tipo === 'Camino Libre';
  const hasImage = report.fotos && report.fotos.length > 0;
  const config = getCategoryConfig(report.tipo);
  const CategoryIcon = isAlert ? AlertTriangle : config.icon;

  return (
    <>
      <div 
        onClick={() => onClick(report.latitud, report.longitud)}
        className={`bg-slate-800/60 border rounded-2xl p-3 mb-2.5 transition-all shadow-md relative overflow-hidden active:bg-slate-700/80 ${
          isNew ? 'animate-pulse border-yellow-400' : 
          report.es_admin ? 'border-yellow-400/40 bg-yellow-400/5' :
          isClear ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/50'
        }`}
      >
        {report.es_admin && (
          <div className="absolute top-0 left-0 bg-yellow-400 text-slate-900 px-2 py-0.5 text-[7px] font-black uppercase rounded-br-lg flex items-center gap-1 z-10">
            <Star size={8} fill="currentColor" /> Oficial
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <CategoryIcon size={16} className={report.es_admin ? 'text-yellow-400' : isAlert ? 'text-yellow-400' : config.color} fill={isAlert || report.es_admin ? "currentColor" : "none"} />
                <h3 className={`font-black text-[11px] uppercase tracking-wider truncate ${report.es_admin ? 'text-yellow-400' : isClear ? 'text-emerald-500' : 'text-slate-300'}`}>
                  {report.tipo}
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[9px] uppercase font-black text-slate-500 shrink-0">
                <Clock size={10} /> {currentTime}
              </div>
            </div>

            <p className="text-slate-100 text-[14px] font-black leading-tight line-clamp-2 mb-3 uppercase italic">
              {report.descripcion}
            </p>

            <div className="flex gap-2">
              <button onClick={(e) => handleVote(e, 'sigue')} disabled={voted || isVoting} className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black py-2 rounded-xl uppercase transition-all border ${voted ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700/50 text-slate-300 border-white/5 active:scale-95'}`}>
                Sigue <span className="bg-black/20 px-1.5 rounded">{localSigue}</span>
              </button>
              <button onClick={(e) => handleVote(e, 'despejado')} disabled={voted || isVoting} className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black py-2 rounded-xl uppercase transition-all border ${voted ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-300 border-white/5 active:scale-95'}`}>
                Libre <span className="bg-black/20 px-1.5 rounded">{localDespejado}</span>
              </button>
            </div>
          </div>

          {hasImage && (
            <div onClick={(e) => { e.stopPropagation(); setSelectedImage(report.fotos![0]); }} className="relative w-20 h-20 rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 self-center shadow-lg">
              <img src={report.fotos![0]} alt="Miniatura" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Maximize2 size={12} className="text-white" /></div>
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-10 right-6 bg-white/10 text-white p-4 rounded-full"><X size={28} /></button>
          <img src={selectedImage} alt="Full view" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}
    </>
  );
};

export default ReportCard;
