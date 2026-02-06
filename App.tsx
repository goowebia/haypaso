
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import { Plus } from 'lucide-react';

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.2433, -103.7247]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reportes')
        .select('*')
        .eq('estatus', 'activo')
        .order('created_at', { ascending: false });

      if (!error && data) setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
      });
    }

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, () => {
        fetchReports();
      })
      .subscribe();
      
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [fetchReports]);

  // Función para manejar el cierre del formulario y abrir la lista
  const handleCloseForm = (didSend: boolean = false) => {
    setShowForm(false);
    if (didSend) {
      // Si se envió el reporte, abrimos el panel de la lista automáticamente
      setPanelOpen(true);
    }
  };

  return (
    <div className="relative h-screen w-screen bg-slate-900 overflow-hidden font-sans select-none">
      <div className="absolute inset-0 z-0">
        <MapView 
          reports={reports} 
          center={mapCenter} 
          userLocation={userLocation} 
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-50">
        <Header />
      </div>

      <div className="absolute right-6 bottom-[12vh] z-50">
        <button 
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-slate-900 p-5 rounded-full shadow-2xl active:scale-90 transition-transform border-4 border-slate-900"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      </div>

      <div 
        className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 transition-all duration-300
          ${panelOpen ? 'h-[60vh]' : 'h-20'}`}
      >
        <div 
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex flex-col items-center py-3 cursor-pointer"
        >
          <div className="w-12 h-1 bg-slate-700 rounded-full mb-2" />
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            {panelOpen ? 'CERRAR' : `${reports.length} REPORTES ACTIVOS`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pb-10 h-full">
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
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl border border-slate-700">
            <ReportForm onClose={(didSend) => handleCloseForm(didSend)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
