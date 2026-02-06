
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Report } from '../types';

interface MapViewProps {
  reports: Report[];
  center: [number, number];
  zoom: number;
  userLocation: [number, number] | null;
}

const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  useEffect(() => {
    map.setView(center, zoom, {
      animate: true,
      duration: 0.8
    });
  }, [center, zoom, map]);

  return null;
};

const getIcon = (type: string) => {
  let color = '#facc15'; 

  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; 
  if (type === 'Tráfico Pesado') color = '#f97316'; 
  if (['Obras', 'Vehículo en Vía', 'Vehículo en Lateral'].includes(type)) color = '#64748b'; 
  if (type.startsWith('Policía')) color = '#3b82f6'; 
  if (type === 'Clima') color = '#0ea5e9'; 

  // SVG con filtro de sombra para máximo contraste sobre Google Maps
  const svgIcon = `
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="12" cy="10" r="3.5" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-marker',
    html: svgIcon,
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
  });
};

const MapView: React.FC<MapViewProps> = ({ reports, center, zoom, userLocation }) => {
  const [trafficKey, setTrafficKey] = useState(Date.now());

  // Efecto para refrescar la capa de tráfico cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficKey(Date.now());
      console.log("Capa de tráfico actualizada");
    }, 5 * 60 * 1000); 

    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      zoomControl={false}
      style={{ height: '100%', width: '100%', position: 'absolute' }}
      className="z-0"
    >
      {/* Capa de Tráfico Real de Google Maps */}
      <TileLayer
        key={trafficKey}
        attribution='&copy; Google Maps Traffic'
        url={`https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}&t=${trafficKey}`}
      />
      
      <MapController center={center} zoom={zoom} />

      {/* Marcadores de Incidentes */}
      {reports.map((report) => (
        <Marker 
          key={report.id} 
          position={[report.latitud, report.longitud]}
          icon={getIcon(report.tipo)}
          zIndexOffset={100}
        >
          <Popup closeButton={false}>
            <div className="p-2 text-center bg-slate-900 text-white rounded-lg border border-slate-700 min-w-[120px]">
              <strong className="block text-yellow-400 uppercase text-[10px] font-black">{report.tipo}</strong>
              <div className="h-px bg-slate-700 my-1" />
              <p className="text-slate-400 text-[9px] font-bold">REPORTE ACTIVO</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Punto de Ubicación GPS (Renderizado al final para estar siempre al frente) */}
      {userLocation && (
        <CircleMarker 
          center={userLocation} 
          radius={10}
          zIndexOffset={1000}
          pathOptions={{ 
            fillColor: '#3b82f6', 
            fillOpacity: 1, 
            color: '#fff', 
            weight: 3,
            className: 'gps-marker shadow-2xl animate-pulse'
          }}
        />
      )}
    </MapContainer>
  );
};

export default MapView;
