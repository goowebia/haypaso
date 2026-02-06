
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

  // Verificación de configuración inicial para evitar "Blue Screen"
  useEffect(() => {
    const initApp = async () => {
      try {
        // Pequeña pausa para asegurar que el DOM y el entorno estén listos
        await new Promise(resolve => setTimeout(resolve, 500));
        setConfigReady(true);
      } catch (e) {
        console.error("Fallo al inicializar la app:", e);
      }
    };
    initApp();
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
    
    const { error } = await supabase
      .from('reportes')
      .insert({
        tipo: randomType,
        descripcion: `SIMULACIÓN: Reporte automático en carretera (${randomType})`,
        latitud: 19.05 + (Math.random() - 0.5) * 0.05,
        longitud: -103.72 + (Math.random() - 0.5) * 0.05,
        estatus: 'activo'
      });
    
    if (error) console.error("Error simulando:", error);
  };

  const handleReportClick = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
  };

  useEffect(() => {
    if (!configReady) return;
    
    fetchReports();
    
    const channel = supabase
      .channel('public:reportes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reportes' }, (payload) => {
        const nr = payload.new as Report;
        setReports(prev => [nr, ...prev]);
        setMapCenter([nr.latitud, nr.longitud]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reportes' }, (payload) => {
        const up = payload.new as Report;
        setReports(prev => prev.map(r => r.id === up.id ? up : r));
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports, configReady]);

  // Pantalla de carga preventiva (Evita la pantalla azul de Hostinger)
  if (!configReady) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-yellow-400 mb-4" size={48} />
        <h2 className="text-xl font-black tracking-tighter uppercase">Hay Paso</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 animate-pulse">
          Cargando configuración...
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-slate-900 overflow-hidden font-sans">
      {/* CAPA 1: MAPA */}
      <div className="absolute inset-0 z-0">
        <MapView reports={reports} center={mapCenter} />
      </div>

      {/* CAPA 2: HEADER */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header />
      </div>

      {/* BOTONES FLOTANTES */}
      <div className="absolute right-6 bottom-[22vh] z-50 flex flex-col gap-3">
        <button 
          onClick={simulateReport}
          className="bg-emerald-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-slate-900"
        >
          <Zap size={24} fill="currentColor" />
        </button>

        <button 
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-slate-900 p-5 rounded-full shadow-2xl shadow-yellow-400/40 hover:scale-110 active:scale-90 transition-all border-4 border-slate-900"
        >
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      {/* CAPA 4: PANEL DE REPORTES */}
      <div 
        className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-700/50 transition-all duration-500 ease-in-out flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]
          ${panelOpen ? 'h-[60vh]' : 'h-16'}`}
      >
        <div 
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex flex-col items-center py-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-1 bg-slate-700 rounded-full mb-1.5 group-hover:bg-yellow-400 transition-colors" />
          <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">
            {panelOpen ? 'Ocultar historial' : `Ver ${reports.length} reportes`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ReportList 
            reports={reports} 
            loading={loading} 
            onReportClick={handleReportClick} 
          />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900 p-4 overflow-y-auto animate-in fade-in duration-300">
          <ReportForm onClose={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
};

export default App;
