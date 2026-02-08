
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getUserId } from './lib/supabase';
import { Report, ReportType } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import ChatPanel from './components/ChatPanel';
import { Plus, Navigation, Loader2, CheckCircle2, ShieldAlert, Crosshair, X as CloseIcon, AlertTriangle, AlertCircle, Database, Terminal, AlertOctagon } from 'lucide-react';

const POP_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

const DURATION_MAP: Record<string, number> = {
  'Accidente': 60,
  'Obras': 300,
  'Policía Visible': 20,
  'Policía Escondido': 20,
  'Policía Contrario': 20,
  'Tráfico Lento': 15,
  'Tráfico Pesado': 15,
  'Alto Total': 15,
  'Camino Libre': 10,
  'Default': 30
};

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.2433, -103.7247]);
  const [mapZoom, setMapZoom] = useState(12);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Estado para usuarios conectados
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { lat: number, lng: number }>>({});
  
  const [proximityAlert, setProximityAlert] = useState<Report | null>(null);
  const [errorToast, setErrorToast] = useState<{ message: string, code?: string } | null>(null);
  const announcedReports = useRef<Set<string>>(new Set());

  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAdminCoords, setSelectedAdminCoords] = useState<[number, number] | null>(null);
  
  const [newReportToast, setNewReportToast] = useState<Report | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [showClearSuccess, setShowClearSuccess] = useState(false);

  const watchId = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const presenceChannel = useRef<any>(null);

  const processReports = useCallback((reportsData: any[]) => {
    const now = Date.now();
    return reportsData.map((r: any) => {
      const validaciones = r.validaciones || [];
      const interactionTimes = [
        new Date(r.created_at).getTime(),
        ...validaciones.filter((v: any) => v.voto === 'sigue').map((v: any) => new Date(v.created_at).getTime())
      ].filter(t => !isNaN(t));
      
      const lastInteraction = interactionTimes.length > 0 ? Math.max(...interactionTimes) : now;

      return {
        ...r,
        votos_sigue: validaciones.filter((v: any) => v.voto === 'sigue').length,
        votos_despejado: validaciones.filter((v: any) => v.voto === 'despejado').length,
        last_interaction: lastInteraction
      };
    }).filter(r => {
      const durationMins = DURATION_MAP[r.tipo] || DURATION_MAP['Default'];
      const isExpired = (now - r.last_interaction) > (durationMins * 60 * 1000);
      return !isExpired;
    });
  }, []);

  const fetchReports = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const limitDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('reportes')
        .select(`*, validaciones (voto, created_at)`)
        .eq('estatus', 'activo')
        .gt('created_at', limitDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setReports(processReports(data));
    } catch (err: any) { 
      console.error("Error cargando reportes:", err);
      if (err.code === 'PGRST204') {
        setErrorToast({ message: "Falta la columna 'estatus' en tu base de datos.", code: err.code });
      }
    } 
    finally { setLoading(false); }
  }, [processReports]);

  // Sincronización de presencia de usuarios
  useEffect(() => {
    const channel = supabase.channel('presence-users', {
      config: { presence: { key: getUserId() } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: Record<string, { lat: number, lng: number }> = {};
        Object.keys(state).forEach((key) => {
          const userState = state[key][0] as any;
          if (userState.lat && userState.lng && key !== getUserId()) {
            users[key] = { lat: userState.lat, lng: userState.lng };
          }
        });
        setOnlineUsers(users);
      })
      .subscribe();

    presenceChannel.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(() => fetchReports(true), 45000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  useEffect(() => {
    const channel = supabase.channel('realtime-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reportes' }, (payload) => {
        const newR = payload.new as Report;
        setReports(prev => [ { ...newR, votos_sigue: 0, votos_despejado: 0, last_interaction: Date.now() }, ...prev.filter(r => r.id !== newR.id)]);
        setNewReportToast(newR);
        setNewlyAddedId(newR.id);
        if (soundEnabled && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
        setTimeout(() => setNewReportToast(null), 5000);
        setTimeout(() => fetchReports(true), 2000);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'validaciones' }, () => fetchReports(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports, soundEnabled]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      // Intento inicial rápido
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
        if (presenceChannel.current) {
          presenceChannel.current.track({ lat: coords[0], lng: coords[1] });
        }
      }, null, { enableHighAccuracy: true });

      // Monitoreo continuo
      watchId.current = navigator.geolocation.watchPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        
        // Tracking de presencia
        if (presenceChannel.current) {
          presenceChannel.current.track({ lat: coords[0], lng: coords[1] });
        }

        if (followUser) {
          setMapCenter(coords);
        }
      }, (err) => console.warn("GPS Error:", err), { 
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      });
    }
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [followUser]);

  const handleBackgroundUpload = async (payload: any) => {
    setShowForm(false);
    setSelectedAdminCoords(null);
    setErrorToast(null);
    
    const tempId = crypto.randomUUID();
    const tempReport = { ...payload, id: tempId, created_at: new Date().toISOString(), votos_sigue: 0, votos_despejado: 0, last_interaction: Date.now() };
    setReports(prev => [tempReport, ...prev]);

    try {
      const { error } = await supabase.from('reportes').insert([payload]);
      if (error) {
        setReports(prev => prev.filter(r => r.id !== tempId));
        setErrorToast({ message: error.message, code: error.code });
        setTimeout(() => setErrorToast(null), 15000);
      } else {
        if (payload.tipo === 'Camino Libre') setShowClearSuccess(true);
        setTimeout(() => setShowClearSuccess(false), 3000);
        fetchReports(true);
      }
    } catch (err) { 
      setReports(prev => prev.filter(r => r.id !== tempId));
      setErrorToast({ message: "Error de conexión." });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden select-none text-slate-100">
      <audio ref={audioRef} src={POP_SOUND_URL} preload="auto" />

      {errorToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] w-[95%] max-w-sm animate-in zoom-in slide-in-from-top-4">
          <div className="bg-red-600 text-white p-6 rounded-[2.5rem] shadow-[0_20px_60px_rgba(220,38,38,0.6)] border-2 border-white/30">
            <div className="flex items-center gap-3 mb-2">
              <AlertOctagon size={24} className="animate-pulse" />
              <p className="text-sm font-black uppercase italic tracking-tighter">ERROR ESTRUCTURAL</p>
            </div>
            <p className="text-[11px] font-bold leading-tight opacity-95 mb-4">
              {errorToast.code === 'PGRST204' ? (
                <>TU TABLA NO TIENE LA COLUMNA "ESTATUS". Ejecuta el script de reparación completa que está en el README de IA Studio ahora mismo.</>
              ) : errorToast.code === '42601' ? (
                <>ERROR DE COPIADO: Borra todo en Supabase y pega SOLO el código ALTER TABLE (sin títulos ni #).</>
              ) : (
                <>{errorToast.message} (Cod: {errorToast.code})</>
              )}
            </p>
            <button onClick={() => setErrorToast(null)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border border-white/10 transition-colors">CERRAR AVISO</button>
          </div>
        </div>
      )}

      {proximityAlert && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] w-[95%] max-w-md">
          <div className="bg-[#FFCC00] text-slate-900 px-6 py-5 rounded-[2rem] shadow-2xl border-4 border-white flex items-center gap-5">
            <AlertTriangle size={28} className="animate-pulse" />
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase opacity-70">Aviso Próximo</p>
              <h2 className="text-xl font-black uppercase italic leading-none">{proximityAlert.tipo}</h2>
            </div>
            <button onClick={() => setProximityAlert(null)} className="p-2 bg-black/10 rounded-full"><CloseIcon size={20} /></button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="fixed top-24 left-4 z-[50]">
          <div className="bg-red-500 text-white px-4 py-2 rounded-2xl font-black text-[10px] uppercase shadow-2xl border-2 border-white/20 flex items-center gap-2 animate-pulse">
            <Crosshair size={16} /> Toca el mapa para reportar en esa zona
          </div>
        </div>
      )}

      {showClearSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in zoom-in w-[90%] max-w-sm">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-white/20 flex items-center gap-4">
            <CheckCircle2 size={24} />
            <div><p className="text-sm font-black uppercase italic">Vía Despejada</p><p className="text-[10px] font-bold opacity-80 uppercase">Actualizado correctamente</p></div>
          </div>
        </div>
      )}

      {newReportToast && !showClearSuccess && !errorToast && (
        <div onClick={() => { setFollowUser(false); setMapCenter([newReportToast.latitud, newReportToast.longitud]); setMapZoom(16); setNewReportToast(null); }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top w-[90%] max-w-sm cursor-pointer">
          <div className={`${newReportToast.tipo === 'Camino Libre' ? 'bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.4)]' : 'bg-[#FFCC00] shadow-[0_10px_30px_rgba(250,204,21,0.4)]'} text-slate-900 px-6 py-4 rounded-3xl border-2 border-white/20 flex items-center gap-4`}>
            {newReportToast.es_admin ? <ShieldAlert size={24} /> : <Plus size={24} />}
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase leading-none mb-1">{newReportToast.es_admin ? 'OFICIAL' : 'NUEVO'}</p>
              <p className="text-sm font-black uppercase italic">{newReportToast.tipo}</p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <MapView 
          reports={reports} center={mapCenter} zoom={mapZoom} userLocation={userLocation} onlineUsers={onlineUsers} onMapInteraction={() => setFollowUser(false)} 
          adminSelectionMode={isAdmin} onAdminCoordsSelect={(lat, lng) => { if (isAdmin) { setSelectedAdminCoords([lat, lng]); setShowForm(true); } }} selectedAdminCoords={selectedAdminCoords}
        />
      </div>
      
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header onToggleChat={() => setChatOpen(!chatOpen)} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} isAdmin={isAdmin} onAdminRequest={() => {
          if (isAdmin) { setIsAdmin(false); setSelectedAdminCoords(null); }
          else { const pin = prompt("Clave de Despachador:"); if (pin === "admin123") setIsAdmin(true); }
        }} />
      </div>

      <div className={`absolute top-0 right-0 h-full w-[85%] sm:w-[350px] z-[60] transition-transform duration-500 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>

      <div className="absolute right-6 bottom-[14vh] z-40 flex flex-col gap-4">
        <button onClick={() => { if (userLocation) { setFollowUser(true); setMapCenter(userLocation); setMapZoom(15); } }} className={`p-4 rounded-full shadow-2xl active:scale-90 border-2 transition-all ${followUser ? 'bg-[#FFCC00] text-slate-900 border-[#E6B800]' : 'bg-slate-900/80 text-[#FFCC00] border-[#FFCC00]/20'}`}>
          <Navigation size={26} fill="currentColor" className="rotate-45" />
        </button>
        <button onClick={() => { setSelectedAdminCoords(null); setShowForm(true); }} className={`p-5 rounded-full shadow-2xl active:scale-90 transition-all border-4 border-slate-900 flex items-center justify-center ${isAdmin ? 'bg-red-500 text-white' : 'bg-[#FFCC00] text-slate-900'}`}>
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      <div className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 transition-all duration-500 ${panelOpen ? 'h-[70vh]' : 'h-24'}`}>
        <div onClick={() => setPanelOpen(!panelOpen)} className="w-full flex flex-col items-center py-4 cursor-pointer">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3" />
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">{panelOpen ? 'CERRAR LISTA' : `${reports.length} REPORTES ACTIVOS`}</p>
        </div>
        <div className="flex-1 overflow-y-auto h-full px-1">
          <ReportList reports={reports} loading={loading} highlightId={newlyAddedId} onReportClick={(lat, lng) => { setFollowUser(false); setMapCenter([lat, lng]); setMapZoom(16.5); if (window.innerWidth < 768) setPanelOpen(false); }} />
          <div className="h-32" />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl border border-white/10">
            <ReportForm 
              isAdmin={isAdmin} 
              externalCoords={selectedAdminCoords}
              currentUserLocation={userLocation}
              onClose={(didSend, payload) => { 
                if (didSend && payload) handleBackgroundUpload(payload); 
                else { setShowForm(false); setSelectedAdminCoords(null); }
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
