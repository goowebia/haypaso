
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getUserId } from './lib/supabase';
import { Report, ReportType } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import ChatPanel from './components/ChatPanel';
import { Plus, Navigation, CheckCircle2, Crosshair } from 'lucide-react';

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

// Función para calcular distancia en metros entre dos coordenadas
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
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
  const [locationAccuracy, setLocationAccuracy] = useState<number>(0);
  const [followUser, setFollowUser] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { lat: number, lng: number }>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAdminCoords, setSelectedAdminCoords] = useState<[number, number] | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const lastCenteredLocation = useRef<[number, number] | null>(null);
  const watchId = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const processReports = useCallback((reportsData: any[]) => {
    const now = Date.now();
    return reportsData.map((r: any) => {
      const validaciones = r.validaciones || [];
      const interactionTimes = [
        new Date(r.created_at).getTime(),
        ...validaciones.filter((v: any) => v.voto === 'sigue').map((v: any) => new Date(v.created_at).getTime())
      ].filter(t => !isNaN(t));
      
      const lastInteraction = interactionTimes.length > 0 ? Math.max(...interactionTimes) : new Date(r.created_at).getTime();

      return {
        ...r,
        votos_sigue: validaciones.filter((v: any) => v.voto === 'sigue').length,
        votos_despejado: validaciones.filter((v: any) => v.voto === 'despejado').length,
        last_interaction: lastInteraction
      };
    }).filter(r => {
      const durationMins = DURATION_MAP[r.tipo] || DURATION_MAP['Default'];
      const timeDiff = now - (r.last_interaction || now);
      return timeDiff < (durationMins * 60 * 1000);
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

  useEffect(() => {
    fetchReports();
    if ("geolocation" in navigator) {
      const handlePos = (pos: GeolocationPosition) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        
        setUserLocation([lat, lng]);
        setLocationAccuracy(accuracy);

        // LÓGICA DE FILTRADO: Solo centrar si followUser es true Y el movimiento es > 10 metros
        if (followUser) {
          if (!lastCenteredLocation.current) {
            setMapCenter([lat, lng]);
            lastCenteredLocation.current = [lat, lng];
          } else {
            const distance = calculateDistance(
              lat, lng, 
              lastCenteredLocation.current[0], 
              lastCenteredLocation.current[1]
            );
            
            if (distance > 10) {
              setMapCenter([lat, lng]);
              lastCenteredLocation.current = [lat, lng];
            }
          }
        }
      };
      
      navigator.geolocation.getCurrentPosition(handlePos, null, { enableHighAccuracy: true });
      watchId.current = navigator.geolocation.watchPosition(handlePos, (err) => console.warn(err), { 
        enableHighAccuracy: true,
        maximumAge: 500 
      });
    }
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [followUser, fetchReports]);

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setSelectedAdminCoords(null);
    } else {
      const pin = prompt("Clave de Despachador:");
      if (pin === "admin123") setIsAdmin(true);
      else if (pin !== null) alert("Clave incorrecta");
    }
  };

  const centerOnUser = () => {
    if (userLocation) {
      setFollowUser(true);
      setMapCenter([...userLocation]);
      setMapZoom(16);
      lastCenteredLocation.current = [...userLocation];
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden select-none text-slate-100">
      <audio ref={audioRef} src={POP_SOUND_URL} preload="auto" />

      {showSuccessToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in zoom-in w-[90%] max-w-sm">
          <div className="bg-emerald-500 text-white px-6 py-6 rounded-[3rem] shadow-2xl border-4 border-white/40 flex items-center gap-4 justify-center text-center">
            <CheckCircle2 size={32} />
            <p className="text-lg font-black uppercase italic tracking-tighter">Reporte Enviado</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <MapView 
          reports={reports} center={mapCenter} zoom={mapZoom} 
          userLocation={userLocation} accuracy={locationAccuracy}
          onlineUsers={onlineUsers} 
          onMapInteraction={() => setFollowUser(false)} 
          adminSelectionMode={isAdmin} 
          onAdminCoordsSelect={(lat, lng) => { if (isAdmin) { setSelectedAdminCoords([lat, lng]); setShowForm(true); } }} 
          selectedAdminCoords={selectedAdminCoords}
        />
      </div>
      
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header 
          onToggleChat={() => setChatOpen(!chatOpen)} 
          soundEnabled={soundEnabled} 
          onToggleSound={() => setSoundEnabled(!soundEnabled)} 
          isAdmin={isAdmin} 
          onAdminRequest={handleAdminToggle} 
        />
      </div>

      <div className={`absolute top-0 right-0 h-full w-[85%] sm:w-[350px] z-[60] transition-transform duration-500 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>

      <div className="absolute right-6 bottom-[14vh] z-40 flex flex-col gap-4">
        <button 
          onClick={centerOnUser} 
          className={`p-4 rounded-full shadow-2xl active:scale-90 border-2 transition-all duration-300 ${
            followUser 
            ? 'bg-[#FFCC00] text-slate-900 border-white shadow-[#FFCC00]/40' 
            : 'bg-slate-900/95 text-[#FFCC00] border-[#FFCC00]/40'
          }`}
        >
          {followUser ? <Navigation size={26} fill="currentColor" className="rotate-45" /> : <Crosshair size={26} />}
        </button>
        <button 
          onClick={() => { setSelectedAdminCoords(null); setShowForm(true); }} 
          className={`p-5 rounded-full shadow-2xl active:scale-90 transition-all border-4 border-slate-900 flex items-center justify-center ${
            isAdmin ? 'bg-red-500 text-white shadow-red-500/40' : 'bg-[#FFCC00] text-slate-900 shadow-[#FFCC00]/40'
          }`}
        >
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      <div className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 transition-all duration-500 ${panelOpen ? 'h-[70vh]' : 'h-24'}`}>
        <div onClick={() => setPanelOpen(!panelOpen)} className="w-full flex flex-col items-center py-4 cursor-pointer">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">{panelOpen ? 'BAJAR LISTA' : `${reports.length} ACTIVOS EN RUTA`}</p>
          </div>
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
                if (didSend && payload) {
                   supabase.from('reportes').insert([payload]).then(() => fetchReports(true));
                   setShowSuccessToast(true);
                   setTimeout(() => setShowSuccessToast(false), 3000);
                }
                setShowForm(false); 
                setSelectedAdminCoords(null); 
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
