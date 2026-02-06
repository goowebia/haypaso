
import React, { useState } from 'react';
import { Report } from '../types';
import { Clock, AlertTriangle, X, Maximize2 } from 'lucide-react';
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

  const handleVote = async (e: React.MouseEvent, voto: 'sigue' | 'despejado') => {
    e.stopPropagation();
    await supabase.from('validaciones').insert({
      reporte_id: report.id,
      voto,
      usuario_id: getUserId()
    });
  };

  const openImage = (e: React.MouseEvent, foto: string) => {
    e.stopPropagation();
    setSelectedImage(foto);
  };

  return (
    <>
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

        {/* Grid de Fotos con Click para Expandir */}
        {report.fotos && report.fotos.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {report.fotos.map((foto, idx) => (
              <div 
                key={idx} 
                onClick={(e) => openImage(e, foto)}
                className="relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-700 group active:opacity-70 transition-opacity"
              >
                <img src={foto} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 size={12} className="text-white" />
                </div>
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

      {/* Visualizador de Imagen en Pantalla Completa */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-10 right-6 z-[210] bg-white/10 hover:bg-white/20 text-white p-4 rounded-full backdrop-blur-md border border-white/10 active:scale-90 transition-transform"
          >
            <X size={28} />
          </button>
          
          <div className="relative w-full max-w-4xl max-h-[85vh] flex items-center justify-center">
            <img 
              src={selectedImage} 
              alt="Visualización completa" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/5"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-12 left-0 right-0 text-center">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Toca afuera para cerrar</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportCard;
