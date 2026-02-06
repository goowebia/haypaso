
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Send, MapPin, Video, AlertCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../lib/supabase';
import { ReportType } from '../types';

interface ReportFormProps {
  onClose: () => void;
}

// Asegúrate de que este bucket existe en Supabase Storage y es público
const BUCKET_NAME = 'fotos_accidentes';

const ReportForm: React.FC<ReportFormProps> = ({ onClose }) => {
  const [tipo, setTipo] = useState<ReportType>('Tráfico Lento');
  const [descripcion, setDescripcion] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.error(err);
          setError("No pudimos obtener tu ubicación. Por favor actívala.");
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      try {
        const compressed = await imageCompression(originalFile, options);
        setImageFile(compressed);
      } catch (err) {
        console.error('Compression error:', err);
      }
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
          alert('El video es demasiado grande (máx 10MB)');
          return;
      }
      setVideoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
        setError("Ubicación necesaria para reportar");
        return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      let fotoUrl = '';
      let videoUrl = '';

      // Upload Image
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, imageFile);
        
        if (uploadError) {
          if (uploadError.message.includes('not found')) {
            throw new Error(`El bucket '${BUCKET_NAME}' no existe en Supabase Storage. Créalo y ponlo como público.`);
          }
          throw uploadError;
        }
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        fotoUrl = data.publicUrl;
      }

      // Upload Video (if applicable)
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Date.now()}_video.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, videoFile);
        
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        videoUrl = data.publicUrl;
      }

      // Create Report Record
      const { error: dbError } = await supabase
        .from('reportes')
        .insert({
          tipo,
          descripcion,
          foto_url: fotoUrl,
          video_url: videoUrl,
          latitud: coords.lat,
          longitud: coords.lng,
          estatus: 'activo'
        });

      if (dbError) throw dbError;
      
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al enviar reporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types: ReportType[] = ['Accidente Pesado', 'Obras', 'Tráfico Lento', 'Clima'];

  return (
    <div className="max-w-lg mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white">NUEVO REPORTE</h2>
        <button onClick={onClose} className="p-2 text-slate-400 bg-slate-800 rounded-full">
          <X size={24} />
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-500 p-4 rounded-xl mb-6 flex items-center gap-3 text-red-200 text-sm">
          <AlertCircle className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
            Tipo de Incidente
          </label>
          <div className="grid grid-cols-2 gap-2">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`py-4 px-3 rounded-xl border-2 font-bold text-sm transition-all text-center
                  ${tipo === t 
                    ? 'bg-yellow-400 border-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20' 
                    : 'bg-slate-800 border-slate-700 text-slate-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
            Descripción
          </label>
          <textarea
            required
            placeholder="¿Qué está pasando? (e.g. Choque entre dos camiones km 120)"
            className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-white focus:border-yellow-400 focus:outline-none min-h-[100px]"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
              Captura Foto
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors
                ${imageFile ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              {imageFile ? (
                <div className="text-center p-2">
                  <div className="text-xs mb-1 font-bold">CARGADA</div>
                </div>
              ) : (
                <>
                  <Camera size={32} className="mb-2" />
                  <span className="text-[10px] font-bold">FOTO</span>
                </>
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              capture="environment"
              onChange={handleImageChange}
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
              Captura Video
            </label>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className={`w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors
                ${videoFile ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              {videoFile ? (
                <div className="text-center p-2">
                  <div className="text-xs mb-1 font-bold">CARGADO</div>
                </div>
              ) : (
                <>
                  <Video size={32} className="mb-2" />
                  <span className="text-[10px] font-bold">VIDEO</span>
                </>
              )}
            </button>
            <input 
              type="file" 
              ref={videoInputRef} 
              accept="video/*" 
              className="hidden" 
              capture="environment"
              onChange={handleVideoChange}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
          <MapPin size={20} className={coords ? 'text-emerald-400' : 'text-slate-500 animate-pulse'} />
          <span className="text-xs text-slate-300 font-medium">
            {coords ? `Ubicación detectada: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Detectando ubicación..."}
          </span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !coords}
          className="w-full bg-yellow-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          ) : (
            <>
              <Send size={24} />
              ENVIAR REPORTE
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ReportForm;
