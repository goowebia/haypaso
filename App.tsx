
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
  'Policía Visible': 30,
  'Policía Escondido': 30,
  'Policía Contrario': 30,
  'Tráfico Lento': 20,
  'Tráfico Pesado': 20,
  'Alto Total': 20,
  'Camino Libre': 15,
  'Default': 30
};

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.2433, -103.7247]);
  const [mapZoom, setMapZoom] = useState(14);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { lat: number, lng: number }>>({});
  const [errorToast, setErrorToast] = useState<{ message: string, code?: string } | null>(null);
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
      console.error("Fetch Error:", err);
    } finally { setLoading(false); }
  }, [processReports]);

  // RASTREO DE USUARIOS (PRESENCIA)
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

  // SINCRONIZACIÓN REALTIME AGRESIVA (TODOS LOS EVENTOS)
  useEffect(() => {
    const channel = supabase.channel('realtime-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newR = payload.new as Report;
          setNewReportToast(newR);
          setNewlyAddedId(newR.id);
          if (soundEnabled && audioRef.current) { 
            audioRef.current.currentTime = 0; 
            audioRef.current.play().catch(() => {}); 
          }
          setTimeout(() => setNewReportToast(null), 5000);
        }
        fetchReports(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validaciones' }, () => fetchReports(true))
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports, soundEnabled]);

  // GEOLOCALIZACIÓN Y SEGUIMIENTO
  useEffect(() => {
    fetchReports();

    if ("geolocation" in navigator) {
      const handlePosition = (pos: GeolocationPosition) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        
        // Reportar presencia a otros
        if (presenceChannel.current) {
          presenceChannel.current.track({ lat: coords[0], lng: coords[1] });
        }

        // Seguir si el modo está activo
        if (followUser) {
          setMapCenter(coords);
        }
      };

      navigator.geolocation.getCurrentPosition(handlePosition, null, { enableHighAccuracy: true });

      watchId.current = navigator.geolocation.watchPosition(handlePosition, null, { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      });
    }

    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [followUser, fetchReports]);

  const handleBackgroundUpload = async (payload: any) => {
    setShowForm(false);
    setSelectedAdminCoords(null);
    
    // Optimistic UI: Mostrar inmediatamente
    const tempId = crypto.randomUUID();
    const tempReport = { ...payload, id: tempId, created_at: new Date().toISOString(), votos_sigue: 0, votos_despejado: 0, last_interaction: Date.now() };
    setReports(prev => [tempReport, ...prev]);

    try {
      const { error } = await supabase.from('reportes').insert([payload]);
      if (error) {
        setReports(prev => prev.filter(r => r.id !== tempId));
        setErrorToast({ message: error.message });
      } else {
        if (payload.tipo === 'Camino Libre') setShowClearSuccess(true);
        setTimeout(() => setShowClearSuccess(false), 3000);
        fetchReports(true);
      }
    } catch (err) { 
      setReports(prev => prev.filter(r => r.id !== tempId));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden select-none text-slate-100">
      <audio ref={audioRef} src={POP_SOUND_URL} preload="auto" />

      {errorToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] w-[90%] max-w-sm animate-in zoom-in">
          <div className="bg-red-600 text-white p-4 rounded-3xl shadow-2xl border-2 border-white/20">
            <p className="text-xs font-black uppercase text-center">{errorToast.message}</p>
            <button onClick={() => setErrorToast(null)} className="w-full mt-2 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase">OK</button>
          </div>
        </div>
      )}

      {showClearSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in zoom-in w-[90%] max-w-sm">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-white/20 flex items-center gap-4">
            <CheckCircle2 size={24} />
            <div><p className="text-sm font-black uppercase italic">Vía Actualizada</p></div>
          </div>
        </div>
      )}

      {newReportToast && !showClearSuccess && (
        <div onClick={() => { setFollowUser(false); setMapCenter([newReportToast.latitud, newReportToast.longitud]); setMapZoom(16); setNewReportToast(null); }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top w-[90%] max-w-sm cursor-pointer">
          <div className={`${newReportToast.tipo === 'Camino Libre' ? 'bg-emerald-500' : 'bg-[#FFCC00]'} text-slate-900 px-6 py-4 rounded-3xl border-2 border-white/20 flex items-center gap-4 shadow-2xl`}>
            {newReportToast.es_admin ? <ShieldAlert size={24} /> : <Plus size={24} />}
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase leading-none mb-1">{newReportToast.es_admin ? 'REPORTE OFICIAL' : 'AVISO NUEVO'}</p>
              <p className="text-sm font-black uppercase italic truncate">{newReportToast.tipo}</p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <MapView 
          reports={reports} center={mapCenter} zoom={mapZoom} userLocation={userLocation} onlineUsers={onlineUsers} 
          onMapInteraction={() => setFollowUser(false)} adminSelectionMode={isAdmin} 
          onAdminCoordsSelect={(lat, lng) => { if (isAdmin) { setSelectedAdminCoords([lat, lng]); setShowForm(true); } }} 
          selectedAdminCoords={selectedAdminCoords}
        />
      </div>
      
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header onToggleChat={() => setChatOpen(!chatOpen)} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} isAdmin={isAdmin} onAdminRequest={() => {
          if (isAdmin) setIsAdmin(false);
          else { const pin = prompt("Clave:"); if (pin === "admin123") setIsAdmin(true); }
        }} />
      </div>

      <div className={`absolute top-0 right-0 h-full w-[85%] sm:w-[350px] z-[60] transition-transform duration-500 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>

      <div className="absolute right-6 bottom-[14vh] z-40 flex flex-col gap-4">
        <button onClick={() => { if (userLocation) { setFollowUser(true); setMapCenter(userLocation); setMapZoom(15); } }} className={`p-4 rounded-full shadow-2xl active:scale-90 border-2 transition-all ${followUser ? 'bg-[#FFCC00] text-slate-900 border-white' : 'bg-slate-900/90 text-[#FFCC00] border-[#FFCC00]/40'}`}>
          <Navigation size={26} fill="currentColor" className="rotate-45" />
        </button>
        <button onClick={() => { setSelectedAdminCoords(null); setShowForm(true); }} className={`p-5 rounded-full shadow-2xl active:scale-90 transition-all border-4 border-slate-900 flex items-center justify-center ${isAdmin ? 'bg-red-500 text-white' : 'bg-[#FFCC00] text-slate-900'}`}>
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      <div className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 transition-all duration-500 ${panelOpen ? 'h-[70vh]' : 'h-24'}`}>
        <div onClick={() => setPanelOpen(!panelOpen)} className="w-full flex flex-col items-center py-4 cursor-pointer">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3" />
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">{panelOpen ? 'CERRAR LISTA' : `${reports.length} REPORTES CERCANOS`}</p>
        </div>
        <div className="flex-1 overflow-y-auto h-full px-1">
          <ReportList reports={reports} loading={loading} highlightId={newlyAddedId} onReportClick={(lat, lng) => { setFollowUser(false); setMapCenter([lat, lng]); setMapZoom(17); if (window.innerWidth < 768) setPanelOpen(false); }} />
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
