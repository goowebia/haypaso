
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import ChatPanel from './components/ChatPanel';
import { Plus, Navigation, Loader2, CheckCircle2 } from 'lucide-react';

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
  
  const [bgUploadStatus, setBgUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const watchId = useRef<number | null>(null);

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

  // Silent Refresh cada 30 segundos
  useEffect(() => {
    fetchReports();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchReports(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          if (followUser) setMapCenter(coords);
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    const channel = supabase
      .channel('realtime-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, () => fetchReports(true))
      .subscribe();
      
    return () => { 
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      supabase.removeChannel(channel); 
    };
  }, [fetchReports, followUser]);

  const toggleFollow = () => {
    if (userLocation) {
      setFollowUser(true);
      setMapCenter(userLocation);
      setMapZoom(15);
    }
  };

  const handleBackgroundUpload = async (payload: any) => {
    setShowForm(false);
    setBgUploadStatus('uploading');
    
    // Si no hay coordenadas en el payload, inyectamos la última ubicación o la de la ruta
    const finalPayload = {
      ...payload,
      latitud: payload.latitud || userLocation?.[0] || 19.2433,
      longitud: payload.longitud || userLocation?.[1] || -103.7247
    };

    try {
      const { error } = await supabase.from('reportes').insert([finalPayload]);
      if (error) throw error;
      setBgUploadStatus('success');
      fetchReports(true);
      setTimeout(() => setBgUploadStatus('idle'), 3000);
    } catch (err) {
      console.error("Upload failed:", err);
      setBgUploadStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden font-sans select-none text-slate-100">
      {bgUploadStatus !== 'idle' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl border ${
            bgUploadStatus === 'uploading' ? 'bg-slate-800/90 border-yellow-400/50' : 'bg-emerald-500/90 border-emerald-400'
          }`}>
            {bgUploadStatus === 'uploading' ? (
              <><Loader2 className="animate-spin text-yellow-400" size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Subiendo reporte...</span></>
            ) : (
              <><CheckCircle2 className="text-white" size={18} /><span className="text-[10px] font-black uppercase tracking-widest text-white">¡Listo!</span></>
            )}
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <MapView reports={reports} center={mapCenter} zoom={mapZoom} userLocation={userLocation} onMapInteraction={() => setFollowUser(false)} />
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
