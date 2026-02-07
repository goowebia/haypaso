
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getUserId } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import ChatPanel from './components/ChatPanel';
import { Plus, Navigation, Loader2, CheckCircle2, ShieldAlert, Crosshair, X as CloseIcon, AlertTriangle } from 'lucide-react';

const PENDING_REPORTS_KEY = 'hay_paso_pending_reports';
const POP_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

// Función para calcular distancia en KM entre dos coordenadas (Fórmula Haversine)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
  const [mapZoom, setMapZoom] = useState(12);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Estados de Alerta Proximidad
  const [proximityAlert, setProximityAlert] = useState<Report | null>(null);
  const announcedReports = useRef<Set<string>>(new Set());

  // Estados de Administrador
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAdminCoords, setSelectedAdminCoords] = useState<[number, number] | null>(null);
  
  const [newReportToast, setNewReportToast] = useState<Report | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [showClearSuccess, setShowClearSuccess] = useState(false);

  const [bgUploadStatus, setBgUploadStatus] = useState<'idle' | 'uploading' | 'syncing' | 'success' | 'offline'>('idle');
  const watchId = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleAdminRequest = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setSelectedAdminCoords(null);
      return;
    }
    const pin = prompt("Ingrese clave de despachador:");
    if (pin === "admin123") {
      setIsAdmin(true);
    } else if (pin !== null) {
      alert("Acceso denegado");
    }
  };

  const fetchReports = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const limitDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: reportsData, error: reportsError } = await supabase
        .from('reportes')
        .select(`*, validaciones (voto)`)
        .eq('estatus', 'activo')
        .gt('created_at', limitDate)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      if (reportsData) {
        const processedReports: Report[] = reportsData.map((r: any) => {
          const validaciones = r.validaciones || [];
          return {
            ...r,
            votos_sigue: validaciones.filter((v: any) => v.voto === 'sigue').length,
            votos_despejado: validaciones.filter((v: any) => v.voto === 'despejado').length
          };
        });
        setReports(processedReports.filter(r => !(r.votos_despejado > r.votos_sigue && r.votos_despejado >= 2)));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  const playAlertSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Función de Síntesis de Voz
  const speak = (text: string) => {
    if (!soundEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Lógica de Alerta por Proximidad (Revisión cada 10 seg)
  useEffect(() => {
    const proximityCheck = setInterval(() => {
      if (!userLocation || reports.length === 0) return;

      reports.forEach(report => {
        // No alertar sobre "Camino Libre"
        if (report.tipo === 'Libre') return;

        const distance = getDistance(userLocation[0], userLocation[1], report.latitud, report.longitud);
        
        // Si está a menos de 1km y NO ha sido anunciado
        if (distance <= 1.0 && !announcedReports.current.has(report.id)) {
          announcedReports.current.add(report.id);
          setProximityAlert(report);
          
          // Alerta de voz
          speak(`Aviso: ${report.tipo} detectado adelante`);
          
          // Ocultar banner tras 6 segundos
          setTimeout(() => setProximityAlert(null), 6000);
        }
      });
    }, 10000);

    return () => clearInterval(proximityCheck);
  }, [userLocation, reports, soundEnabled]);

  useEffect(() => {
    const channel = supabase.channel('realtime-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reportes' }, (payload) => {
        const newReport = payload.new as Report;
        setReports(prev => prev.find(r => r.id === newReport.id) ? prev : [{...newReport, votos_sigue: 0, votos_despejado: 0}, ...prev]);
        setNewReportToast(newReport);
        setNewlyAddedId(newReport.id);
        playAlertSound();
        setTimeout(() => setNewReportToast(null), 5000);
        setTimeout(() => setNewlyAddedId(null), 10000);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reportes' }, async (payload) => {
        const oldData = payload.old as any;
        if (oldData?.fotos?.length > 0) {
          const paths = oldData.fotos.map((url: string) => url.split('/').pop()).filter(Boolean);
          await supabase.storage.from('imagenes').remove(paths);
        }
        fetchReports(true);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [playAlertSound, fetchReports]);

  const handleBackgroundUpload = async (payload: any) => {
    setShowForm(false);
    setSelectedAdminCoords(null);
    setBgUploadStatus('uploading');
    try {
      const { error } = await supabase.from('reportes').insert([payload]);
      if (!error) {
        setBgUploadStatus('success');
        if (payload.tipo === 'Libre') setShowClearSuccess(true);
        setTimeout(() => setShowClearSuccess(false), 4000);
        fetchReports(true);
      } else throw error;
      setTimeout(() => setBgUploadStatus('idle'), 3000);
    } catch (err) {
      setBgUploadStatus('offline');
      setTimeout(() => setBgUploadStatus('idle'), 3000);
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        if (followUser) setMapCenter(coords);
      }, null, { enableHighAccuracy: true });
    }
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [followUser]);

  const handleMapAdminSelect = (lat: number, lng: number) => {
    if (!isAdmin) return;
    setSelectedAdminCoords([lat, lng]);
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden select-none text-slate-100">
      <audio ref={audioRef} src={POP_SOUND_URL} preload="auto" />

      {/* BANNER DE ALERTA POR PROXIMIDAD */}
      {proximityAlert && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] w-[95%] max-w-md animate-in slide-in-from-top duration-500">
          <div className="bg-[#FFCC00] text-slate-900 px-6 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(255,204,0,0.3)] border-4 border-white flex items-center gap-5">
            <div className="bg-slate-900 p-3 rounded-2xl animate-pulse">
              <AlertTriangle size={28} className="text-[#FFCC00]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 opacity-70">Atención Conductor</p>
              <h2 className="text-xl font-black uppercase italic leading-none">{proximityAlert.tipo} a 1 KM</h2>
            </div>
            <button onClick={() => setProximityAlert(null)} className="p-2 bg-slate-900/10 rounded-full">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="fixed top-24 left-4 z-[50] pointer-events-none">
          <div className="bg-red-500 text-white px-4 py-2 rounded-2xl font-black text-[10px] uppercase shadow-2xl border-2 border-white/20 flex items-center gap-2 animate-pulse">
            <Crosshair size={16} /> Toca el mapa para reportar
          </div>
        </div>
      )}

      {showClearSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in zoom-in w-[90%] max-w-sm">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-2xl border-2 border-white/20 flex items-center gap-4">
            <CheckCircle2 size={24} />
            <div><p className="text-sm font-black uppercase italic leading-tight">Vía Libre</p><p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">Reporte actualizado</p></div>
          </div>
        </div>
      )}

      {newReportToast && !showClearSuccess && !proximityAlert && (
        <div onClick={() => { setFollowUser(false); setMapCenter([newReportToast.latitud, newReportToast.longitud]); setMapZoom(16); setNewReportToast(null); }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top w-[90%] max-w-sm cursor-pointer">
          <div className={`${newReportToast.tipo === 'Libre' ? 'bg-emerald-500' : 'bg-[#FFCC00]'} text-slate-900 px-6 py-4 rounded-3xl shadow-2xl border-2 border-white/20 flex items-center gap-4`}>
            {newReportToast.es_admin ? <ShieldAlert size={24} /> : <Plus size={24} />}
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase leading-none mb-1">{newReportToast.es_admin ? 'REPORTE OFICIAL' : 'NUEVO REPORTE'}</p>
              <p className="text-sm font-black uppercase italic leading-tight">{newReportToast.tipo}</p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <MapView 
          reports={reports} center={mapCenter} zoom={mapZoom} userLocation={userLocation} onlineUsers={{}} onMapInteraction={() => setFollowUser(false)} 
          adminSelectionMode={isAdmin} onAdminCoordsSelect={handleMapAdminSelect} selectedAdminCoords={selectedAdminCoords}
        />
      </div>
      
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header onToggleChat={() => setChatOpen(!chatOpen)} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} isAdmin={isAdmin} onAdminRequest={handleAdminRequest} />
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
        <div className="flex-1 overflow-y-auto h-full px-1 scroll-smooth">
          <ReportList reports={reports} loading={loading} highlightId={newlyAddedId} onReportClick={(lat, lng) => { setFollowUser(false); setMapCenter([lat, lng]); setMapZoom(16.5); if (window.innerWidth < 768) setPanelOpen(false); }} />
          <div className="h-32" />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl border border-white/10">
            <ReportForm 
              isAdmin={isAdmin} externalCoords={selectedAdminCoords}
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
