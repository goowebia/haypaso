
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import { Plus, Zap, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.2433, -103.7247]);

  useEffect(() => {
    // Forzamos que la configuración esté lista de inmediato
    const timer = setTimeout(() => {
      setConfigReady(true);
      console.log("App configurada y lista");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchReports = useCallback(async () => {
    if (!configReady) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('reportes')
        .select('*, validaciones(voto)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
        if (data.length > 0) {
          setMapCenter([data[0].latitud, data[0].longitud]);
        }
      }
    } catch (err) {
      console.error("Error cargando reportes:", err);
    } finally {
      setLoading(false);
    }
  }, [configReady]);

  const simulateReport = async () => {
    const types = ['Accidente Pesado', 'Obras', 'Tráfico Lento', 'Clima'];
    const randomType = types[Math.floor(Math.random() * types.length)] as any;
    
    await supabase.from('reportes').insert({
      tipo: randomType,
      descripcion: `SIMULACIÓN: Incidente reportado en km ${Math.floor(Math.random() * 200)}`,
      latitud: 19.24 + (Math.random() - 0.5) * 0.1,
      longitud: -103.72 + (Math.random() - 0.5) * 0.1,
      estatus: 'activo'
    });
  };

  useEffect(() => {
    if (!configReady) return;
    fetchReports();
    
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, () => {
        fetchReports();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports, configReady]);

  if (!configReady) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400 mb-4" size={40} />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-slate-900 overflow-hidden font-sans select-none">
      <div className="absolute inset-0 z-0">
        <MapView reports={reports} center={mapCenter} />
      </div>

      <div className="absolute top-0 left-0 right-0 z-50">
        <Header />
      </div>

      <div className="absolute right-6 bottom-[24vh] z-50 flex flex-col gap-4">
        <button 
          onClick={simulateReport}
          className="bg-emerald-500 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-transform border-2 border-slate-900"
        >
          <Zap size={24} fill="currentColor" />
        </button>

        <button 
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-slate-900 p-5 rounded-full shadow-2xl shadow-yellow-400/40 active:scale-90 transition-transform border-2 border-slate-900"
        >
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      <div 
        className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 transition-all duration-500
          ${panelOpen ? 'h-[60vh]' : 'h-16'}`}
      >
        <div 
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex flex-col items-center py-3 cursor-pointer group"
        >
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-2 group-hover:bg-yellow-400 transition-colors" />
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
            {panelOpen ? 'Ocultar' : `${reports.length} reportes activos`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          <ReportList 
            reports={reports} 
            loading={loading} 
            onReportClick={(lat, lng) => {
              setMapCenter([lat, lng]);
              if (window.innerWidth < 768) setPanelOpen(false);
            }} 
          />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900 p-4 overflow-y-auto">
          <ReportForm onClose={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
};

export default App;
