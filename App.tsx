import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getUserId } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import ChatPanel from './components/ChatPanel';
import { Plus, Navigation, Loader2, CheckCircle2, WifiOff, Download, X as CloseIcon, BellRing, AlertTriangle, CheckCircle } from 'lucide-react';

const PENDING_REPORTS_KEY = 'hay_paso_pending_reports';
const POP_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

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
  
  // Real-time notifications
  const [newReportToast, setNewReportToast] = useState<Report | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  // Success message specific for "Camino Libre"
  const [showClearSuccess, setShowClearSuccess] = useState(false);

  // PWA Installation
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Usuarios en vivo (Presence)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { lat: number, lng: number }>>({});
  
  // Estados de carga y sincronización
  // 'syncing' es el nuevo estado para cuando se procesan lotes offline con internet verificado
  const [bgUploadStatus, setBgUploadStatus] = useState<'idle' | 'uploading' | 'syncing' | 'success' | 'offline'>('idle');
  const watchId = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const myId = getUserId();

  const playAlertSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio blocked by browser", e));
    }
  }, [soundEnabled]);

  // Función para validar conexión real (Ping)
  const checkRealConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      // Intentamos un fetch ligero a un recurso conocido
      const response = await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors', 
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      return true;
    } catch (e) {
      return false;
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
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lógica de Sincronización de Pendientes (Offline -> Online)
  const processPendingReports = useCallback(async () => {
    const stored = localStorage.getItem(PENDING_REPORTS_KEY);
    if (!stored) return;
    
    let pending = JSON.parse(stored);
    if (pending.length === 0) return;

    // 1. Verificación básica y verficación real de internet
    if (!navigator.onLine) return;
    const hasQualityInternet = await checkRealConnection();
    if (!hasQualityInternet) return;

    // 2. Feedback visual de sincronización (Verde)
    setBgUploadStatus('syncing');

    // 3. Prioridad: 'Camino Libre' primero para limpiar el mapa rápido
    pending.sort((a: any, b: any) => (a.tipo === 'Camino Libre' ? -1 : 1));

    let successCount = 0;
    const currentQueue = [...pending];

    for (const payload of pending) {
      try {
        const { error } = await supabase.from('reportes').insert([payload]);
        if (!error) {
          successCount++;
          // 4. Limpieza Automática: Eliminar del array local tras éxito
          const idx = currentQueue.indexOf(payload);
          if (idx > -1) {
            currentQueue.splice(idx, 1);
            localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(currentQueue));
          }
        } else {
          // Si hay error de red, paramos el bucle para reintentar en 30s
          break;
        }
      } catch (err) {
        console.error("Error upload item:", err);
        break;
      }
    }

    if (successCount > 0) {
      setBgUploadStatus('success');
      fetchReports(true);
      setTimeout(() => setBgUploadStatus('idle'), 4000);
    } else {
      setBgUploadStatus('idle');
    }
  }, [fetchReports]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reportes' }, (payload) => {
        const newReport = payload.new as Report;
        setReports(prev => {
          if (prev.find(r => r.id === newReport.id)) return prev;
          return [{...newReport, votos_sigue: 0, votos_despejado: 0}, ...prev];
        });
        setNewReportToast(newReport);
        setNewlyAddedId(newReport.id);
        playAlertSound();
        setTimeout(() => setNewReportToast(null), 5000);
        setTimeout(() => setNewlyAddedId(null), 10000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [playAlertSound]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!window.matchMedia('(display-mode: standalone)').matches) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) setIsStandalone(true);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleBackgroundUpload = async (payload: any) => {
    setShowForm(false);
    const finalPayload = {
      ...payload,
      latitud: payload.latitud || userLocation?.[0] || 19.2433,
      longitud: payload.longitud || userLocation?.[1] || -103.7247,
      created_at: new Date().toISOString()
    };

    const isClearRoad = payload.tipo === 'Camino Libre';

    // Verificación real antes de intentar envío directo
    const isActuallyOnline = navigator.onLine && (await checkRealConnection());

    if (!isActuallyOnline) {
      const stored = JSON.parse(localStorage.getItem(PENDING_REPORTS_KEY) || '[]');
      localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify([...stored, finalPayload]));
      setBgUploadStatus('offline');
      setTimeout(() => setBgUploadStatus('idle'), 5000);
      return;
    }

    setBgUploadStatus('uploading');
    try {
      const { error } = await supabase.from('reportes').insert([finalPayload]);
      if (error) throw error;
      
      setBgUploadStatus('success');
      if (isClearRoad) {
        setShowClearSuccess(true);
        setTimeout(() => setShowClearSuccess(false), 4000);
      }
      
      fetchReports(true);
      setTimeout(() => setBgUploadStatus('idle'), 3000);
    } catch (err) {
      const stored = JSON.parse(localStorage.getItem(PENDING_REPORTS_KEY) || '[]');
      localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify([...stored, finalPayload]));
      setBgUploadStatus('offline');
    }
  };

  useEffect(() => {
    fetchReports();
    // Reintento Agresivo: Cada 30s intentamos sincronizar si hay pendientes
    const syncInterval = setInterval(() => {
      processPendingReports();
    }, 30000);

    const refreshInterval = setInterval(() => { 
      if (document.visibilityState === 'visible') fetchReports(true); 
    }, 60000);

    window.addEventListener('online', processPendingReports);

    return () => {
      clearInterval(syncInterval);
      clearInterval(refreshInterval);
      window.removeEventListener('online', processPendingReports);
    };
  }, [fetchReports, processPendingReports]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          if (followUser) setMapCenter(coords);
        },
        null,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, [followUser]);

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden font-sans select-none text-slate-100">
      <audio ref={audioRef} src={POP_SOUND_URL} preload="auto" />

      {/* Toast de agradecimiento Camino Libre */}
      {showClearSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] animate-in zoom-in fade-in duration-300 w-[90%] max-w-sm">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-[0_10px_40px_rgba(16,185,129,0.4)] border-2 border-white/20 flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-xl">
              <CheckCircle size={24} strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-black uppercase italic leading-tight">¡Gracias!</p>
              <p className="text-[10px] font-bold opacity-90 uppercase">Reportaste camino despejado</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Nuevo Reporte Real-time */}
      {newReportToast && !showClearSuccess && (
        <div 
          onClick={() => { setFollowUser(false); setMapCenter([newReportToast.latitud, newReportToast.longitud]); setMapZoom(16); setNewReportToast(null); }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top fade-in duration-500 w-[90%] max-w-sm cursor-pointer"
        >
          <div className={`${newReportToast.tipo === 'Camino Libre' ? 'bg-emerald-500' : 'bg-[#FFCC00]'} text-slate-900 px-6 py-4 rounded-3xl shadow-2xl border-2 border-white/20 flex items-center gap-4`}>
            <div className="bg-slate-900 p-2 rounded-xl text-white">
              {newReportToast.tipo === 'Camino Libre' ? <CheckCircle size={24} /> : <AlertTriangle size={24} strokeWidth={3} />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Nuevo Reporte</p>
              <p className="text-sm font-black uppercase italic leading-tight">{newReportToast.tipo}</p>
              <p className="text-[10px] font-bold opacity-80 uppercase truncate max-w-[180px]">{newReportToast.descripcion || 'Sin detalles'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Banner Instalación */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-28 left-4 right-4 z-[100] animate-in slide-in-from-bottom duration-500">
          <div className="bg-slate-800 border-2 border-[#FFCC00]/50 p-4 rounded-3xl shadow-2xl flex items-center justify-between backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="bg-[#FFCC00] p-2 rounded-xl text-slate-900 shadow-lg shadow-[#FFCC00]/20"><Download size={20} /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-tight text-white">Instalar Hay Paso</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Acceso directo y offline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleInstallClick} className="bg-[#FFCC00] text-slate-900 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-[#FFCC00]/20">Instalar</button>
              <button onClick={() => setShowInstallBanner(false)} className="p-2 text-slate-500"><CloseIcon size={18} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Sincronización Background Feedback */}
      {bgUploadStatus !== 'idle' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-500 w-[90%] max-w-sm">
          <div className={`flex items-center gap-4 px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl border-2 ${
            bgUploadStatus === 'uploading' ? 'bg-slate-900/90 border-[#FFCC00]' : 
            bgUploadStatus === 'syncing' ? 'bg-emerald-600/90 border-emerald-400' :
            bgUploadStatus === 'offline' ? 'bg-orange-500/90 border-orange-400' : 
            'bg-emerald-500/90 border-emerald-400'
          }`}>
            {bgUploadStatus === 'uploading' && (<><Loader2 className="animate-spin text-[#FFCC00]" size={20} /><span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span></>)}
            {bgUploadStatus === 'syncing' && (<><Loader2 className="animate-spin text-white" size={20} /><span className="text-[10px] font-black uppercase tracking-widest text-white">Sincronizando Reportes...</span></>)}
            {bgUploadStatus === 'offline' && (<><WifiOff className="text-white" size={20} /><span className="text-[10px] font-black uppercase tracking-widest text-white text-center">Guardado Offline</span></>)}
            {bgUploadStatus === 'success' && (<><CheckCircle2 className="text-white" size={20} /><span className="text-[10px] font-black uppercase tracking-widest text-white">✅ Sincronizado con Éxito</span></>)}
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <MapView 
          reports={reports} 
          center={mapCenter} 
          zoom={mapZoom} 
          userLocation={userLocation} 
          onlineUsers={onlineUsers}
          onMapInteraction={() => setFollowUser(false)} 
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-50">
        <Header onToggleChat={() => setChatOpen(!chatOpen)} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(!soundEnabled)} />
      </div>

      <div className={`absolute top-0 right-0 h-full w-[85%] sm:w-[350px] z-[60] transition-transform duration-500 ease-in-out shadow-2xl ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>

      <div className="absolute right-6 bottom-[14vh] z-40 flex flex-col gap-4">
        <button onClick={() => { if (userLocation) { setFollowUser(true); setMapCenter(userLocation); setMapZoom(15); } }} className={`p-4 rounded-full shadow-2xl active:scale-90 transition-all border-2 flex items-center justify-center ${followUser ? 'bg-[#FFCC00] text-slate-900 border-[#E6B800] shadow-[#FFCC00]/40' : 'bg-slate-900/80 text-[#FFCC00] border-[#FFCC00]/20 backdrop-blur-md'}`}>
          <Navigation size={26} fill="currentColor" className="rotate-45" />
        </button>
        <button onClick={() => setShowForm(true)} className="bg-[#FFCC00] text-slate-900 p-5 rounded-full shadow-[0_0_30px_rgba(255,204,0,0.4)] active:scale-90 transition-all border-4 border-slate-900 flex items-center justify-center">
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      <div className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 transition-all duration-500 ease-out ${panelOpen ? 'h-[70vh]' : 'h-24 pb-[env(safe-area-inset-bottom)]'}`}>
        <div onClick={() => setPanelOpen(!panelOpen)} className="w-full flex flex-col items-center py-4 cursor-pointer">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3 shadow-inner" />
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
            <ReportForm onClose={(didSend, payload) => { if (didSend && payload) handleBackgroundUpload(payload); else setShowForm(false); }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;