
import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Car, AlertOctagon, HardHat, Gauge, Send, MapPin, Camera, Video, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
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
      setMedia([{ type, data: reader.result as string }]); // Solo una pieza de evidencia principal para el diseño side-by-side
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => setMedia([]);

  const executeSend = async () => {
    if (!selectedType || isSubmitting || !coords) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reportes').insert([{
        tipo: selectedType,
        descripcion: comment.trim() || `Reporte de ${selectedType}`,
        fotos: media.filter(m => m.type === 'image').map(m => m.data),
        video_url: media.find(m => m.type === 'video')?.data || null,
        latitud: coords.lat,
        longitud: coords.lng,
        estatus: 'activo'
      }]);

      if (error) throw error;

      setShowToast(true);
      
      // Esperar un momento para que el usuario vea el éxito y cerrar
      setTimeout(() => {
        onClose(true); // Esto activará panelOpen en App.tsx
      }, 1500);

    } catch (err) {
      console.error("Error enviando:", err);
      alert("No se pudo guardar el reporte. Verifica tu conexión.");
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
    <div className="relative p-6 bg-[#0f172a] flex flex-col max-h-[95vh] overflow-hidden select-none border border-slate-700/50 rounded-[40px]">
      {/* Success Overlay */}
      {showToast && (
        <div className="absolute inset-0 z-[300] bg-emerald-500 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <CheckCircle2 size={80} className="mb-4 animate-bounce" />
          <h3 className="text-2xl font-black italic">¡REPORTE ENVIADO!</h3>
          <p className="font-bold opacity-80 uppercase text-xs tracking-widest mt-2">Sincronizando con otros conductores...</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter leading-none">REPORTAR</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Selecciona el incidente</p>
        </div>
        <button onClick={() => onClose(false)} className="p-2 bg-slate-800 text-slate-400 rounded-full active:scale-90 transition-transform">
          <X size={24} />
        </button>
      </div>

      {/* Categorías (Grid 3x3 compacto) */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setSelectedType(cat.label)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-b-2 transition-all active:scale-95 ${
              selectedType === cat.label 
                ? `${cat.color} border-black/20 scale-105 shadow-xl shadow-${cat.color.split('-')[1]}-400/20` 
                : 'bg-slate-800/40 border-slate-900 text-slate-500'
            }`}
          >
            <cat.icon size={18} className={selectedType === cat.label ? "text-slate-900" : "text-slate-500"} />
            <span className={`text-[8px] font-black uppercase text-center mt-1 leading-none ${selectedType === cat.label ? "text-slate-900" : ""}`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {/* Multimedia & Comentario */}
      <div className="space-y-4 mb-6">
        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block text-center">Evidencia opcional</label>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-slate-800/80 border border-slate-700 py-4 rounded-3xl text-slate-300 font-black text-[10px] uppercase active:scale-95 transition-all"
          >
            <Camera size={18} className="text-yellow-400" />
            Tomar Foto
          </button>
          <button 
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-slate-800/80 border border-slate-700 py-4 rounded-3xl text-slate-300 font-black text-[10px] uppercase active:scale-95 transition-all"
          >
            <Video size={18} className="text-red-500" />
            Video (30s)
          </button>
        </div>

        <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => handleMedia(e, 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" capture="environment" className="hidden" onChange={(e) => handleMedia(e, 'video')} />

        {/* Sección de Comentario al lado de la Foto */}
        {(selectedType || media.length > 0) && (
          <div className="flex gap-3 bg-slate-900/50 p-3 rounded-[32px] border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {media.length > 0 ? (
              <div className="relative w-28 h-28 shrink-0">
                <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 shadow-inner">
                  {media[0].type === 'image' ? (
                    <img src={media[0].data} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-500/10">
                      <Video size={24} className="text-red-500" />
                      <span className="text-[8px] font-black text-red-500">VIDEO</span>
                    </div>
                  )}
                </div>
                <button onClick={removeMedia} className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg border-2 border-slate-900">
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <div className="w-28 h-28 shrink-0 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-700 italic text-[8px] font-black">
                SIN MEDIA
              </div>
            )}
            
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Algún detalle extra? (opcional)"
              className="flex-1 bg-transparent text-white font-bold text-sm p-2 placeholder:text-slate-700 focus:outline-none resize-none h-28"
            />
          </div>
        )}
      </div>

      {/* Footer & Big Button */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase tracking-widest">
            <MapPin size={12} className={coords ? "text-emerald-500" : "animate-pulse"} />
            {coords ? "GPS ACTIVADO" : "OBTENIENDO GPS..."}
          </div>
          {!selectedType && <div className="text-red-500 text-[9px] font-black uppercase animate-pulse italic">Selecciona incidente</div>}
        </div>

        <button
          onClick={executeSend}
          disabled={!selectedType || isSubmitting || !coords}
          className={`w-full py-7 rounded-[35px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-4 transition-all duration-300 shadow-2xl ${
            !selectedType || isSubmitting || !coords
              ? 'bg-slate-800 text-slate-600 grayscale'
              : 'bg-yellow-400 text-slate-900 shadow-yellow-400/20 active:scale-95'
          }`}
        >
          {isSubmitting ? (
            <Loader2 size={28} className="animate-spin" />
          ) : (
            <>
              <Send size={24} strokeWidth={3} />
              ENVIAR REPORTE
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReportForm;
