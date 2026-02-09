import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';
import { 
  Navigation, Plus, Crosshair, Shield, AlertTriangle, CheckCircle, Gauge, X, Search,
  ThumbsUp, Check, Camera, Video, Play, Loader2, ChevronLeft, HardHat, Info, Box, Image as ImageIcon,
  Star, Volume2, VolumeX, MessageCircle
} from 'lucide-react';

// Forzar instancia global de Leaflet con plugins
const L = (window as any).L;

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

// --- COMPONENTES ---

const CompactRowCard: React.FC<{ 
  report: any, 
  onClick: (lat: number, lng: number) => void,
  onVote: () => void,
  onMediaClick: (url: string, type: 'image' | 'video') => void
}> = ({ report, onClick, onVote, onMediaClick }) => {
  const [voted, setVoted] = useState(false);

  const formatTime = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    return diff < 1 ? 'AHORA' : `${diff}M`;
  };

  const handleVote = async (e: any, v: string) => {
    e.stopPropagation();
    if (voted) return;
    setVoted(true);
    await supabase.from('validaciones').insert({ reporte_id: report.id, voto: v, usuario_id: getUserId() });
    onVote();
  };

  const getIcon = () => {
    const t = report.tipo.toLowerCase();
    if (t.includes('policía')) return <Shield size={14} />;
    if (t.includes('tráfico')) return <Gauge size={14} />;
    if (t.includes('libre')) return <CheckCircle size={14} />;
    return <AlertTriangle size={14} />;
  };

  const hasImg = report.fotos && report.fotos.length > 0;
  const hasVid = !!report.video_url;

  return (
    <div 
      onClick={() => onClick(report.latitud, report.longitud)}
      className={`flex items-center gap-3 p-3 bg-slate-800/40 backdrop-blur border-b border-white/5 active:bg-slate-700/60 transition-colors ${report.es_admin ? 'border-l-4 border-l-yellow-400' : ''}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${report.es_admin ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-black uppercase tracking-tighter ${report.es_admin ? 'text-yellow-400' : 'text-white'}`}>{report.tipo}</span>
          <span className="text-[8px] font-bold text-slate-500">{formatTime(report.created_at)}</span>
        </div>
        <p className="text-[11px] text-slate-400 truncate uppercase italic leading-none">{report.descripcion || 'Sin detalles'}</p>
        <div className="flex gap-2 mt-1.5">
          <button onClick={(e) => handleVote(e, 'sigue')} className="text-[8px] font-black bg-slate-700/50 px-2 py-0.5 rounded text-yellow-400 border border-yellow-400/20">SIGUE {report.votos_sigue}</button>
          <button onClick={(e) => handleVote(e, 'despejado')} className="text-[8px] font-black bg-slate-700/50 px-2 py-0.5 rounded text-emerald-400 border border-emerald-400/20">LIBRE {report.votos_despejado}</button>
        </div>
      </div>

      <div className="shrink-0">
        {hasImg ? (
          <div onClick={(e) => { e.stopPropagation(); onMediaClick(report.fotos[0], 'image'); }} className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden shadow-lg">
            <img src={report.fotos[0]} className="w-full h-full object-cover" />
          </div>
        ) : hasVid ? (
          <div onClick={(e) => { e.stopPropagation(); onMediaClick(report.video_url, 'video'); }} className="w-12 h-12 rounded-full border-2 border-white/20 bg-slate-700 flex items-center justify-center shadow-lg">
            <Play size={14} fill="white" className="text-white" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full border-2 border-white/5 bg-slate-900 flex items-center justify-center text-slate-700">
            <ImageIcon size={14} />
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [routeActive, setRouteActive] = useState(false);
  const [mediaOverlay, setMediaOverlay] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMenu, setActiveMenu] = useState('main');
  const [tempMedia, setTempMedia] = useState<any>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routingRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const longPressTimer = useRef<any>(null);

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
    if (!mapRef.current && mapContainerRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([19.05, -104.31], 13);
      L.tileLayer('https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}').addTo(map);
      mapRef.current = map;
      
      routingRef.current = L.Routing.control({
        waypoints: [],
        router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
        lineOptions: { styles: [{ color: '#3b82f6', weight: 8, opacity: 0.8 }] },
        show: false,
        addWaypoints: false,
        createMarker: () => null
      }).addTo(map);

      map.on('dragstart', () => setFollowUser(false));
    }
    fetchReports();
    const channel = supabase.channel('realtime-v18').on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, fetchReports).subscribe();
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
          if (followUser) mapRef.current.flyTo([lat, lng], 16);
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
    const geocoder = L.Control.Geocoder.nominatim({
        geocodingQueryParams: { countrycodes: 'mx', viewbox: '-104.5,19.2,-104.1,18.9', bounded: 1 }
    });
    geocoder.geocode(`${searchText}, Manzanillo, Colima`, (results: any[]) => {
      if (results && results.length > 0) {
        const dest = results[0].center;
        routingRef.current.setWaypoints([L.latLng(userLocation[0], userLocation[1]), L.latLng(dest.lat, dest.lng)]);
        mapRef.current?.flyTo([dest.lat, dest.lng], 15);
        setFollowUser(false);
        setRouteActive(true);
        setSearchText(results[0].name || searchText);
      } else {
        alert("Lugar no encontrado en Manzanillo.");
      }
    });
  };

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      const p = prompt("PIN:");
      if (p === "admin123") setIsAdmin(!isAdmin);
    }, 2000);
  };

  const endLongPress = () => clearTimeout(longPressTimer.current);

  const handleReport = async (tipo: string) => {
    if (!userLocation) return;
    setIsUploading(true);
    let finalMedia = null;
    if (tempMedia) {
      const fileName = `${Date.now()}.${tempMedia.type === 'image' ? 'jpg' : 'mp4'}`;
      const { data } = await supabase.storage.from('reportes').upload(fileName, tempMedia.blob);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('reportes').getPublicUrl(fileName);
        finalMedia = publicUrl;
      }
    }
    await supabase.from('reportes').insert([{
      tipo, latitud: userLocation[0], longitud: userLocation[1], estatus: 'activo', es_admin: isAdmin,
      fotos: tempMedia?.type === 'image' && finalMedia ? [finalMedia] : [],
      video_url: tempMedia?.type === 'video' && finalMedia ? finalMedia : null,
      descripcion: `Reporte: ${tipo}`
    }]);
    setIsUploading(false);
    setShowForm(false);
    setTempMedia(null);
    setActiveMenu('main');
    fetchReports();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden">
      
      {/* HEADER PREMIUM CON BUSCADOR INTEGRADO */}
      <header className="h-[80px] bg-slate-950 flex items-center px-4 gap-4 header-neon-border z-50 shrink-0">
        <div 
          onMouseDown={startLongPress} onMouseUp={endLongPress} 
          onTouchStart={startLongPress} onTouchEnd={endLongPress}
          className={`flex flex-col cursor-pointer active:scale-95 transition-transform shrink-0 ${isAdmin ? 'text-red-500' : 'text-yellow-400'}`}
        >
          <h1 className="text-2xl font-black italic tracking-tighter leading-none">HAY PASO</h1>
          <span className="text-[9px] font-black tracking-[0.3em] uppercase opacity-60">MANZANILLO</span>
        </div>

        <div className="flex-1 bg-white/5 border border-white/10 rounded-full h-12 flex items-center px-4 gap-3 focus-within:border-yellow-400/50 transition-all">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="¿A DÓNDE VAS?" 
            className="bg-transparent flex-1 text-white font-black text-sm uppercase focus:outline-none placeholder:text-slate-700"
          />
          <button onClick={handleSearch} className="bg-yellow-400 p-2 rounded-full text-slate-900 active:scale-90 transition-transform">
            <Navigation size={18} fill="currentColor" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 bg-slate-800 rounded-full text-slate-400 active:bg-slate-700"><Volume2 size={20} /></button>
          <button className="p-2.5 bg-slate-800 rounded-full text-slate-400 active:bg-slate-700"><MessageCircle size={20} /></button>
        </div>
      </header>

      {/* MAPA */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        
        {/* BOTÓN INICIAR RUTA FLOTANTE */}
        {routeActive && (
          <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
            <button onClick={() => { setFollowUser(true); setRouteActive(false); }} className="bg-emerald-500 text-white font-black uppercase px-6 py-3 rounded-full shadow-2xl border-2 border-white animate-bounce">Iniciar Ruta</button>
          </div>
        )}

        {/* FABs */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-4 z-40">
          <button onClick={() => setFollowUser(true)} className={`p-4 rounded-full shadow-2xl border-2 active:scale-90 transition-all ${followUser ? 'bg-blue-600 border-white text-white' : 'bg-white border-slate-200 text-blue-600'}`}>
            <Crosshair size={28} />
          </button>
          <button onClick={() => { setShowForm(true); setActiveMenu('main'); }} className="p-6 rounded-full shadow-2xl bg-yellow-400 text-slate-900 border-4 border-slate-900 active:scale-90 transition-all">
            <Plus size={36} strokeWidth={4} />
          </button>
        </div>
      </div>

      {/* PANEL DE REPORTES COMPACTO */}
      <div className="h-[35%] bg-slate-950/95 backdrop-blur-xl border-t border-white/10 flex flex-col shrink-0 z-40">
        <div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{reports.length} REPORTES EN VIVO</span>
          </div>
          <Star size={16} className="text-yellow-400" />
        </div>
        <div className="flex-1 real-scroll">
          {reports.map((r) => (
            <CompactRowCard key={r.id} report={r} onVote={fetchReports} onMediaClick={(url, type) => setMediaOverlay({ url, type })} onClick={(lat, lng) => { setFollowUser(false); mapRef.current?.flyTo([lat, lng], 17); }} />
          ))}
          <div className="h-20" /> {/* Espaciador final */}
        </div>
      </div>

      {/* MODAL REPORTE */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-[40px] p-8 border border-white/10 shadow-3xl relative flex flex-col gap-6 overflow-y-auto max-h-[90vh] no-scrollbar">
            <button onClick={() => activeMenu === 'main' ? setShowForm(false) : setActiveMenu('main')} className="absolute top-8 left-8 p-3 bg-slate-800 rounded-full text-slate-400">
              {activeMenu === 'main' ? <X size={24} /> : <ChevronLeft size={24} />}
            </button>
            <div className="mt-4 text-center">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">REPORTAR</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-800/50 rounded-3xl">
              <button onClick={() => document.getElementById('f-cam')?.click()} className="flex flex-col items-center gap-1 p-4 bg-yellow-400 rounded-2xl text-slate-900 font-black text-[10px] uppercase"><Camera size={24} />FOTO</button>
              <button onClick={() => document.getElementById('f-vid')?.click()} className="flex flex-col items-center gap-1 p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-[10px] uppercase"><Video size={24} />VIDEO</button>
              <input id="f-cam" type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { 
                const f = e.target.files?.[0]; if(f) { const c = await imageCompression(f, { maxSizeMB: 0.1 }); setTempMedia({ type: 'image', url: URL.createObjectURL(c), blob: c }); } 
              }} />
              <input id="f-vid" type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => { 
                const f = e.target.files?.[0]; if(f) setTempMedia({ type: 'video', url: URL.createObjectURL(f), blob: f }); 
              }} />
            </div>

            {activeMenu === 'main' ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: 'LIBRE', t: 'Camino Libre', i: CheckCircle, c: 'bg-emerald-500' },
                  { l: 'TRÁFICO', t: 'Tráfico', i: Gauge, c: 'bg-orange-500', s: 'traffic' },
                  { l: 'POLICÍA', t: 'Policía', i: Shield, c: 'bg-blue-600', s: 'police' },
                  { l: 'CHOQUE', t: 'Accidente', i: AlertTriangle, c: 'bg-red-500' },
                  { l: 'OBRAS', t: 'Obras', i: HardHat, c: 'bg-yellow-500' },
                  { l: 'OBJETO', t: 'Objeto', i: Box, c: 'bg-stone-600' }
                ].map(o => (
                  <button key={o.l} onClick={() => o.s ? setActiveMenu(o.s) : handleReport(o.t)} className={`${o.c} flex flex-col items-center justify-center p-3 rounded-3xl min-h-[90px] active:scale-95 transition-all shadow-lg`}>
                    <o.i size={24} className="text-white mb-2" />
                    <span className="text-[9px] font-black text-white uppercase text-center leading-none">{o.l}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(activeMenu === 'traffic' ? ['Lento', 'Pesado', 'Alto Total'] : ['Visible', 'Oculto', 'Otra vía']).map(m => (
                  <button key={m} onClick={() => handleReport(`${activeMenu === 'traffic' ? 'Tráfico' : 'Policía'} ${m}`)} className={`w-full py-5 rounded-3xl font-black text-white uppercase text-lg ${activeMenu === 'traffic' ? 'bg-orange-500' : 'bg-blue-600'}`}>{m}</button>
                ))}
              </div>
            )}
            {isUploading && <div className="flex items-center justify-center gap-3 text-yellow-400 font-black uppercase text-xs animate-pulse"><Loader2 className="animate-spin" />Sincronizando...</div>}
          </div>
        </div>
      )}

      {/* MEDIA OVERLAY */}
      {mediaOverlay && (
        <div className="fixed inset-0 z-[200] bg-black/98 flex items-center justify-center p-6" onClick={() => setMediaOverlay(null)}>
          <button className="absolute top-10 right-10 text-white"><X size={40} /></button>
          {mediaOverlay.type === 'image' ? <img src={mediaOverlay.url} className="max-w-full max-h-full rounded-2xl shadow-2xl" /> : <video src={mediaOverlay.url} controls autoPlay className="max-w-full max-h-full rounded-2xl shadow-2xl" />}
        </div>
      )}

    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
