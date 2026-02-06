
import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Car, AlertOctagon, HardHat, Gauge, Send, MapPin, Camera, Video, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReportType } from '../types';

interface ReportFormProps {
  onClose: (didSend?: boolean) => void;
}

const ReportForm: React.FC<ReportFormProps> = ({ onClose }) => {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [comment, setComment] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video'; data: string }[]>([]);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getPos = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Error GPS:", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };
    getPos();
  }, []);

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMedia([{ type, data: reader.result as string }]);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => setMedia([]);

  const executeSend = async () => {
    if (!selectedType || isSubmitting || !coords) return;

    setIsSubmitting(true);
    try {
      const payload = {
        tipo: selectedType,
        descripcion: comment.trim() || `Reporte de ${selectedType}`,
        fotos: media.filter(m => m.type === 'image').map(m => m.data),
        video_url: media.find(m => m.type === 'video')?.data || null,
        latitud: coords.lat,
        longitud: coords.lng,
        estatus: 'activo'
      };

      const { error } = await supabase.from('reportes').insert([payload]);

      if (error) throw error;

      setShowToast(true);
      
      setTimeout(() => {
        onClose(true);
      }, 1500);

    } catch (err) {
      console.error("Error enviando reporte:", err);
      alert("Error al guardar. Verifica que la tabla en Supabase sea correcta.");
      setIsSubmitting(false);
    }
  };

  const categories: { label: ReportType; icon: any; color: string }[] = [
    { label: 'Tráfico Lento', icon: Gauge, color: 'bg-yellow-400' },
    { label: 'Tráfico Pesado', icon: Gauge, color: 'bg-orange-500' },
    { label: 'Alto Total', icon: AlertOctagon, color: 'bg-red-600' },
    { label: 'Policía Visible', icon: Shield, color: 'bg-blue-500' },
    { label: 'Policía Escondido', icon: Shield, color: 'bg-indigo-600' },
    { label: 'Accidente', icon: AlertOctagon, color: 'bg-red-500' },
    { label: 'Obras', icon: HardHat, color: 'bg-amber-600' },
    { label: 'Vehículo en Vía', icon: Car, color: 'bg-slate-500' },
    { label: 'Clima', icon: AlertOctagon, color: 'bg-cyan-500' },
  ];

  return (
    <div className="relative p-6 bg-[#0f172a] flex flex-col max-h-[95vh] overflow-hidden select-none border border-white/5">
      {/* Éxito - Pantalla Completa Verde */}
      {showToast && (
        <div className="absolute inset-0 z-[300] bg-emerald-500 flex flex-col items-center justify-center text-white animate-in zoom-in fade-in duration-300">
          <div className="bg-white/20 p-6 rounded-full mb-6">
            <CheckCircle2 size={100} strokeWidth={2.5} />
          </div>
          <h3 className="text-3xl font-black italic tracking-tighter">¡LISTO!</h3>
          <p className="font-bold opacity-80 uppercase text-[10px] tracking-[0.4em] mt-4">Reporte sincronizado</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-2">REPORTAR</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Toca el incidente ocurrido</p>
        </div>
        <button onClick={() => onClose(false)} className="p-3 bg-slate-800 text-slate-400 rounded-full active:scale-90 transition-transform hover:bg-slate-700">
          <X size={24} />
        </button>
      </div>

      {/* Grid Categorías */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setSelectedType(cat.label)}
            className={`flex flex-col items-center justify-center p-4 rounded-3xl border-b-[6px] transition-all active:scale-95 ${
              selectedType === cat.label 
                ? `${cat.color} border-black/20 scale-105 shadow-2xl shadow-${cat.color.split('-')[1]}-400/40` 
                : 'bg-slate-800/40 border-slate-900 text-slate-500'
            }`}
          >
            <cat.icon size={22} className={selectedType === cat.label ? "text-slate-900" : "text-slate-500"} />
            <span className={`text-[9px] font-black uppercase text-center mt-2 leading-tight ${selectedType === cat.label ? "text-slate-900" : ""}`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {/* Evidencia & Comentario Side by Side */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-3 bg-slate-800/80 border-2 border-slate-700/50 py-4 rounded-[28px] text-slate-300 font-black text-[11px] uppercase active:scale-95 transition-all hover:border-yellow-400"
          >
            <Camera size={20} className="text-yellow-400" />
            Foto
          </button>
          <button 
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center justify-center gap-3 bg-slate-800/80 border-2 border-slate-700/50 py-4 rounded-[28px] text-slate-300 font-black text-[11px] uppercase active:scale-95 transition-all hover:border-red-500"
          >
            <Video size={20} className="text-red-500" />
            Video
          </button>
        </div>

        <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => handleMedia(e, 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" capture="environment" className="hidden" onChange={(e) => handleMedia(e, 'video')} />

        {(selectedType || media.length > 0) && (
          <div className="flex gap-4 bg-slate-900/40 p-4 rounded-[40px] border border-slate-800/50 animate-in slide-in-from-bottom-4 duration-300">
            {media.length > 0 ? (
              <div className="relative w-32 h-32 shrink-0">
                <div className="w-full h-full rounded-3xl overflow-hidden border-2 border-slate-700 bg-black shadow-2xl">
                  {media[0].type === 'image' ? (
                    <img src={media[0].data} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-red-500/5">
                      <Video size={32} className="text-red-500" />
                      <span className="text-[9px] font-black text-red-500 uppercase">Video</span>
                    </div>
                  )}
                </div>
                <button onClick={removeMedia} className="absolute -top-3 -right-3 bg-red-600 text-white p-2 rounded-full shadow-2xl border-4 border-slate-900 active:scale-90">
                  <X size={14} strokeWidth={4} />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 shrink-0 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-700 italic text-[10px] font-black tracking-widest uppercase">
                Evidencia
              </div>
            )}
            
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Qué más debemos saber? (opcional)"
              className="flex-1 bg-transparent text-white font-bold text-sm p-2 placeholder:text-slate-700 focus:outline-none resize-none h-32 leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Footer & Submit */}
      <div className="mt-auto pt-2">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <MapPin size={14} className={coords ? "text-emerald-500" : "text-red-500 animate-pulse"} />
            {coords ? "Ubicación fijada" : "Esperando GPS..."}
          </div>
        </div>

        <button
          onClick={executeSend}
          disabled={!selectedType || isSubmitting || !coords}
          className={`w-full py-8 rounded-[40px] font-black uppercase tracking-[0.3em] text-lg flex items-center justify-center gap-5 transition-all duration-300 shadow-2xl ${
            !selectedType || isSubmitting || !coords
              ? 'bg-slate-800 text-slate-600 grayscale'
              : 'bg-yellow-400 text-slate-900 shadow-yellow-400/30 active:scale-95'
          }`}
        >
          {isSubmitting ? (
            <Loader2 size={32} className="animate-spin" />
          ) : (
            <>
              <Send size={28} strokeWidth={4} />
              ENVIAR AHORA
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReportForm;
