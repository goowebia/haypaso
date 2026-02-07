
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getUserId } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import ChatPanel from './components/ChatPanel';
import { Plus, Navigation, Loader2, CheckCircle2, WifiOff, Download, X as CloseIcon } from 'lucide-react';

const PENDING_REPORTS_KEY = 'hay_paso_pending_reports';

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
  
  // PWA Installation
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Usuarios en vivo (Presence)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { lat: number, lng: number }>>({});
  
  // Estados de carga y sincronización
  const [bgUploadStatus, setBgUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'offline'>('idle');
  const watchId = useRef<number | null>(null);
  const myId = getUserId();

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

  // PWA Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Solo mostrar si no se ha ignorado antes en esta sesión y no estamos en standalone
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Manejo de Presence (Usuarios en Vivo)
  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: myId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users: Record<string, { lat: number, lng: number }> = {};
        
        Object.keys(newState).forEach((key) => {
          if (key === myId) return;
          const userPresence = newState[key][0] as any;
          if (userPresence.lat && userPresence.lng) {
            users[key] = { lat: userPresence.lat, lng: userPresence.lng };
          }
        });
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userLocation) {
          await channel.track({
            lat: userLocation[0],
            lng: userLocation[1],
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation, myId]);

  // Procesar reportes guardados en offline
  const processPendingReports = useCallback(async () => {
    if (!navigator.onLine) return;
    
    const stored = localStorage.getItem(PENDING_REPORTS_KEY);
    if (!stored) return;

    const pending = JSON.parse(stored);
    if (pending.length === 0) return;

    setBgUploadStatus('uploading');
    let successCount = 0;

    for (const payload of pending) {
      try {
        const { error } = await supabase.from('reportes').insert([payload]);
        if (!error) successCount++;
      } catch (err) {
        console.error("Error subiendo pendiente:", err);
      }
    }

    if (successCount > 0) {
      localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify([]));
      setBgUploadStatus('success');
      fetchReports(true);
      setTimeout(() => setBgUploadStatus('idle'), 4000);
    } else {
      setBgUploadStatus('idle');
    }
  }, [fetchReports]);

  // Manejador de envío (con soporte offline)
  const handleBackgroundUpload = async (payload: any) => {
    setShowForm(false);
    
    const finalPayload = {
      ...payload,
      latitud: payload.latitud || userLocation?.[0] || 19.2433,
      longitud: payload.longitud || userLocation?.[1] || -103.7247,
      created_at: new Date().toISOString()
    };

    if (!navigator.onLine) {
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
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchReports(true);
    }, 30000);

    const handleOnline = () => processPendingReports();
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
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

  const toggleFollow = () => {
    if (userLocation) {
      setFollowUser(true);
      setMapCenter(userLocation);
      setMapZoom(15);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden font-sans select-none text-slate-100">
      
      {/* Banner de Instalación (Android) */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-28 left-4 right-4 z-[100] animate-in slide-in-from-bottom duration-500">
          <div className="bg-slate-800 border-2 border-yellow-400/50 p-4 rounded-3xl shadow-2xl flex items-center justify-between backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 p-2 rounded-xl text-slate-900">
                <Download size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-tight text-white">Instalar App en el inicio</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acceso rápido y offline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleInstallClick}
                className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Instalar
              </button>
              <button onClick={() => setShowInstallBanner(false)} className="p-2 text-slate-500">
                <CloseIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sistema de Notificaciones Flotantes */}
      {bgUploadStatus !== 'idle' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-500 w-[90%] max-w-sm">
          <div className={`flex items-center gap-4 px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl border-2 ${
            bgUploadStatus === 'uploading' ? 'bg-slate-900/90 border-yellow-400' : 
            bgUploadStatus === 'offline' ? 'bg-orange-500/90 border-orange-400' :
            'bg-emerald-500/90 border-emerald-400'
          }`}>
            {bgUploadStatus === 'uploading' && (
              <><Loader2 className="animate-spin text-yellow-400" size={20} /><span className="text-[10px] font-black uppercase tracking-widest">Enviando...</span></>
            )}
            {bgUploadStatus === 'offline' && (
              <><WifiOff className="text-white" size={20} /><span className="text-[10px] font-black uppercase tracking-widest text-white text-center">Modo Offline. Guardado.</span></>
            )}
            {bgUploadStatus === 'success' && (
              <><CheckCircle2 className="text-white" size={20} /><span className="text-[10px] font-black uppercase tracking-widest text-white">✅ Reporte enviado</span></>
            )}
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
        <Header onToggleChat={() => setChatOpen(!chatOpen)} />
      </div>

      <div className={`absolute top-0 right-0 h-full w-[85%] sm:w-[350px] z-[60] transition-transform duration-500 ease-in-out shadow-2xl ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>

      <div className="absolute right-6 bottom-[14vh] z-40 flex flex-col gap-4">
        <button onClick={toggleFollow} className={`p-4 rounded-full shadow-2xl active:scale-90 transition-all border-2 flex items-center justify-center ${followUser ? 'bg-yellow-400 text-slate-900 border-yellow-500 shadow-yellow-400/40' : 'bg-slate-900/80 text-yellow-400 border-yellow-400/20 backdrop-blur-md'}`}>
          <Navigation size={26} fill="currentColor" className="rotate-45" />
        </button>

        <button onClick={() => setShowForm(true)} className="bg-yellow-400 text-slate-900 p-5 rounded-full shadow-[0_0_30px_rgba(250,204,21,0.4)] active:scale-90 transition-all border-4 border-slate-900 flex items-center justify-center">
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      <div className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 transition-all duration-500 ease-out ${panelOpen ? 'h-[70vh]' : 'h-24 pb-[env(safe-area-inset-bottom)]'}`}>
        <div onClick={() => setPanelOpen(!panelOpen)} className="w-full flex flex-col items-center py-4 cursor-pointer">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3 shadow-inner" />
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">{panelOpen ? 'BAJAR PANEL' : `${reports.length} ACTIVOS`}</p>
        </div>
        <div className="flex-1 overflow-y-auto h-full px-1">
          <ReportList reports={reports} loading={loading} onReportClick={(lat, lng) => { setFollowUser(false); setMapCenter([lat, lng]); setMapZoom(16.5); if (window.innerWidth < 768) setPanelOpen(false); }} />
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
