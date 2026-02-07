import React, { useState, useEffect } from 'react';
import { Report, ReportType } from '../types';
import { 
  Clock, X, Maximize2, Loader2, 
  Gauge, AlertOctagon, Shield, 
  HardHat, Car, AlertTriangle, Info, CheckCircle2
} from 'lucide-react';
import { supabase, getUserId } from '../lib/supabase';

interface ReportCardProps {
  report: Report;
  isNew?: boolean;
  onClick: (lat: number, lng: number) => void;
}

const formatTimeAgo = (dateString: string) => {
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diff < 1) return 'Justo ahora';
  if (diff < 60) return `Hace ${diff} min`;
  const hours = Math.floor(diff / 60);
  if (hours === 1) return 'Hace 1 hora';
  return `Hace ${hours} horas`;
};

const getTimeStyle = (dateString: string) => {
  const diffMinutes = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diffMinutes < 15) return 'text-yellow-400 font-black'; // Resaltado
  if (diffMinutes > 720) return 'text-slate-600 font-medium'; // Tenue (>12h)
  return 'text-slate-400 font-bold'; // Normal
};

const getCategoryConfig = (type: ReportType) => {
  switch (type) {
    case 'Libre':
      return { icon: CheckCircle2, color: 'text-emerald-500', fill: 'none' };
    case 'Accidente':
    case 'Alto Total':
      return { icon: AlertOctagon, color: 'text-red-500', fill: 'none' };
    case 'Tráfico Pesado':
      return { icon: Gauge, color: 'text-orange-500', fill: 'none' };
    case 'Tráfico Lento':
      return { icon: Gauge, color: 'text-yellow-400', fill: 'none' };
    case 'Policía Visible':
    case 'Policía Escondido':
    case 'Policía Contrario':
      return { icon: Shield, color: 'text-blue-500', fill: 'none' };
    case 'Obras':
      return { icon: HardHat, color: 'text-slate-400', fill: 'none' };
    case 'Vehículo en Vía':
    case 'Vehículo en Lateral':
      return { icon: Car, color: 'text-slate-400', fill: 'none' };
    default:
      return { icon: Info, color: 'text-slate-500', fill: 'none' };
  }
};

