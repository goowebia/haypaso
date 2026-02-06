
import React, { useState, useEffect } from 'react';
import { X, Shield, Car, AlertOctagon, HardHat, Gauge, Send, MapPin, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReportType } from '../types';

interface ReportFormProps {
  onClose: () => void;
}

type MenuState = 'main' | 'traffic' | 'police' | 'car';

const ReportForm: React.FC<ReportFormProps> = ({ onClose }) => {
  const [menu, setMenu] = useState<MenuState>('main');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  const sendReport = async (type: ReportType) => {
    if (!coords) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reportes').insert({
        tipo: type,
        descripcion: `Reporte rápido: ${type}`,
        latitud: coords.lat,
        longitud: coords.lng,
        estatus: 'activo'
      });
      if (error) throw error;
      onClose();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const QuickButton = ({ label, icon: Icon, color, onClick, subtext }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={isSubmitting || !coords}
      className={`${color} h-28 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all border-b-4 border-black/20`}
    >
      <Icon size={32} strokeWidth={2.5} className="text-slate-900" />
      <div className="flex flex-col">
        <span className="text-xs font-black text-slate-900 uppercase leading-none">{label}</span>
        {subtext && <span className="text-[8px] font-bold text-slate-900/60 uppercase mt-1">{subtext}</span>}
      </div>
    </button>
  );

  const CategoryButton = ({ label, icon: Icon, color, onClick }: any) => (
    <button
      onClick={onClick}
      className={`${color} h-24 rounded-3xl flex flex-col items-center justify-center gap-1 border-b-4 border-black/20 shadow-lg active:scale-95 transition-all`}
    >
      <Icon size={28} className="text-slate-900" />
      <span className="text-[10px] font-black text-slate-900 uppercase">{label}</span>
    </button>
  );

  if (menu === 'traffic') {
    return (
      <div className="p-6 bg-slate-900 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setMenu('main')} className="text-slate-400 flex items-center gap-2 font-bold uppercase text-[10px]">
            <ArrowLeft size={16} /> Volver
          </button>
          <h2 className="text-yellow-400 font-black text-lg uppercase italic">Tráfico</h2>
          <div className="w-8" />
        </div>
        <div className="grid grid-cols-1 gap-4 flex-1">
          <QuickButton label="Tráfico Lento" icon={Gauge} color="bg-yellow-400" onClick={() => sendReport('Tráfico Lento')} />
          <QuickButton label="Tráfico Pesado" icon={Gauge} color="bg-orange-500" onClick={() => sendReport('Tráfico Pesado')} />
          <QuickButton label="Alto Total" icon={AlertOctagon} color="bg-red-500" onClick={() => sendReport('Alto Total')} />
        </div>
      </div>
    );
  }

  if (menu === 'police') {
    return (
      <div className="p-6 bg-slate-900 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setMenu('main')} className="text-slate-400 flex items-center gap-2 font-bold uppercase text-[10px]">
            <ArrowLeft size={16} /> Volver
          </button>
          <h2 className="text-blue-400 font-black text-lg uppercase italic">Policía</h2>
          <div className="w-8" />
        </div>
        <div className="grid grid-cols-1 gap-4 flex-1">
          <QuickButton label="Visible" icon={Shield} color="bg-blue-400" onClick={() => sendReport('Policía Visible')} />
          <QuickButton label="Escondido" icon={Shield} color="bg-indigo-500" onClick={() => sendReport('Policía Escondido')} />
          <QuickButton label="Carril Contrario" icon={Shield} color="bg-slate-400" onClick={() => sendReport('Policía Contrario')} />
        </div>
      </div>
    );
  }

  if (menu === 'car') {
    return (
      <div className="p-6 bg-slate-900 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setMenu('main')} className="text-slate-400 flex items-center gap-2 font-bold uppercase text-[10px]">
            <ArrowLeft size={16} /> Volver
          </button>
          <h2 className="text-slate-300 font-black text-lg uppercase italic">Vehículo</h2>
          <div className="w-8" />
        </div>
        <div className="grid grid-cols-1 gap-4 flex-1">
          <QuickButton label="En la vía" icon={Car} color="bg-slate-300" onClick={() => sendReport('Vehículo en Vía')} />
          <QuickButton label="En el lateral" icon={Car} color="bg-slate-500" onClick={() => sendReport('Vehículo en Lateral')} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic leading-none tracking-tighter">Reportar</h2>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Categorías de incidentes</p>
        </div>
        <button type="button" onClick={onClose} className="p-2 bg-slate-800 text-slate-400 rounded-full">
          <X size={24}/>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <CategoryButton label="Tráfico" icon={Gauge} color="bg-yellow-400" onClick={() => setMenu('traffic')} />
        <CategoryButton label="Policía" icon={Shield} color="bg-blue-500" onClick={() => setMenu('police')} />
        <CategoryButton label="Vehículo" icon={Car} color="bg-slate-400" onClick={() => setMenu('car')} />
        <QuickButton label="Accidente" icon={AlertOctagon} color="bg-red-600" onClick={() => sendReport('Accidente')} />
        <QuickButton label="Obras" icon={HardHat} color="bg-orange-400" onClick={() => sendReport('Obras')} />
        <QuickButton label="Clima" icon={AlertOctagon} color="bg-blue-300" onClick={() => sendReport('Clima')} />
      </div>

      <div className="flex items-center justify-center gap-2 text-slate-600 text-[10px] font-bold uppercase pb-8 mt-4">
        <MapPin size={12} />
        {coords ? "GPS Activo" : "Buscando GPS..."}
      </div>
    </div>
  );
};

export default ReportForm;
