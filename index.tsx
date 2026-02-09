import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-control-geocoder';
import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';
import { 
  Navigation, 
  Plus, 
  Crosshair, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Gauge, 
  X,
  Star,
  Clock,
  ChevronUp,
  ChevronDown,
  Info,
  Maximize2,
  AlertCircle,
  Box,
  Search,
  ThumbsUp,
  Check,
  Camera,
  Video,
  Play,
  Loader2,
  ChevronLeft,
  HardHat,
  Image as ImageIcon
} from 'lucide-react';

// --- CONFIGURATION ---
const SB_URL = 'https://lgbdffqtijwyzkkbpkup.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYmRmZnF0aWp3eXpra2Jwa3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODA4MzgsImV4cCI6MjA4NTk1NjgzOH0.YyPG6Jvs5BSGeIV0kL_sfQWC7cz3zW7Qj-rsoyXKU7M';
const supabase = createClient(SB_URL, SB_KEY);

const getUserId = () => {
  let userId = localStorage.getItem('hay_paso_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('hay_paso_user_id', userId);
  }
  return userId;
};

// --- TYPES ---
interface Report {
  id: string;
  tipo: string;
  latitud: number;
  longitud: number;
  es_admin: boolean;
  fuente?: string;
  descripcion?: string;
  fotos?: string[];
  video_url?: string;
  created_at: string;
  votos_sigue?: number;
  votos_despejado?: number;
}

// --- SUB-COMPONENTS ---

