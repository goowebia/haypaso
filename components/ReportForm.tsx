
import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Car, AlertOctagon, HardHat, Gauge, Send, Camera, Video, Loader2, CheckCircle2, Globe, MapPin, AlertCircle, RefreshCw, ChevronLeft, Box } from 'lucide-react';
import { ReportType } from '../types';
import imageCompression from 'browser-image-compression';

interface ReportFormProps {
  onClose: (didSend: boolean, payload?: any) => void;
  isAdmin?: boolean;
  externalCoords?: [number, number] | null;
  currentUserLocation?: [number, number] | null;
}

const ReportForm: React.FC<ReportFormProps> = ({ onClose, isAdmin, externalCoords, currentUserLocation }) => {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [showTrafficMenu, setShowTrafficMenu] = useState(false);
  const [showPoliceMenu, setShowPoliceMenu] = useState(false);
  const [comment, setComment] = useState('');
  const [source, setSource] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video'; data: string; file?: File }[]>([]);
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalCoords) {
      setCoords({ lat: externalCoords[0], lng: externalCoords[1] });
    } else if (currentUserLocation) {
      setCoords({ lat: currentUserLocation[0], lng: currentUserLocation[1] });
    } else {
      requestGps();
    }
  }, [externalCoords, currentUserLocation]);

  const requestGps = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Sin GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsError(null);
      },
      (err) => {
        let msg = "Error GPS";
        if (err.code === 1) msg = "Sin Permiso";
        setGpsError(msg);
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

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
    if (!coords) return;
    const finalType = selectedType || 'Camino Libre';
    const payload = {
      tipo: finalType,
      descripcion: comment.trim() || (finalType === 'Camino Libre' ? "Vía libre" : `Reporte ${finalType}`),
      fotos: media.filter(m => m.type === 'image').map(m => m.data),
      video_url: media.find(m => m.type === 'video')?.data || null,
      latitud: Number(coords.lat),
      longitud: Number(coords.lng),
      estatus: 'activo',
      es_admin: !!isAdmin,
      fuente: source.trim() || null
    };
    onClose(true, payload);
  };

  const categories: { label: ReportType | 'Tráfico' | 'Policía'; icon: any; color: string }[] = [
    { label: 'Camino Libre', icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'Tráfico', icon: Gauge, color: 'bg-orange-500' },
    { label: 'Policía', icon: Shield, color: 'bg-blue-600' },
    { label: 'Accidente', icon: AlertOctagon, color: 'bg-red-500' },
    { label: 'Obras', icon: HardHat, color: 'bg-yellow-500' },
    { label: 'Bache', icon: AlertCircle, color: 'bg-orange-600' },
    { label: 'Objeto en el camino', icon: Box, color: 'bg-stone-600' },
    { label: 'Vehículo en Vía', icon: Car, color: 'bg-slate-500' },
  ];

  const trafficSubCategories: { label: ReportType; icon: any; color: string }[] = [
    { label: 'Tráfico Lento', icon: Gauge, color: 'bg-orange-400' },
    { label: 'Tráfico Pesado', icon: Gauge, color: 'bg-orange-600' },
    { label: 'Alto Total', icon: AlertOctagon, color: 'bg-red-600' },
  ];

  const policeSubCategories: { label: ReportType; display: string; icon: any; color: string }[] = [
    { label: 'Policía Visible', display: 'Visible', icon: Shield, color: 'bg-blue-500' },
    { label: 'Policía Escondido', display: 'Escondido', icon: Shield, color: 'bg-indigo-600' },
    { label: 'Policía Contrario', display: 'En otra vía', icon: Shield, color: 'bg-sky-600' },
  ];

  const isTrafficSelected = selectedType && ['Tráfico Lento', 'Tráfico Pesado', 'Alto Total'].includes(selectedType);
  const isPoliceSelected = selectedType && ['Policía Visible', 'Policía Escondido', 'Policía Contrario'].includes(selectedType);
  const canSubmit = (selectedType !== null || comment.trim().length > 0) && coords !== null && !isCompressing;

  const getButtonText = () => {
    if (isCompressing) return "Procesando...";
    if (gpsError) return gpsError;
    if (!coords) return "Cargando GPS...";
    return isAdmin ? "DESPACHAR" : "ENVIAR REPORTE";
  };

  return (
    <div className="relative p-6 bg-[#0f172a] flex flex-col max-h-[95vh] overflow-hidden border border-white/5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-1 uppercase">{isAdmin ? 'DESPACHO' : 'REPORTAR'}</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${coords ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {coords ? 'SISTEMA LISTO' : (gpsError || 'BUSCANDO SEÑAL')}
            </p>
          </div>
        </div>
        <button onClick={() => onClose(false)} className="p-3 bg-slate-800 text-slate-400 rounded-full active:scale-90 border border-white/5">
          <X size={24} />
        </button>
      </div>

      <div className="mb-4 overflow-y-auto no-scrollbar pb-2">
        {showTrafficMenu ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setShowTrafficMenu(false)} className="p-2 bg-slate-800 text-white rounded-xl border border-white/20 active:scale-95">
                <ChevronLeft size={20} />
              </button>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Niveles de Tráfico</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {trafficSubCategories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setSelectedType(selectedType === cat.label ? null : cat.label)}
                  className={`flex flex-col items-center justify-center p-3 rounded-3xl border-2 transition-all active:scale-95 min-h-[100px] ${
                    selectedType === cat.label ? `${cat.color} border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-[1.05]` : 'bg-slate-800/60 border-white/10 text-white'
                  }`}
                >
                  <cat.icon size={24} className="mb-2" />
                  <span className="text-[14px] font-black uppercase text-center leading-tight drop-shadow-md">{cat.label.replace('Tráfico ', '')}</span>
                </button>
              ))}
            </div>
          </div>
        ) : showPoliceMenu ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setShowPoliceMenu(false)} className="p-2 bg-slate-800 text-white rounded-xl border border-white/20 active:scale-95">
                <ChevronLeft size={20} />
              </button>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Opciones Policiales</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {policeSubCategories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => setSelectedType(selectedType === cat.label ? null : cat.label)}
                  className={`flex flex-col items-center justify-center p-3 rounded-3xl border-2 transition-all active:scale-95 min-h-[100px] ${
                    selectedType === cat.label ? `${cat.color} border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-[1.05]` : 'bg-slate-800/60 border-white/10 text-white'
                  }`}
                >
                  <cat.icon size={24} className="mb-2" />
                  <span className="text-[14px] font-black uppercase text-center leading-tight drop-shadow-md">{cat.display}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.label}
                onClick={() => {
                  if (cat.label === 'Tráfico') setShowTrafficMenu(true);
                  else if (cat.label === 'Policía') setShowPoliceMenu(true);
                  else setSelectedType(selectedType === (cat.label as ReportType) ? null : (cat.label as ReportType));
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-3xl border-2 transition-all active:scale-95 min-h-[90px] shadow-[0_0_15px_rgba(255,255,255,0.05)] ${
                  (selectedType === cat.label || (cat.label === 'Tráfico' && isTrafficSelected) || (cat.label === 'Policía' && isPoliceSelected)) 
                  ? `${cat.color} border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-[1.02]` 
                  : `${cat.color} border-white/20 text-white`
                }`}
              >
                <cat.icon size={24} className="mb-2" />
                <span className="text-[14px] font-black uppercase text-center leading-tight drop-shadow-md">
                  {cat.label === 'Camino Libre' ? 'LIBRE' : cat.label === 'Objeto en el camino' ? 'OBJETO' : cat.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 mb-4 overflow-y-auto no-scrollbar flex-1">
        {isAdmin && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl flex items-center gap-3">
            <Globe size={18} className="text-red-400" />
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="FUENTE OFICIAL" className="bg-transparent text-white font-black text-xs focus:outline-none flex-1 placeholder:text-red-900/40 uppercase" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 border-2 py-4 rounded-3xl font-black text-[12px] uppercase bg-slate-800/80 border-white/20 text-white active:scale-95 transition-transform">
            {isCompressing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />} + FOTO
          </button>
          <button onClick={() => videoInputRef.current?.click()} className="flex items-center justify-center gap-2 border-2 py-4 rounded-3xl font-black text-[12px] uppercase bg-slate-800/80 border-white/20 text-white active:scale-95 transition-transform">
            <Video size={18} /> + VIDEO
          </button>
        </div>

        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => handleMedia(e, 'image')} />
        <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleMedia(e, 'video')} />

        <div className="bg-slate-900/40 p-4 rounded-3xl border border-white/10 flex flex-col gap-3">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="DETALLES ADICIONALES..." className="bg-transparent text-white font-black text-sm focus:outline-none resize-none min-h-[70px] placeholder:text-slate-700 uppercase" />
          {media.length > 0 && (
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/50 shadow-xl">
              <img src={media[0].data} className="w-full h-full object-cover" />
              <button onClick={() => setMedia([])} className="absolute top-1 right-1 bg-red-600 p-1.5 text-white rounded-full"><X size={12} /></button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleSend}
          disabled={!canSubmit}
          className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xl flex items-center justify-center gap-4 transition-all border-2 ${
            !canSubmit 
            ? 'bg-slate-800 text-slate-600 border-white/5 opacity-50 cursor-not-allowed' 
            : 'bg-yellow-400 text-slate-900 border-white active:translate-y-1 shadow-[0_0_30px_rgba(250,204,21,0.3)]'
          }`}
        >
          {canSubmit ? <Send size={24} strokeWidth={4} /> : (gpsError ? <AlertCircle size={24} /> : <Loader2 size={24} className="animate-spin" />)} 
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};

export default ReportForm;
