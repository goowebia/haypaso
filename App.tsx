
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import ChatPanel from './components/ChatPanel';
import { Plus, Navigation } from 'lucide-react';

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.2433, -103.7247]);
  const [mapZoom, setMapZoom] = useState(12);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      // Obtenemos los reportes y sus validaciones para contar votos
      const { data: reportsData, error: reportsError } = await supabase
        .from('reportes')
        .select(`
          *,
          validaciones (voto)
        `)
        .eq('estatus', 'activo')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

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

        // REGLA DE AUTO-LIMPIEZA: Si hay más votos de despejado que de sigue, se oculta.
        const visibleReports = processedReports.filter(r => r.votos_despejado <= r.votos_sigue);
        
        setReports(visibleReports);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
          setMapZoom(15.5);
        },
        (err) => console.error("Error GPS:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    fetchReports();
    updateLocation();

    // SUSCRIPCIÓN REALTIME UNIFICADA (Reportes y Validaciones)
    const channel = supabase
      .channel('app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, () => {
        fetchReports();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'validaciones' }, () => {
        fetchReports();
      })
      .subscribe();
      
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [fetchReports, updateLocation]);

  const handleCloseForm = (didSend: boolean = false) => {
    setShowForm(false);
    if (didSend) {
      setPanelOpen(true);
      fetchReports();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden font-sans select-none text-slate-100">
      {/* Mapa */}
      <div className="absolute inset-0 z-0">
        <MapView 
          reports={reports} 
          center={mapCenter} 
          zoom={mapZoom}
          userLocation={userLocation} 
        />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header onToggleChat={() => setChatOpen(!chatOpen)} />
      </div>

      {/* Panel de Chat Lateral */}
      <div 
        className={`absolute top-0 right-0 h-full w-[85%] sm:w-[350px] z-[60] transition-transform duration-500 ease-in-out shadow-2xl ${
          chatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>

      {/* Overlay para cerrar chat al tocar el mapa */}
      {chatOpen && (
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-[55] animate-in fade-in"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Botones Flotantes */}
      <div className="absolute right-6 bottom-[14vh] z-40 flex flex-col gap-4">
        <button 
          onClick={updateLocation}
          className="bg-slate-900/80 backdrop-blur-md text-yellow-400 p-4 rounded-full shadow-2xl active:scale-90 transition-all border-2 border-yellow-400/20 flex items-center justify-center"
        >
          <Navigation size={26} fill="currentColor" className="rotate-45" />
        </button>

        <button 
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-slate-900 p-5 rounded-full shadow-[0_0_40px_rgba(250,204,21,0.3)] active:scale-90 transition-all border-4 border-slate-900 flex items-center justify-center"
        >
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      {/* Panel Inferior */}
      <div 
        className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 transition-all duration-500 ease-out
          ${panelOpen ? 'h-[70vh]' : 'h-24 pb-[env(safe-area-inset-bottom)]'}`}
      >
        <div 
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex flex-col items-center py-4 cursor-pointer"
        >
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3" />
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
            {panelOpen ? 'BAJAR PANEL' : `${reports.length} REPORTES EN RUTA`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto h-full">
          <ReportList 
            reports={reports} 
            loading={loading} 
            onReportClick={(lat, lng) => {
              setMapCenter([lat, lng]);
              setMapZoom(14.5);
              if (window.innerWidth < 768) setPanelOpen(false);
            }} 
          />
          <div className="h-32" />
        </div>
      </div>

      {/* Formulario Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl border border-white/10">
            <ReportForm onClose={(didSend) => handleCloseForm(didSend)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
