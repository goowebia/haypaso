
import React, { useState, useEffect, useRef } from 'react';
/* Added Loader2 to imports */
import { X, Camera, Send, MapPin, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';
import { ReportType } from '../types';

interface ReportFormProps {
  onClose: () => void;
}

const BUCKET_NAME = 'fotos_accidentes';

const ReportForm: React.FC<ReportFormProps> = ({ onClose }) => {
  const [tipo, setTipo] = useState<ReportType>('Tráfico Lento');
  const [descripcion, setDescripcion] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => setError("Activa tu ubicación para reportar."),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (imageFiles.length + files.length > 6) {
        alert("Máximo 6 fotos permitidas.");
        return;
      }

      const options = { maxSizeMB: 0.4, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressedFiles = await Promise.all(
        files.map(f => imageCompression(f, options))
      );
      setImageFiles(prev => [...prev, ...compressedFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) return setError("Esperando ubicación...");
    setIsSubmitting(true);
    setError(null);

    try {
      const uploadPromises = imageFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return data.publicUrl;
      });

      const photoUrls = await Promise.all(uploadPromises);

      const { error: dbError } = await supabase
        .from('reportes')
        .insert({
          tipo,
          descripcion,
          foto_url: JSON.stringify(photoUrls), // Guardamos como array JSON
          latitud: coords.lat,
          longitud: coords.lng,
          estatus: 'activo'
        });

      if (dbError) throw dbError;
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al enviar reporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white">REPORTE EN VIVO</h2>
        <button onClick={onClose} className="p-2 text-slate-400 bg-slate-800 rounded-full">
          <X size={24} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl mb-4 text-red-400 text-xs font-bold flex gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-2">
          {['Accidente Pesado', 'Obras', 'Tráfico Lento', 'Clima'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t as ReportType)}
              className={`py-3 px-2 rounded-xl border-2 font-black text-[10px] uppercase transition-all
                ${tipo === t 
                  ? 'bg-yellow-400 border-yellow-400 text-slate-900 shadow-lg' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <textarea
          required
          placeholder="Describe el incidente (e.g. Km 140 carril izquierdo bloqueado)"
          className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white font-bold text-sm focus:border-yellow-400 focus:outline-none min-h-[80px]"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        <div className="space-y-2">
          <label className="text-slate-400 text-[10px] font-black uppercase flex justify-between">
            Evidencia visual ({imageFiles.length}/6)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {imageFiles.map((f, i) => (
              <div key={i} className="aspect-square bg-slate-800 rounded-lg relative overflow-hidden border border-slate-700">
                <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImageFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-red-500 p-1 rounded-full text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {imageFiles.length < 6 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-yellow-400 hover:border-yellow-400 transition-colors"
              >
                <Camera size={24} />
                <span className="text-[8px] font-black mt-1">AÑADIR</span>
              </button>
            )}
          </div>
          <input type="file" ref={fileInputRef} multiple accept="image/*" capture="environment" className="hidden" onChange={handleImagesChange} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !coords}
          className="w-full bg-yellow-400 disabled:bg-slate-700 text-slate-900 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={24} /> REPORTAR AHORA</>}
        </button>
      </form>
    </div>
  );
};

export default ReportForm;