const ReportCard: React.FC<ReportCardProps> = ({ report, isNew, onClick }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [currentTime, setCurrentTime] = useState(formatTimeAgo(report.created_at));

  const [localSigue, setLocalSigue] = useState(report.votos_sigue || 0);
  const [localDespejado, setLocalDespejado] = useState(report.votos_despejado || 0);

  // Actualizar el tiempo relativo cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTimeAgo(report.created_at));
    }, 60000);
    return () => clearInterval(timer);
  }, [report.created_at]);

  const handleVote = async (e: React.MouseEvent, voto: 'sigue' | 'despejado') => {
    e.stopPropagation();
    if (voted || isVoting) return;

    setIsVoting(true);
    if (voto === 'sigue') setLocalSigue(prev => prev + 1);
    else setLocalDespejado(prev => prev + 1);

    try {
      const { error } = await supabase.from('validaciones').insert({
        reporte_id: report.id,
        voto: voto,
        usuario_id: getUserId()
      });
      if (error) throw error;
      setVoted(true);
    } catch (err) {
      console.error("Error al validar:", err);
      if (voto === 'sigue') setLocalSigue(prev => prev - 1);
      else setLocalDespejado(prev => prev - 1);
    } finally {
      setIsVoting(false);
    }
  };

  const isAlert = localSigue >= 5;
  const isClear = report.tipo === 'Libre';
  const hasImage = report.fotos && report.fotos.length > 0;
  const config = getCategoryConfig(report.tipo);
  const CategoryIcon = isAlert ? AlertTriangle : config.icon;

  return (
    <>
      <div 
        onClick={() => onClick(report.latitud, report.longitud)}
        className={`bg-slate-800/60 border rounded-2xl p-3 mb-2.5 active:scale-[0.98] transition-all cursor-pointer shadow-md relative overflow-hidden ${
          isNew ? 'animate-[pulse-flash_2s_infinite] border-[#FFCC00]' : 
          isClear ? 'border-emerald-500/30 bg-emerald-500/5' :
          isAlert ? 'border-yellow-400/50 bg-yellow-400/5' : 'border-slate-700/50'
        }`}
      >
        <style>
          {`
            @keyframes pulse-flash {
              0% { background-color: rgba(255, 204, 0, 0.05); }
              50% { background-color: rgba(255, 204, 0, 0.2); }
              100% { background-color: rgba(255, 204, 0, 0.05); }
            }
          `}
        </style>
        
        {isNew && (
          <div className="absolute top-0 left-0 bg-[#FFCC00] text-slate-900 px-2 py-0.5 text-[8px] font-black uppercase rounded-br-lg shadow-lg">
            Nuevo
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <CategoryIcon 
                  size={16} 
                  className={isAlert ? 'text-yellow-400' : isClear ? 'text-emerald-500' : config.color} 
                  fill={isAlert ? "currentColor" : "none"} 
                />
                <h3 className={`font-black text-[11px] uppercase tracking-wider truncate ${isAlert ? 'text-yellow-400' : isClear ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {report.tipo}
                </h3>
              </div>
              <div className={`flex items-center gap-1 text-[10px] uppercase tracking-tight shrink-0 transition-colors ${getTimeStyle(report.created_at)}`}>
                <Clock size={10} />
                {currentTime}
              </div>
            </div>

            <p className="text-[#f8f9fa] text-[15px] font-medium leading-snug line-clamp-2 mb-3">
              {report.descripcion || 'Sin detalles adicionales.'}
            </p>

            <div className="flex gap-2">
              <button 
                onClick={(e) => handleVote(e, 'sigue')}
                disabled={voted || isVoting}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black py-1.5 rounded-lg uppercase transition-all border ${
                  voted 
                    ? 'bg-yellow-400/10 text-yellow-500 border-yellow-400/20' 
                    : 'bg-slate-700/30 text-slate-400 border-transparent active:scale-95'
                }`}
              >
                {isVoting ? <Loader2 size={12} className="animate-spin" /> : 'Sigue'} 
                <span className="bg-black/20 px-1.5 rounded text-inherit">{localSigue}</span>
              </button>
              <button 
                onClick={(e) => handleVote(e, 'despejado')}
                disabled={voted || isVoting}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black py-1.5 rounded-lg uppercase transition-all border ${
                  voted 
                    ? 'bg-emerald-400/10 text-emerald-500 border-emerald-400/20' 
                    : 'bg-slate-700/30 text-slate-400 border-transparent active:scale-95'
                }`}
              >
                {isVoting ? <Loader2 size={12} className="animate-spin" /> : 'Libre'}
                <span className="bg-black/20 px-1.5 rounded text-inherit">{localDespejado}</span>
              </button>
            </div>
          </div>

          {hasImage && (
            <div 
              onClick={(e) => { e.stopPropagation(); setSelectedImage(report.fotos![0]); }}
              className="relative w-20 h-20 rounded-xl overflow-hidden bg-black border border-slate-700/50 shrink-0 self-center"
            >
              <img src={report.fotos![0]} alt="Miniatura" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <Maximize2 size={12} className="text-white opacity-60" />
              </div>
              {report.fotos!.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 rounded text-[9px] font-black text-white">
                  +{report.fotos!.length - 1}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-10 right-6 z-[210] bg-white/10 text-white p-4 rounded-full backdrop-blur-md border border-white/10 active:scale-90"><X size={28} /></button>
          <div className="relative w-full max-w-4xl max-h-[85vh] flex items-center justify-center">
            <img src={selectedImage} alt="Full view" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/5" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </>
  );
};

export default ReportCard;