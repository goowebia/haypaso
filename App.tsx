
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import ChatPanel from './components/ChatPanel';
import { Plus, Navigation, RefreshCw } from 'lucide-react';

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

  const watchId = useRef<number | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      // BARRIDO: Obtenemos reportes y validaciones con una sola query eficiente
      const { data: reportsData, error: reportsError } = await supabase
        .from('reportes')
        .select(`
          *,
          validaciones (voto)
        `)
        .eq('estatus', 'activo')
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error("Error Supabase:", reportsError.message);
        return;
      }

      if (reportsData) {
        const processedReports: Report[] = reportsData.map((r: any) => {
          const sigue = r.validaciones?.filter((v: any) => v.voto === 'sigue').length || 0;
          const despejado = r.validaciones?.filter((v: any) => v.voto === 'despejado').length || 0;
          return {
            ...r,
            votos_sigue: sigue,
            votos_despejado: despejado
          };
        });

        // AUTO-LIMPIEZA: Si hay más de 3 votos 'despejado' y estos superan a 'sigue', se ocultan
        const visibleReports = processedReports.filter(r => {
           if (r.votos_despejado > r.votos_sigue && r.votos_despejado >= 2) return false;
           return true;
        });
        
        setReports(visibleReports);
      }
    } catch (err) {
      console.error("Error crítico fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          if (followUser) {
            setMapCenter(coords);
            setMapZoom(15);
          }
        },
        (err) => console.error("Error GPS:", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    const channel = supabase
      .channel('public-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, () => fetchReports())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validaciones' }, () => fetchReports())
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

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden font-sans select-none text-slate-100">
      <div className="absolute inset-0 z-0">
        <MapView 
          reports={reports} 
          center={mapCenter} 
          zoom={mapZoom}
          userLocation={userLocation} 
          onMapInteraction={() => setFollowUser(false)} 
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-50">
        <Header onToggleChat={() => setChatOpen(!chatOpen)} />
      </div>

      <div className={`absolute top-0 right-0 h-full w-[85%] sm:w-[350px] z-[60] transition-transform duration-500 ease-in-out shadow-2xl ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>

      {chatOpen && <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[55]" onClick={() => setChatOpen(false)} />}

      {/* Botones Flotantes Lateral Derecho */}
      <div className="absolute right-6 bottom-[14vh] z-40 flex flex-col gap-4">
        <button 
          onClick={fetchReports}
          className="bg-slate-900/80 text-white p-4 rounded-full shadow-xl border border-white/10 backdrop-blur-md active:rotate-180 transition-transform"
        >
          <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
        </button>

        <button 
          onClick={toggleFollow}
          className={`p-4 rounded-full shadow-2xl active:scale-90 transition-all border-2 flex items-center justify-center ${
            followUser ? 'bg-yellow-400 text-slate-900 border-yellow-500' : 'bg-slate-900/80 text-yellow-400 border-yellow-400/20 backdrop-blur-md'
          }`}
        >
          <Navigation size={26} fill="currentColor" className="rotate-45" />
        </button>

        <button 
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-slate-900 p-5 rounded-full shadow-2xl active:scale-90 transition-all border-4 border-slate-900 flex items-center justify-center"
        >
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      {/* Panel de Reportes Inferior */}
      <div className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 transition-all duration-500 ease-out ${panelOpen ? 'h-[70vh]' : 'h-24 pb-[env(safe-area-inset-bottom)]'}`}>
        <div onClick={() => setPanelOpen(!panelOpen)} className="w-full flex flex-col items-center py-4 cursor-pointer">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3" />
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
            {panelOpen ? 'BAJAR PANEL' : `${reports.length} REPORTES CERCA`}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto h-full">
          <ReportList 
            reports={reports} 
            loading={loading} 
            onReportClick={(lat, lng) => {
              setFollowUser(false);
              setMapCenter([lat, lng]);
              setMapZoom(16);
              if (window.innerWidth < 768) setPanelOpen(false);
            }} 
          />
          <div className="h-32" />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl border border-white/10">
            <ReportForm onClose={(didSend) => {
              setShowForm(false);
              if(didSend) fetchReports();
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
