
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
  Search,
  ThumbsUp,
  Check,
  Camera,
  Video,
  Play,
  Loader2,
  ChevronLeft,
  HardHat,
  ChevronUp,
  ChevronDown,
  Info,
  AlertCircle,
  Box,
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

// --- COMPONENTES ---

const CompactRowReportCard: React.FC<{ 
  report: Report, 
  onClick: (lat: number, lng: number) => void,
  onVote: () => void,
  onMediaClick: (url: string, type: 'image' | 'video') => void
}> = ({ report, onClick, onVote, onMediaClick }) => {
  const [voted, setVoted] = useState(false);
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
    if (voted) return;
    
    if (voto === 'sigue') setLocalSigue(prev => prev + 1);
    else setLocalDespejado(prev => prev + 1);

    try {
      await supabase.from('validaciones').insert({ reporte_id: report.id, voto, usuario_id: getUserId() });
      setVoted(true);
      onVote();
    } catch (err) {
      if (voto === 'sigue') setLocalSigue(prev => prev - 1);
      else setLocalDespejado(prev => prev - 1);
    }
  };

  const getIcon = () => {
    const t = report.tipo.toLowerCase();
    if (t.includes('policía')) return <Shield size={14} />;
    if (t.includes('tráfico')) return <Gauge size={14} />;
    if (t.includes('accidente')) return <AlertTriangle size={14} />;
    if (t.includes('obras')) return <HardHat size={14} />;
    if (t.includes('libre')) return <CheckCircle size={14} />;
    return <Info size={14} />;
  };

  const hasImage = Array.isArray(report.fotos) && report.fotos.length > 0 && report.fotos[0];
  const hasVideo = report.video_url && report.video_url.trim() !== "";
  const cacheBust = `?t=${new Date(report.created_at).getTime()}`;

  return (
    <div 
      onClick={() => onClick(report.latitud, report.longitud)}
      className={`flex items-center gap-3 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl p-3 mb-2 transition-all active:scale-[0.98] hover:bg-slate-800/80 ${report.es_admin ? 'border-yellow-400/40 shadow-[0_0_10px_rgba(250,204,21,0.1)]' : ''}`}
    >
      <div className="shrink-0">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${report.es_admin ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-400 border border-white/5'}`}>
          {getIcon()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`text-[11px] font-black uppercase truncate leading-none ${report.es_admin ? 'text-yellow-400' : 'text-white'}`}>{report.tipo}</h4>
          <span className="text-[9px] text-slate-500 font-bold uppercase shrink-0">{formatTimeAgo(report.created_at)}</span>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase truncate italic mt-1 leading-none">{report.descripcion || 'Sin descripción'}</p>
        <div className="flex gap-2 mt-2">
          <button onClick={(e) => handleVote(e, 'sigue')} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${voted ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800/50 text-slate-400 border-white/10'}`}>
            <ThumbsUp size={10} /> {localSigue}
          </button>
          <button onClick={(e) => handleVote(e, 'despejado')} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${voted ? 'bg-emerald-500 text-white' : 'bg-slate-800/50 text-slate-400 border-white/10'}`}>
            <Check size={10} /> {localDespejado}
          </button>
        </div>
      </div>
      <div className="shrink-0">
        {hasImage ? (
          <div onClick={(e) => { e.stopPropagation(); onMediaClick(report.fotos![0] + cacheBust, 'image'); }} className="w-14 h-14 rounded-full border-2 border-white/20 overflow-hidden shadow-xl cursor-pointer active:scale-90 transition-transform">
            <img src={report.fotos![0] + cacheBust} className="w-full h-full object-cover" />
          </div>
        ) : hasVideo ? (
          <div onClick={(e) => { e.stopPropagation(); onMediaClick(report.video_url! + cacheBust, 'video'); }} className="w-14 h-14 rounded-full border-2 border-white/20 bg-slate-800 flex items-center justify-center shadow-xl cursor-pointer group active:scale-90 transition-transform">
            <Play size={18} fill="white" className="text-white" />
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
  const [searchText, setSearchText] = useState('');
  const [activeMenu, setActiveMenu] = useState<'main' | 'traffic' | 'police'>('main');
  const [isUploading, setIsUploading] = useState(false);
  const [tempMedia, setTempMedia] = useState<{ type: 'image' | 'video', url: string, blob: Blob | File } | null>(null);
  const [mediaOverlay, setMediaOverlay] = useState<{ url: string, type: 'image' | 'video' } | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const routingRef = useRef<any>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const fetchReports = useCallback(async () => {
    const { data } = await supabase.from('reportes').select(`*, validaciones (voto)`).eq('estatus', 'activo').order('created_at', { ascending: false });
    if (data) {
      setReports(data.map((r: any) => ({
        ...r,
        votos_sigue: r.validaciones?.filter((v: any) => v.voto === 'sigue').length || 0,
        votos_despejado: r.validaciones?.filter((v: any) => v.voto === 'despejado').length || 0
      })));
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('root', { zoomControl: false, attributionControl: false }).setView([19.05, -104.31], 13);
      L.tileLayer('https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}').addTo(map);
      mapRef.current = map;
      
      // Inicializar Control de Ruta
      routingRef.current = (L as any).Routing.control({
        waypoints: [],
        router: (L as any).Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
        lineOptions: { styles: [{ color: '#3b82f6', weight: 8, opacity: 0.7 }] },
        show: false,
        addWaypoints: false,
        createMarker: () => null
      }).addTo(map);

      map.on('dragstart', () => setFollowUser(false));
    }
    fetchReports();
    const channel = supabase.channel('realtime-v14').on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, fetchReports).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition((p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        setUserLocation([lat, lng]);
        if (mapRef.current) {
          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([lat, lng], { 
              icon: L.divIcon({ className: 'gps-marker-container', html: `<div class="user-marker-pulse"></div>`, iconSize: [20, 20], iconAnchor: [10, 10] }),
              zIndexOffset: 1000 
            }).addTo(mapRef.current);
          } else {
            userMarkerRef.current.setLatLng([lat, lng]);
          }
          if (followUser) mapRef.current.flyTo([lat, lng], 16, { animate: true });
          
          // Actualizar waypoint de inicio si hay ruta activa
          if (routingRef.current) {
            const wps = routingRef.current.getWaypoints();
            if (wps.length >= 2 && wps[1].latLng) {
               routingRef.current.spliceWaypoints(0, 1, L.latLng(lat, lng));
            }
          }
        }
      }, null, { enableHighAccuracy: true });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [followUser]);

  const handleSearch = () => {
    if (!searchText.trim() || !userLocation) return;
    const geocoder = (L as any).Control.Geocoder.nominatim();
    geocoder.geocode(searchText, (results: any[]) => {
      if (results && results.length > 0) {
        const dest = results[0].center;
        routingRef.current.setWaypoints([L.latLng(userLocation[0], userLocation[1]), L.latLng(dest.lat, dest.lng)]);
        mapRef.current?.flyTo([dest.lat, dest.lng], 15);
        setFollowUser(false);
      }
    });
  };

  const handleReport = async (tipo: string) => {
    if (!userLocation) return;
    setIsUploading(true);
    let finalImg = null;
    if (tempMedia) {
      const ext = tempMedia.type === 'image' ? 'jpg' : 'mp4';
      const fileName = `${Date.now()}.${ext}`;
      const { data } = await supabase.storage.from('reportes').upload(fileName, tempMedia.blob);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('reportes').getPublicUrl(fileName);
        finalImg = publicUrl;
      }
    }
    await supabase.from('reportes').insert([{
      tipo, latitud: userLocation[0], longitud: userLocation[1], estatus: 'activo', es_admin: isAdmin,
      fotos: tempMedia?.type === 'image' && finalImg ? [finalImg] : [],
      video_url: tempMedia?.type === 'video' && finalImg ? finalImg : null,
      descripcion: `Incidencia: ${tipo}`
    }]);
    setIsUploading(false);
    setShowForm(false);
    setTempMedia(null);
    setActiveMenu('main');
    fetchReports();
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden font-sans">
      {/* BARRA DE BÚSQUEDA REAL */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[2000] pointer-events-none flex justify-center">
        <div className="w-full max-w-lg bg-white shadow-3xl rounded-full p-2 flex items-center pointer-events-auto border-2 border-slate-100">
           <div className="bg-slate-100 p-2.5 rounded-full text-slate-400 mr-3 shrink-0"><Search size={22} strokeWidth={3} /></div>
           <input 
             type="text" 
             value={searchText}
             onChange={(e) => setSearchText(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
             placeholder="¿A DÓNDE VAS?" 
             className="w-full bg-transparent text-slate-900 font-black focus:outline-none text-sm px-1 uppercase tracking-wider"
           />
           <button onClick={() => { const p = prompt("PIN:"); if(p === "admin123") setIsAdmin(!isAdmin); }} className={`p-3 rounded-full transition-all ml-1 shrink-0 ${isAdmin ? 'bg-red-500 text-white' : 'bg-yellow-400 text-slate-900'}`}>
             <Navigation size={22} fill="currentColor" />
           </button>
        </div>
      </div>

      {/* FABs INTELIGENTES */}
      <div className={`absolute bottom-32 right-6 z-[6000] flex flex-col gap-5 pointer-events-none transition-all duration-500 ${panelOpen ? 'opacity-0 scale-75 translate-y-20' : 'opacity-100 scale-100 translate-y-0'}`}>
        <button onClick={() => setFollowUser(true)} className={`p-4 rounded-full shadow-2xl transition-all active:scale-90 border-2 pointer-events-auto ${followUser ? 'bg-blue-600 border-white text-white' : 'bg-white border-slate-200 text-blue-600'}`}>
          <Crosshair size={28} />
        </button>
        <button onClick={() => { setShowForm(true); setActiveMenu('main'); }} className="p-6 rounded-full shadow-2xl border-4 border-slate-900 active:scale-90 transition-all pointer-events-auto bg-yellow-400 shadow-yellow-400/30">
          <Plus size={36} strokeWidth={4} className="text-slate-900" />
        </button>
      </div>

      {/* PANEL DE LISTA CON SCROLL INDEPENDIENTE */}
      <div className={`absolute left-0 right-0 bottom-0 z-[5000] bg-slate-950/95 backdrop-blur-3xl border-t border-white/10 transition-all duration-500 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] flex flex-col ${panelOpen ? 'h-[75vh]' : 'h-24'}`}>
        <div onClick={() => setPanelOpen(!panelOpen)} className="w-full flex flex-col items-center pt-4 pb-3 cursor-pointer shrink-0">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3" />
          <div className="flex items-center gap-3 px-8 w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-emerald-500"></span>
              <p className="text-[11px] text-slate-200 font-black uppercase tracking-[0.3em]">{reports.length} ACTIVOS</p>
            </div>
            {panelOpen ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar scroll-smooth">
          {reports.map((r) => (
            <CompactRowReportCard key={r.id} report={r} onVote={fetchReports} onMediaClick={(url, type) => setMediaOverlay({ url, type })} onClick={(lat, lng) => { setFollowUser(false); mapRef.current?.flyTo([lat, lng], 17); setPanelOpen(false); }} />
          ))}
        </div>
      </div>

      {/* OVERLAY DE MEDIA */}
      {mediaOverlay && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setMediaOverlay(null)}>
          <button className="absolute top-10 right-10 p-4 bg-white/10 rounded-full text-white"><X size={32} /></button>
          <div className="max-w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {mediaOverlay.type === 'image' ? <img src={mediaOverlay.url} className="max-w-full max-h-full rounded-3xl" /> : <video src={mediaOverlay.url} controls autoPlay className="max-w-full max-h-full rounded-3xl" />}
          </div>
        </div>
      )}

      {/* FORMULARIO DE REPORTE */}
      {showForm && (
        <div className="fixed inset-0 z-[7000] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-[48px] p-8 border border-white/10 shadow-3xl relative flex flex-col gap-6 overflow-y-auto max-h-[92vh] no-scrollbar">
            <button onClick={() => activeMenu === 'main' ? setShowForm(false) : setActiveMenu('main')} className="absolute top-10 left-10 p-2.5 bg-slate-800 rounded-full text-slate-300">
              {activeMenu === 'main' ? <X size={22} /> : <ChevronLeft size={22} />}
            </button>
            <div className="mt-4 text-center">
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Reportar</h2>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">SISTEMA OK</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5 bg-slate-800/60 rounded-[40px] border border-white/5 shadow-inner">
               <p className="text-[11px] font-black text-yellow-400 uppercase tracking-[0.2em] text-center mb-1">SUBIR EVIDENCIA</p>
               <div className="flex gap-3">
                 <button onClick={() => document.getElementById('f-cam')?.click()} className="flex-1 flex flex-col items-center justify-center gap-2 p-5 bg-yellow-400 rounded-3xl active:scale-95 text-slate-900 font-black"><Camera size={28} /><span>FOTO</span></button>
                 <button onClick={() => document.getElementById('f-vid')?.click()} className="flex-1 flex flex-col items-center justify-center gap-2 p-5 bg-white/10 border border-white/10 rounded-3xl active:scale-95 text-white font-black"><Video size={28} /><span>VIDEO</span></button>
               </div>
               <input id="f-cam" type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { 
                 const f = e.target.files?.[0]; if(f) { const comp = await imageCompression(f, { maxSizeMB: 0.1 }); setTempMedia({ type: 'image', url: URL.createObjectURL(comp), blob: comp }); } 
               }} />
               <input id="f-vid" type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => { 
                 const f = e.target.files?.[0]; if(f) setTempMedia({ type: 'video', url: URL.createObjectURL(f), blob: f }); 
               }} />
               {tempMedia && <div className="flex items-center gap-2 bg-emerald-500/10 p-2 rounded-xl text-emerald-500 text-[10px] font-black uppercase"><CheckCircle size={14} /> Listo para enviar</div>}
            </div>
            {activeMenu === 'main' ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: 'LIBRE', t: 'Camino Libre', i: CheckCircle, c: 'bg-emerald-500' },
                  { l: 'TRÁFICO', t: 'Tráfico', i: Gauge, c: 'bg-orange-500', s: 'traffic' },
                  { l: 'POLICÍA', t: 'Policía', i: Shield, c: 'bg-blue-600', s: 'police' },
                  { l: 'ACCIDENTE', t: 'Accidente', i: AlertTriangle, c: 'bg-red-500' },
                  { l: 'OBRAS', t: 'Obras', i: HardHat, c: 'bg-yellow-500' },
                  { l: 'OBJETO', t: 'Objeto', i: Box, c: 'bg-stone-600' }
                ].map((o) => (
                  <button key={o.l} onClick={() => o.s ? setActiveMenu(o.s as any) : handleReport(o.t)} className={`${o.c} flex flex-col items-center justify-center p-3 rounded-[32px] min-h-[100px] active:scale-95 transition-all shadow-lg`}>
                    <o.i size={24} className="text-white mb-2" />
                    <span className="text-[10px] font-black text-white uppercase text-center">{o.l}</span>
                  </button>
                ))}
              </div>
            ) : activeMenu === 'traffic' ? (
              <div className="flex flex-col gap-3">
                {['Lento', 'Pesado', 'Alto Total'].map(t => <button key={t} onClick={() => handleReport(`Tráfico ${t}`)} className="w-full py-5 bg-orange-500 rounded-[32px] text-white font-black uppercase text-lg">{t}</button>)}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {['En la vía', 'Oculto', 'En la otra vía'].map(p => <button key={p} onClick={() => handleReport(`Policía ${p}`)} className="w-full py-5 bg-blue-600 rounded-[32px] text-white font-black uppercase text-lg">{p}</button>)}
              </div>
            )}
            {isUploading && <div className="flex items-center justify-center gap-3 text-yellow-400 animate-pulse"><Loader2 className="animate-spin" /><span>SUBIENDO...</span></div>}
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-routing-container { display: none !important; }
        .user-marker-pulse { width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); position: relative; }
        .user-marker-pulse::after { content: ''; position: absolute; top: -12px; left: -12px; right: -12px; bottom: -12px; border-radius: 50%; background: rgba(59, 130, 246, 0.2); animation: pulse-gps-fx 2s infinite; }
        @keyframes pulse-gps-fx { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