// Added React.FC to explicitly support standard React props like 'key' in list rendering
const CompactRowReportCard: React.FC<{ 
  report: Report, 
  onClick: (lat: number, lng: number) => void,
  onVote: () => void,
  onMediaClick: (url: string, type: 'image' | 'video') => void
}> = ({ report, onClick, onVote, onMediaClick }) => {
  const [voted, setVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [localSigue, setLocalSigue] = useState(report.votos_sigue || 0);
  const [localDespejado, setLocalDespejado] = useState(report.votos_despejado || 0);

  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    if (diff < 1) return 'Ahora';
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h`;
  };

  const handleVote = async (e: React.MouseEvent, voto: 'sigue' | 'despejado') => {
    e.stopPropagation();
    if (voted || isVoting) return;
    setIsVoting(true);
    
    if (voto === 'sigue') setLocalSigue(prev => prev + 1);
    else setLocalDespejado(prev => prev + 1);

    try {
      const { error } = await supabase.from('validaciones').insert({ 
        reporte_id: report.id, 
        voto, 
        usuario_id: getUserId() 
      });
      if (error) throw error;
      setVoted(true);
      onVote();
    } catch (err) {
      if (voto === 'sigue') setLocalSigue(prev => prev - 1);
      else setLocalDespejado(prev => prev - 1);
    } finally {
      setIsVoting(false);
    }
  };

  const getIcon = () => {
    const t = report.tipo.toLowerCase();
    if (t.includes('policía')) return <Shield size={14} />;
    if (t.includes('tráfico')) return <Gauge size={14} />;
    if (t.includes('accidente')) return <AlertTriangle size={14} />;
    if (t.includes('obras')) return <HardHat size={14} />;
    if (t.includes('libre')) return <CheckCircle size={14} />;
    if (t.includes('bache')) return <AlertCircle size={14} />;
    if (t.includes('objeto')) return <Box size={14} />;
    return <Info size={14} />;
  };

  // VINCULACIÓN DE MEDIA CON CACHE BUSTING
  const hasImage = Array.isArray(report.fotos) && report.fotos.length > 0 && report.fotos[0];
  const hasVideo = report.video_url && report.video_url.trim() !== "";
  const cacheBust = `?t=${new Date(report.created_at).getTime()}`;

  return (
    <div 
      onClick={() => onClick(report.latitud, report.longitud)}
      className={`flex items-center gap-3 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl p-3 mb-2 transition-all active:scale-[0.98] hover:bg-slate-800/80 ${report.es_admin ? 'border-yellow-400/40 shadow-[0_0_10px_rgba(250,204,21,0.1)]' : ''}`}
    >
      {/* LEFT ICON */}
      <div className="shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${report.es_admin ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
          {getIcon()}
        </div>
      </div>

      {/* CENTER DETAILS */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`text-xs font-black uppercase truncate leading-none ${report.es_admin ? 'text-yellow-400' : 'text-white'}`}>{report.tipo}</h4>
          <span className="text-[9px] text-slate-500 font-bold uppercase shrink-0">
            {formatTimeAgo(report.created_at)}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase truncate italic mt-1 leading-none">
          {report.descripcion || 'Sin descripción'}
        </p>
        <div className="flex gap-2 mt-2">
          <button 
            onClick={(e) => handleVote(e, 'sigue')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all border ${voted ? 'bg-yellow-400 border-yellow-400 text-slate-900' : 'bg-slate-800/50 border-white/10 text-slate-400'}`}
          >
            <ThumbsUp size={10} /> {localSigue}
          </button>
          <button 
            onClick={(e) => handleVote(e, 'despejado')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all border ${voted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-800/50 border-white/10 text-slate-400'}`}
          >
            <Check size={10} /> {localDespejado}
          </button>
        </div>
      </div>

      {/* RIGHT MEDIA (CIRCLE) */}
      <div className="shrink-0">
        {hasImage ? (
          <div 
            onClick={(e) => { e.stopPropagation(); onMediaClick(report.fotos![0] + cacheBust, 'image'); }}
            className="w-14 h-14 rounded-full border-2 border-white/20 overflow-hidden shadow-xl cursor-pointer bg-slate-800 active:scale-90 transition-transform"
          >
            <img src={report.fotos![0] + cacheBust} className="w-full h-full object-cover" alt="Evidence" loading="lazy" />
          </div>
        ) : hasVideo ? (
          <div 
            onClick={(e) => { e.stopPropagation(); onMediaClick(report.video_url! + cacheBust, 'video'); }}
            className="w-14 h-14 rounded-full border-2 border-white/20 bg-slate-800 flex items-center justify-center shadow-xl cursor-pointer group active:scale-90 transition-transform relative"
          >
            <Play size={18} fill="white" className="text-white group-hover:scale-110 transition-transform" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full border-2 border-white/5 bg-slate-800/30 flex items-center justify-center text-slate-700">
            <ImageIcon size={18} />
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [comment, setComment] = useState('');
  const [mediaOverlay, setMediaOverlay] = useState<{ url: string, type: 'image' | 'video' } | null>(null);

  const [activeMenu, setActiveMenu] = useState<'main' | 'traffic' | 'police'>('main');
  const [isUploading, setIsUploading] = useState(false);
  const [tempMedia, setTempMedia] = useState<{ type: 'image' | 'video', url: string, blob: Blob | File } | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from('reportes')
      .select(`*, validaciones (voto)`)
      .eq('estatus', 'activo')
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      const processed = data.map((r: any) => ({
        ...r,
        votos_sigue: r.validaciones?.filter((v: any) => v.voto === 'sigue').length || 0,
        votos_despejado: r.validaciones?.filter((v: any) => v.voto === 'despejado').length || 0
      }));
      setReports(processed);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('root', { zoomControl: false, attributionControl: false })
        .setView([19.05, -104.31], 13);
      L.tileLayer('https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}').addTo(map);
      mapRef.current = map;
      map.on('dragstart', () => setFollowUser(false));
    }
    fetchReports();
    const channel = supabase.channel('reports-rt-v12').on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, () => fetchReports()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  useEffect(() => {
    if (!mapRef.current) return;
    const reportIds = new Set(reports.map(r => r.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!reportIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
    reports.forEach(r => {
      const color = r.es_admin ? '#FFCC00' : (r.tipo.includes('Policía') ? '#2563eb' : '#ef4444');
      const emoji = r.es_admin ? '⭐' : '📍';
      if (!markersRef.current[r.id]) {
        const icon = L.divIcon({
          className: 'report-marker',
          html: `<div style="background:${color}; width:28px; height:28px; border-radius:50%; border:2.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); pointer-events: none;">${emoji}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        markersRef.current[r.id] = L.marker([r.latitud, r.longitud], { icon }).addTo(mapRef.current!);
      }
    });
  }, [reports]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition((p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        setUserLocation([lat, lng]);
        if (mapRef.current) {
          if (!userMarkerRef.current) {
            const userIcon = L.divIcon({
              className: 'gps-marker-container',
              html: `<div class="user-marker-pulse"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapRef.current);
          } else {
            userMarkerRef.current.setLatLng([lat, lng]);
          }
          if (followUser) mapRef.current.flyTo([lat, lng], 16, { animate: true });
        }
      }, (err) => console.error(err), { enableHighAccuracy: true });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [followUser]);

  const handleCenterLocation = () => {
    setFollowUser(true);
    if (userLocation && mapRef.current) mapRef.current.flyTo(userLocation, 16, { animate: true });
  };

  const uploadMedia = async (file: File | Blob, type: 'image' | 'video'): Promise<string | null> => {
    const ext = type === 'image' ? 'jpg' : 'mp4';
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage.from('reportes').upload(filePath, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('reportes').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleReport = async (tipo: string, details?: string) => {
    if (!userLocation) return alert("Sincronizando GPS...");
    setIsUploading(true);

    let finalImageUrl: string | null = null;
    let finalVideoUrl: string | null = null;

    if (tempMedia) {
      const uploadedUrl = await uploadMedia(tempMedia.blob, tempMedia.type);
      if (tempMedia.type === 'image') finalImageUrl = uploadedUrl;
      else finalVideoUrl = uploadedUrl;
    }

    const { error } = await supabase.from('reportes').insert([{
      tipo, 
      latitud: userLocation[0], 
      longitud: userLocation[1],
      estatus: 'activo', 
      es_admin: isAdmin, 
      fuente: isAdmin ? 'OFICIAL' : 'COMUNIDAD',
      descripcion: details || comment || `Incidencia: ${tipo}`,
      fotos: finalImageUrl ? [finalImageUrl] : [],
      video_url: finalVideoUrl
    }]);

    setIsUploading(false);
    if (!error) {
      setShowForm(false);
      setComment('');
      setTempMedia(null);
      setActiveMenu('main');
      await fetchReports();
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'image') {
      const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      setTempMedia({ type, url: URL.createObjectURL(compressed), blob: compressed });
    } else {
      setTempMedia({ type, url: URL.createObjectURL(file), blob: file });
    }
  };

  const handleReportClick = (lat: number, lng: number) => {
    setFollowUser(false);
    if (mapRef.current) mapRef.current.flyTo([lat, lng], 17, { animate: true, duration: 1 });
    if (window.innerWidth < 768) setPanelOpen(false);
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden font-sans">
      {/* HEADER SEARCH */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[2000] pointer-events-none flex justify-center">
        <div className="w-full max-w-lg bg-white shadow-3xl rounded-full p-2 flex items-center pointer-events-auto border-2 border-slate-100">
           <div className="bg-slate-100 p-2.5 rounded-full text-slate-400 mr-3 shrink-0">
             <Search size={22} strokeWidth={3} />
           </div>
           <input 
             type="text" 
             placeholder="¿A DÓNDE VAS?" 
             className="w-full bg-transparent text-slate-900 font-black placeholder:text-slate-400 focus:outline-none text-sm px-1 uppercase tracking-wider"
           />
           <button 
             onClick={() => { const p = prompt("PIN:"); if(p === "admin123") setIsAdmin(!isAdmin); }}
             className={`p-3 rounded-full transition-all ml-1 shrink-0 ${isAdmin ? 'bg-red-500 text-white shadow-lg' : 'bg-yellow-400 text-slate-900 shadow-lg'}`}
           >
             <Navigation size={22} fill="currentColor" />
           </button>
        </div>
      </div>

      {/* FLOAT ACTIONS (GPS & PLUS) - HIDE WHEN PANEL IS OPEN */}
      <div className={`absolute bottom-32 right-6 z-[6000] flex flex-col gap-5 pointer-events-none items-center transition-all duration-500 ${panelOpen ? 'opacity-0 scale-75 translate-y-20' : 'opacity-100 scale-100 translate-y-0'}`}>
        <button 
          onClick={handleCenterLocation}
          className={`p-4 rounded-full shadow-2xl transition-all active:scale-90 pointer-events-auto border-2 ${followUser ? 'bg-blue-600 border-white text-white' : 'bg-white border-slate-200 text-blue-600'}`}
        >
          <Crosshair size={28} />
        </button>
        <button 
          onClick={() => { setShowForm(true); setActiveMenu('main'); }}
          className={`p-6 rounded-full shadow-2xl border-4 border-slate-900 active:scale-90 transition-all pointer-events-auto ${isAdmin ? 'bg-red-600 shadow-red-500/30' : 'bg-yellow-400 shadow-yellow-400/30'}`}
        >
          <Plus size={36} strokeWidth={4} className="text-slate-900" />
        </button>
      </div>

      {/* BOTTOM PANEL (LIST OF REPORTS) */}
      <div 
        className={`absolute left-0 right-0 bottom-0 z-[5000] bg-slate-950/95 backdrop-blur-3xl border-t border-white/10 transition-all duration-500 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] flex flex-col ${panelOpen ? 'h-[75vh]' : 'h-24'}`}
      >
        <div 
          onClick={() => setPanelOpen(!panelOpen)} 
          className="w-full flex flex-col items-center pt-4 pb-3 cursor-pointer shrink-0"
        >
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3" />
          <div className="flex items-center gap-3 px-8 w-full justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${reports.length > 0 ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
              <p className="text-[11px] text-slate-200 font-black uppercase tracking-[0.3em]">
                {reports.length} ACTIVOS EN RUTA
              </p>
            </div>
            {panelOpen ? <ChevronDown size={22} className="text-slate-500" /> : <ChevronUp size={22} className="text-slate-500" />}
          </div>
        </div>

        {/* INDEPENDENT SCROLL AREA */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar scroll-smooth">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center">
              <CheckCircle size={48} className="text-emerald-500 mb-5" />
              <p className="text-xs text-slate-300 font-black uppercase tracking-widest">Todo despejado</p>
            </div>
          ) : (
            <div className="pb-10">
              {reports.map((report) => (
                <CompactRowReportCard 
                  key={report.id}
                  report={report}
                  onClick={handleReportClick}
                  onVote={fetchReports}
                  onMediaClick={(url, type) => setMediaOverlay({ url, type })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MEDIA LIGHTBOX (FULLSCREEN) */}
      {mediaOverlay && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-300" onClick={() => setMediaOverlay(null)}>
          <button className="absolute top-10 right-10 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors active:scale-90"><X size={32} /></button>
          <div className="max-w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {mediaOverlay.type === 'image' ? (
              <img src={mediaOverlay.url} className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.9)] border border-white/10" alt="Evidence" />
            ) : (
              <video src={mediaOverlay.url} controls autoPlay className="max-w-full max-h-full rounded-3xl border border-white/10 shadow-2xl" />
            )}
          </div>
        </div>
      )}

      {/* REPORT MODAL (WITH SUBMENUS) */}
      {showForm && (
        <div className="fixed inset-0 z-[7000] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-[48px] p-8 border border-white/10 shadow-3xl relative flex flex-col gap-6 animate-in zoom-in duration-300 overflow-y-auto max-h-[92vh] no-scrollbar">
            <button 
              onClick={() => { if (activeMenu !== 'main') setActiveMenu('main'); else setShowForm(false); }} 
              className="absolute top-10 left-10 p-2.5 bg-slate-800 rounded-full text-slate-300 z-10 active:scale-90 transition-transform"
            >
              {activeMenu === 'main' ? <X size={22} /> : <ChevronLeft size={22} />}
            </button>
            
            <div className="mt-4 text-center">
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Reportar</h2>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${userLocation ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{userLocation ? 'SISTEMA LISTO' : 'GPS...'}</p>
              </div>
            </div>

            {/* INTEGRATED MULTIMEDIA SECTION */}
            <div className="flex flex-col gap-3 p-5 bg-slate-800/60 rounded-[40px] border border-white/5 shadow-inner">
              <p className="text-[11px] font-black text-yellow-400 uppercase tracking-[0.2em] text-center mb-1">EVIDENCIA REAL</p>
              <div className="flex gap-3">
                <button className="flex-1 flex flex-col items-center justify-center gap-2 p-5 bg-yellow-400 rounded-3xl active:scale-95 text-slate-900 font-black shadow-lg transition-transform" onClick={() => document.getElementById('cam-inp-v12')?.click()}>
                  <Camera size={28} /><span className="text-[10px] tracking-widest">FOTO</span>
                </button>
                <button className="flex-1 flex flex-col items-center justify-center gap-2 p-5 bg-white/10 border border-white/10 rounded-3xl active:scale-95 text-white font-black transition-transform" onClick={() => document.getElementById('vid-inp-v12')?.click()}>
                  <Video size={28} /><span className="text-[10px] tracking-widest">VIDEO</span>
                </button>
              </div>
              <input id="cam-inp-v12" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
              <input id="vid-inp-v12" type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />
              
              {tempMedia && (
                <div className="relative w-full h-14 rounded-2xl overflow-hidden border border-emerald-500/50 flex items-center px-4 bg-emerald-500/5 animate-in slide-in-from-top duration-300">
                  <CheckCircle className="text-emerald-500 mr-3" size={20} />
                  <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest truncate flex-1">Archivo preparado</span>
                  <button onClick={() => setTempMedia(null)} className="p-2 bg-red-600/20 text-red-500 rounded-full active:scale-90"><X size={14} /></button>
                </div>
              )}
            </div>

            {/* CATEGORY GRID OR SUBMENUS */}
            {activeMenu === 'main' ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'LIBRE', tipo: 'Camino Libre', icon: CheckCircle, color: 'bg-emerald-500' },
                  { label: 'TRÁFICO', tipo: 'Tráfico', icon: Gauge, color: 'bg-orange-500', sub: 'traffic' },
                  { label: 'POLICÍA', tipo: 'Policía', icon: Shield, color: 'bg-blue-600', sub: 'police' },
                  { label: 'ACCIDENTE', tipo: 'Accidente', icon: AlertTriangle, color: 'bg-red-500' },
                  { label: 'OBRAS', tipo: 'Obras', icon: HardHat, color: 'bg-yellow-500' },
                  { label: 'OBJETO', tipo: 'Objeto en camino', icon: Box, color: 'bg-stone-600' }
                ].map((opt) => (
                  <button 
                    key={opt.label}
                    onClick={() => { if (opt.sub === 'traffic') setActiveMenu('traffic'); else if (opt.sub === 'police') setActiveMenu('police'); else handleReport(opt.tipo); }}
                    className={`${opt.color} flex flex-col items-center justify-center p-3 rounded-[32px] min-h-[100px] active:scale-95 transition-all border-2 border-transparent hover:border-white/20 shadow-lg`}
                  >
                    <opt.icon size={24} className="text-white mb-2" />
                    <span className="text-[10px] font-black text-white uppercase text-center leading-tight tracking-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : activeMenu === 'traffic' ? (
              <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                <p className="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-2 text-center">NIVEL DE TRÁFICO</p>
                {['Tráfico Lento', 'Tráfico Pesado', 'Alto Total'].map(t => (
                  <button key={t} onClick={() => handleReport(t)} className="w-full py-5 bg-orange-500 rounded-[32px] text-white font-black uppercase text-lg shadow-lg active:scale-95 transition-transform">{t}</button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                <p className="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-2 text-center">TIPO DE OPERATIVO</p>
                {['Policía en la vía', 'Policía Oculto', 'Policía en la otra vía'].map(p => (
                  <button key={p} onClick={() => handleReport(p)} className="w-full py-5 bg-blue-600 rounded-[32px] text-white font-black uppercase text-lg shadow-lg active:scale-95 transition-transform">{p}</button>
                ))}
              </div>
            )}

            {activeMenu === 'main' && (
              <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="DETALLES (OPCIONAL)" 
                className="bg-slate-800 p-5 rounded-[36px] text-white text-xs font-bold uppercase h-24 focus:outline-none border border-white/5 placeholder:text-slate-700 resize-none shadow-inner" 
              />
            )}

            {isUploading && (
              <div className="flex items-center justify-center gap-3 text-yellow-400 animate-pulse py-2">
                <Loader2 size={26} className="animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-widest">SUBIENDO EVIDENCIA...</span>
              </div>
            )}
            
            {activeMenu === 'main' && (
               <button onClick={() => handleReport("General")} disabled={isUploading} className={`w-full py-5 rounded-[36px] font-black uppercase text-xl shadow-2xl active:scale-[0.98] transition-all border-2 border-white/10 ${isAdmin ? 'bg-red-600 text-white' : 'bg-yellow-400 text-slate-900'}`}>
                 Confirmar Reporte
               </button>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-routing-container { display: none !important; }
        .user-marker-pulse {
            width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%;
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); position: relative;
        }
        .user-marker-pulse::after {
            content: ''; position: absolute; top: -12px; left: -12px; right: -12px; bottom: -12px;
            border-radius: 50%; background: rgba(59, 130, 246, 0.2); animation: pulse-gps-fx 2s infinite ease-in-out;
        }
        @keyframes pulse-gps-fx { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);