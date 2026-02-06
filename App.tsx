
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Report } from './types';
import Header from './components/Header';
import MapView from './components/MapView';
import ReportList from './components/ReportList';
import ReportForm from './components/ReportForm';
import PhotoModal from './components/PhotoModal';
import { Plus, Zap, Loader2, Navigation } from 'lucide-react';

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.2433, -103.7247]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setConfigReady(true), 100);
    
    // Rastreo de ubicación en tiempo real
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(newLoc);
          // Si es la primera vez que obtenemos ubicación, centramos el mapa
          if (!userLocation) setMapCenter(newLoc);
        },
        (err) => console.error("Error de ubicación:", err),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
    
    return () => clearTimeout(timer);
  }, []);

  const fetchReports = useCallback(async () => {
    if (!configReady) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reportes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
      }
    } catch (err) {
      console.error("Error cargando reportes:", err);
    } finally {
      setLoading(false);
    }
  }, [configReady]);

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
        <MapView reports={reports} center={mapCenter} userLocation={userLocation} />
      </div>

      <div className="absolute top-0 left-0 right-0 z-50">
        <Header />
      </div>

      <div className="absolute right-6 bottom-[24vh] z-50 flex flex-col gap-4">
        {userLocation && (
          <button 
            onClick={() => setMapCenter(userLocation)}
            className="bg-slate-800 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-transform border-2 border-slate-700"
          >
            <Navigation size={24} className={mapCenter === userLocation ? 'text-blue-400' : ''} />
          </button>
        )}

        <button 
          onClick={() => setShowForm(true)}
          className="bg-yellow-400 text-slate-900 p-5 rounded-full shadow-2xl shadow-yellow-400/40 active:scale-90 transition-transform border-2 border-slate-900"
        >
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      {/* Panel Inferior con Scroll corregido */}
      <div 
        className={`absolute left-0 right-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 transition-all duration-500 flex flex-col
          ${panelOpen ? 'h-[55vh]' : 'h-16'}`}
      >
        <div 
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex flex-col items-center py-3 cursor-pointer group shrink-0"
        >
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-2 group-hover:bg-yellow-400 transition-colors" />
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
            {panelOpen ? 'Ocultar' : `${reports.length} reportes activos`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          <ReportList 
            reports={reports} 
            loading={loading} 
            onReportClick={(lat, lng) => {
              setMapCenter([lat, lng]);
              if (window.innerWidth < 768) setPanelOpen(false);
            }}
            onPhotoClick={(urls) => setSelectedPhotos(urls)}
          />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900 p-4 overflow-y-auto">
          <ReportForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {selectedPhotos && (
        <PhotoModal photos={selectedPhotos} onClose={() => setSelectedPhotos(null)} />
      )}
    </div>
  );
};

export default App;
