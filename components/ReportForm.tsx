
import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Car, AlertOctagon, HardHat, Gauge, Send, Camera, Video, Loader2, CheckCircle2, Globe } from 'lucide-react';
import { ReportType } from '../types';
import imageCompression from 'browser-image-compression';

interface ReportFormProps {
  onClose: (didSend: boolean, payload?: any) => void;
  isAdmin?: boolean;
  externalCoords?: [number, number] | null;
}

const ReportForm: React.FC<ReportFormProps> = ({ onClose, isAdmin, externalCoords }) => {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [comment, setComment] = useState('');
  const [source, setSource] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video'; data: string; file?: File }[]>([]);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalCoords) {
      setCoords({ lat: externalCoords[0], lng: externalCoords[1] });
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        null,
        { enableHighAccuracy: true, timeout: 4000 }
      );
    }
  }, [externalCoords]);

  const handleMedia = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'image') {
      setIsCompressing(true);
      try {
        const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true, fileType: 'image/jpeg' };
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
          setMedia([{ type, data: reader.result as string, file: compressedFile }]);
          setIsCompressing(false);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        setIsCompressing(false);
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => setMedia([{ type, data: reader.result as string, file }]);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    const finalType = selectedType || 'Libre';
    
    const payload = {
      tipo: finalType,
      descripcion: comment.trim() || (finalType === 'Libre' ? "Camino despejado" : `Reporte de ${finalType}`),
      fotos: media.filter(m => m.type === 'image').map(m => m.data),
      video_url: media.find(m => m.type === 'video')?.data || null,
      latitud: coords?.lat,
      longitud: coords?.lng,
      estatus: 'activo',
      es_admin: isAdmin || false,
      fuente: source.trim() || null
    };

    onClose(true, payload);
  };

  const categories: { label: ReportType; icon: any; color: string }[] = [
    { label: 'Libre', icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'Tráfico Lento', icon: Gauge, color: 'bg-yellow-400' },
    { label: 'Tráfico Pesado', icon: Gauge, color: 'bg-orange-500' },
    { label: 'Alto Total', icon: AlertOctagon, color: 'bg-red-600' },
    { label: 'Policía Visible', icon: Shield, color: 'bg-blue-500' },
    { label: 'Policía Escondido', icon: Shield, color: 'bg-indigo-600' },
    { label: 'Accidente', icon: AlertOctagon, color: 'bg-red-500' },
    { label: 'Obras', icon: HardHat, color: 'bg-amber-600' },
    { label: 'Vehículo en Vía', icon: Car, color: 'bg-slate-500' },
  ];

  const canSubmit = (selectedType !== null || comment.trim().length > 0 || media.length > 0) && !isCompressing;
  const isClearRoad = selectedType === 'Libre';

  return (
    <div className="relative p-6 bg-[#0f172a] flex flex-col max-h-[95vh] overflow-hidden select-none border border-white/5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-2">{isAdmin ? 'DESPACHO' : 'REPORTAR'}</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {externalCoords ? 'COORDENADAS MANUALES ACTIVAS' : 'UBICACIÓN GPS ACTIVA'}
          </p>
        </div>
        <button onClick={() => onClose(false)} className="p-3 bg-slate-800/80 text-slate-400 rounded-full active:scale-90 border border-white/5">
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4 overflow-hidden">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setSelectedType(selectedType === cat.label ? null : cat.label)}
            className={`flex flex-col items-center justify-center p-3 rounded-3xl border-b-[6px] transition-all active:scale-95 min-h-[85px] ${
              selectedType === cat.label ? `${cat.color} border-black/20 scale-105 shadow-2xl text-white` : 'bg-slate-800/40 border-slate-900 text-slate-500 opacity-60'
            }`}
          >
            <cat.icon size={22} className={selectedType === cat.label ? "text-white" : "text-slate-500"} />
            <span className="text-[8px] font-black uppercase text-center mt-2 leading-tight">
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-4">
        {isAdmin && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-2xl">
            <Globe size={18} className="text-red-400" />
            <input 
              type="text" 
              value={source} 
              onChange={(e) => setSource(e.target.value)} 
              placeholder="Fuente / Referencia (Opcional)" 
              className="bg-transparent text-white font-bold text-xs focus:outline-none flex-1 placeholder:text-red-900/40"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 border-2 py-3 rounded-2xl font-black text-[10px] uppercase bg-slate-800/80 border-slate-700/50 text-slate-500">
            {isCompressing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />} Foto
          </button>
          <button onClick={() => videoInputRef.current?.click()} className="flex items-center justify-center gap-3 border-2 py-3 rounded-2xl font-black text-[10px] uppercase bg-slate-800/80 border-slate-700/50 text-slate-500">
            <Video size={18} /> Video
          </button>
        </div>

        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => handleMedia(e, 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleMedia(e, 'video')} />

        <div className="flex gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50">
          <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center bg-black">
            {media.length > 0 ? (
              <><img src={media[0].data} className="w-full h-full object-cover" /><button onClick={() => setMedia([])} className="absolute -top-1 -right-1 bg-red-600 text-white p-1 rounded-full"><X size={10} /></button></>
            ) : <span className="text-[9px] font-black text-slate-700 uppercase text-center">Preview</span>}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="¿Qué está pasando?" className="flex-1 bg-transparent text-white font-bold text-sm p-2 focus:outline-none resize-none h-24" />
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleSend}
          disabled={!canSubmit}
          className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-lg flex items-center justify-center gap-5 shadow-2xl transition-all ${
            !canSubmit ? 'bg-slate-800 text-slate-600 border-b-4 border-slate-900' : isClearRoad ? 'bg-emerald-500 text-white border-b-4 border-emerald-700' : 'bg-yellow-400 text-slate-900 border-b-4 border-yellow-600'
          }`}
        >
          <Send size={24} strokeWidth={4} /> {isAdmin ? 'DESPACHAR' : 'ENVIAR'}
        </button>
      </div>
    </div>
  );
};

export default ReportForm;