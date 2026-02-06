
import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, Car, AlertOctagon, HardHat, Gauge, Send, MapPin, ArrowLeft, Camera, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReportType } from '../types';

interface ReportFormProps {
  onClose: () => void;
}

type MenuState = 'main' | 'traffic' | 'police' | 'car' | 'details' | 'confirm_comment' | 'confirm_photo';

const ReportForm: React.FC<ReportFormProps> = ({ onClose }) => {
  const [menu, setMenu] = useState<MenuState>('main');
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = 4 - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string].slice(0, 4));
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const selectCategory = (type: ReportType) => {
    setSelectedType(type);
    if (type.toLowerCase().includes('tráfico') || type === 'Alto Total') {
      setMenu('confirm_photo');
    } else {
      setMenu('details');
    }
  };

  const validateAndSend = () => {
    if (!comment.trim()) {
      setMenu('confirm_comment');
    } else {
      executeSend();
    }
  };

  const executeSend = async () => {
    if (!coords || !selectedType) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reportes').insert({
        tipo: selectedType,
        descripcion: comment.trim() || `Reporte de ${selectedType}`,
        fotos: photos.length > 0 ? photos : null,
        latitud: coords.lat,
        longitud: coords.lng,
        estatus: 'activo'
      });
      if (error) throw error;
      onClose(); // Cerrar y volver al mapa
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setMenu('details');
    }
  };

  const CategoryButton = ({ label, icon: Icon, color, onClick }: any) => (
    <button
      onClick={onClick}
      className={`${color} h-24 rounded-3xl flex flex-col items-center justify-center gap-1 border-b-4 border-black/20 shadow-lg active:scale-95 transition-all`}
    >
      <Icon size={28} className="text-slate-900" />
      <span className="text-[10px] font-black text-slate-900 uppercase">{label}</span>
    </button>
  );

  const QuickButton = ({ label, icon: Icon, color, onClick }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`${color} h-28 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all border-b-4 border-black/20`}
    >
      <Icon size={32} strokeWidth={2.5} className="text-slate-900" />
      <span className="text-xs font-black text-slate-900 uppercase leading-none">{label}</span>
    </button>
  );

  // MODAL DE CONFIRMACIÓN (Diseño según capturas)
  const ConfirmationModal = ({ title, subtext, onYes, onNo, yesLabel, noLabel }: any) => (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <div className="bg-[#1e293b] p-10 rounded-[45px] border border-slate-700 shadow-2xl max-w-sm w-full text-center">
        <div className="bg-[#facc15] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-yellow-400/30">
          <Send size={42} className="text-slate-900" />
        </div>
        <h3 className="text-[22px] font-black text-white uppercase italic mb-3 tracking-tighter leading-tight">{title}</h3>
        <p className="text-slate-400 text-[11px] font-bold mb-10 uppercase tracking-[0.1em] leading-relaxed px-2">
          {subtext}
        </p>
        <div className="flex flex-col gap-4">
          <button 
            onClick={onYes}
            className="bg-[#facc15] text-[#0f172a] py-5 rounded-[22px] font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-transform"
          >
            {yesLabel}
          </button>
          <button 
            onClick={onNo}
            disabled={isSubmitting}
            className="bg-[#2d3748] text-slate-400 py-5 rounded-[22px] font-black uppercase tracking-widest text-xs border-2 border-slate-100 active:scale-95 transition-transform"
          >
            {isSubmitting ? "ENVIANDO..." : noLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (menu === 'confirm_photo') {
    return (
      <ConfirmationModal 
        title="¿AGREGAR FOTO DEL TRÁFICO?"
        subtext="UNA FOTO AYUDA A OTROS CONDUCTORES A VISUALIZAR MEJOR EL EMBOTELLAMIENTO."
        yesLabel="SÍ, AGREGAR"
        noLabel="NO, SOLO COMENTAR"
        onYes={() => {
          setMenu('details');
          setTimeout(() => fileInputRef.current?.click(), 300);
        }}
        onNo={() => setMenu('details')}
      />
    );
  }

  if (menu === 'confirm_comment') {
    return (
      <ConfirmationModal 
        title="¿AGREGAR COMENTARIO?"
        subtext="UN COMENTARIO AYUDA A OTROS CONDUCTORES A ENTENDER MEJOR LA SITUACIÓN."
        yesLabel="SÍ, AGREGAR"
        noLabel="NO, ENVIAR YA"
        onYes={() => {
          setMenu('details');
          setTimeout(() => commentRef.current?.focus(), 100);
        }}
        onNo={executeSend}
      />
    );
  }

  // PANTALLA DE DETALLES (Según captura de "Accidente")
  if (menu === 'details') {
    return (
      <div className="p-6 bg-[#0f172a] h-full flex flex-col overflow-y-auto">
        <div className="flex justify-between items-center mb-10">
          <button onClick={() => setMenu('main')} className="text-slate-400 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={18} /> CAMBIAR TIPO
          </button>
          <div className="bg-slate-900 border border-yellow-400/30 px-5 py-2 rounded-full shadow-lg">
            <span className="text-[11px] font-black text-yellow-400 uppercase italic tracking-tighter">
              {selectedType}
            </span>
          </div>
        </div>

        <div className="space-y-10 flex-1">
          {/* Sección Fotos */}
          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">FOTOS (MÁX 4)</label>
            <div className="grid grid-cols-4 gap-3">
              {photos.map((p, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-slate-800 border-2 border-slate-700 relative overflow-hidden group">
                  <img src={p} className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full shadow-lg">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl bg-slate-800/50 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-500 active:border-yellow-400 transition-all"
                >
                  <Camera size={24} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">AÑADIR</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
          </div>

          {/* Sección Comentario */}
          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">¿QUÉ ESTÁ PASANDO?</label>
            <div className="bg-[#1e293b] rounded-[35px] border-2 border-slate-700/50 shadow-inner overflow-hidden p-1 focus-within:border-yellow-400 transition-colors">
              <textarea
                ref={commentRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe aquí..."
                className="w-full bg-transparent text-white p-5 font-bold text-base h-40 resize-none placeholder:text-slate-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-10 pb-4">
          <button
            onClick={validateAndSend}
            disabled={isSubmitting || !coords}
            className="w-full bg-[#facc15] text-[#0f172a] py-6 rounded-full font-black uppercase tracking-[0.15em] flex items-center justify-center gap-4 shadow-[0_15px_35px_-10px_rgba(250,204,21,0.3)] active:scale-95 transition-all"
          >
            {isSubmitting ? "ENVIANDO..." : <><Send size={24} strokeWidth={2.5} /> ENVIAR REPORTE</>}
          </button>
        </div>
      </div>
    );
  }

  // MENÚS DE CATEGORÍAS
  if (menu === 'traffic') {
    return (
      <div className="p-6 bg-slate-900 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setMenu('main')} className="text-slate-400 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={16} /> VOLVER
          </button>
          <h2 className="text-yellow-400 font-black text-lg uppercase italic tracking-tighter">TRÁFICO</h2>
          <div className="w-8" />
        </div>
        <div className="grid grid-cols-1 gap-4 flex-1">
          <QuickButton label="Tráfico Lento" icon={Gauge} color="bg-yellow-400" onClick={() => selectCategory('Tráfico Lento')} />
          <QuickButton label="Tráfico Pesado" icon={Gauge} color="bg-orange-500" onClick={() => selectCategory('Tráfico Pesado')} />
          <QuickButton label="Alto Total" icon={AlertOctagon} color="bg-red-500" onClick={() => selectCategory('Alto Total')} />
        </div>
      </div>
    );
  }

  if (menu === 'police') {
    return (
      <div className="p-6 bg-slate-900 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setMenu('main')} className="text-slate-400 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={16} /> VOLVER
          </button>
          <h2 className="text-blue-400 font-black text-lg uppercase italic tracking-tighter">POLICÍA</h2>
          <div className="w-8" />
        </div>
        <div className="grid grid-cols-1 gap-4 flex-1">
          <QuickButton label="Visible" icon={Shield} color="bg-blue-400" onClick={() => selectCategory('Policía Visible')} />
          <QuickButton label="Escondido" icon={Shield} color="bg-indigo-500" onClick={() => selectCategory('Policía Escondido')} />
          <QuickButton label="Carril Contrario" icon={Shield} color="bg-slate-400" onClick={() => selectCategory('Policía Contrario')} />
        </div>
      </div>
    );
  }

  if (menu === 'car') {
    return (
      <div className="p-6 bg-slate-900 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setMenu('main')} className="text-slate-400 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={16} /> VOLVER
          </button>
          <h2 className="text-slate-300 font-black text-lg uppercase italic tracking-tighter">VEHÍCULO</h2>
          <div className="w-8" />
        </div>
        <div className="grid grid-cols-1 gap-4 flex-1">
          <QuickButton label="En la vía" icon={Car} color="bg-slate-300" onClick={() => selectCategory('Vehículo en Vía')} />
          <QuickButton label="En el lateral" icon={Car} color="bg-slate-500" onClick={() => selectCategory('Vehículo en Lateral')} />
        </div>
      </div>
    );
  }

  // MENÚ PRINCIPAL
  return (
    <div className="p-8 bg-[#0f172a] h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-[28px] font-black text-white uppercase italic leading-none tracking-tighter">REPORTAR</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">SELECCIONA CATEGORÍA</p>
        </div>
        <button type="button" onClick={onClose} className="p-3 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700 transition-colors">
          <X size={24}/>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <CategoryButton label="Tráfico" icon={Gauge} color="bg-yellow-400" onClick={() => setMenu('traffic')} />
        <CategoryButton label="Policía" icon={Shield} color="bg-blue-500" onClick={() => setMenu('police')} />
        <CategoryButton label="Vehículo" icon={Car} color="bg-slate-400" onClick={() => setMenu('car')} />
        <QuickButton label="Accidente" icon={AlertOctagon} color="bg-red-600" onClick={() => selectCategory('Accidente')} />
        <QuickButton label="Obras" icon={HardHat} color="bg-orange-400" onClick={() => selectCategory('Obras')} />
        <QuickButton label="Clima" icon={AlertOctagon} color="bg-blue-300" onClick={() => selectCategory('Clima')} />
      </div>

      <div className="flex items-center justify-center gap-3 text-slate-600 text-[11px] font-black uppercase tracking-widest pt-4 pb-8">
        <MapPin size={14} className={coords ? "text-emerald-500" : "animate-pulse"} />
        {coords ? "GPS ACTIVADO" : "BUSCANDO UBICACIÓN..."}
      </div>
    </div>
  );
};

export default ReportForm;
