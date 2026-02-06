
import React, { useState } from 'react';
import { Report } from '../types';
import { Clock, AlertTriangle, X, Maximize2, Loader2 } from 'lucide-react';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Estados locales para feedback instantáneo (Optimistic Update)
  const [localSigue, setLocalSigue] = useState(report.votos_sigue || 0);
  const [localDespejado, setLocalDespejado] = useState(report.votos_despejado || 0);

  const handleVote = async (e: React.MouseEvent, voto: 'sigue' | 'despejado') => {
    e.stopPropagation();
    if (voted || isVoting) return;

    setIsVoting(true);
    
    // Feedback visual instantáneo
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
      // Revertir si hay error
      if (voto === 'sigue') setLocalSigue(prev => prev - 1);
      else setLocalDespejado(prev => prev - 1);
      alert("No se pudo registrar tu voto. Revisa tu conexión.");
    } finally {
      setIsVoting(false);
    }
  };

  const isAlert = localSigue >= 5;

  return (
    <>
      <div 
        onClick={() => onClick(report.latitud, report.longitud)}
        className={`bg-slate-800 border rounded-3xl p-5 mb-4 active:scale-[0.98] transition-all cursor-pointer shadow-lg ${
          isAlert ? 'border-yellow-400 shadow-yellow-400/10' : 'border-slate-700'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${
              isAlert ? 'bg-yellow-400 text-slate-900 border-yellow-500' : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
            }`}>
              <AlertTriangle size={16} fill={isAlert ? "currentColor" : "none"} />
            </div>
            <h3 className={`font-black text-[11px] uppercase tracking-tight ${isAlert ? 'text-yellow-400' : 'text-white'}`}>
              {report.tipo} {isAlert && " (CRÍTICO)"}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
            <Clock size={10} />
            {formatTimeAgo(report.created_at)}
          </div>
        </div>

        <p className="text-slate-300 text-[11px] font-medium leading-relaxed mb-4">
          {report.descripcion || 'Sin descripción detallada.'}
        </p>

        {report.fotos && report.fotos.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {report.fotos.map((foto, idx) => (
              <div 
                key={idx} 
                onClick={(e) => { e.stopPropagation(); setSelectedImage(foto); }}
                className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-700 active:opacity-70 transition-opacity"
              >
                <img src={foto} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                  <Maximize2 size={12} className="text-white opacity-40" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4 mt-2 border-t border-slate-700/50 pt-4">
          <button 
            onClick={(e) => handleVote(e, 'sigue')}
            disabled={voted || isVoting}
            className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-black py-3 rounded-2xl uppercase tracking-tighter transition-all border ${
              voted 
                ? 'bg-yellow-400/10 text-yellow-500 border-yellow-400/20' 
                : 'bg-slate-700/50 hover:bg-yellow-400/10 hover:text-yellow-400 text-slate-400 border-transparent active:scale-95'
            }`}
          >
            {isVoting ? <Loader2 size={14} className="animate-spin" /> : 'Sigue ahí'} 
            <span className="bg-slate-900/50 px-2 py-0.5 rounded-md text-inherit border border-white/5">{localSigue}</span>
          </button>
          <button 
            onClick={(e) => handleVote(e, 'despejado')}
            disabled={voted || isVoting}
            className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-black py-3 rounded-2xl uppercase tracking-tighter transition-all border ${
              voted 
                ? 'bg-emerald-400/10 text-emerald-500 border-emerald-400/20' 
                : 'bg-slate-700/50 hover:bg-emerald-400/10 hover:text-emerald-400 text-slate-400 border-transparent active:scale-95'
            }`}
          >
            {isVoting ? <Loader2 size={14} className="animate-spin" /> : 'Despejado'}
            <span className="bg-slate-900/50 px-2 py-0.5 rounded-md text-inherit border border-white/5">{localDespejado}</span>
          </button>
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
