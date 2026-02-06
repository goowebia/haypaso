
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Report } from '../types';

interface MapViewProps {
  reports: Report[];
  center: [number, number];
  zoom: number;
  userLocation: [number, number] | null;
  onMapInteraction?: () => void;
}

const MapController = ({ center, zoom, onInteraction }: { center: [number, number], zoom: number, onInteraction?: () => void }) => {
  const map = useMap();
  
  useMapEvents({
    dragstart: () => onInteraction?.(),
    zoomstart: () => onInteraction?.(),
    touchmove: () => onInteraction?.(),
  });

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

const getIcon = (type: string, votosSigue: number = 0) => {
  // REGLA DE ALERTA: Triángulo grande para 5+ votos
  if (votosSigue >= 5) {
    const alertIcon = `
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 8px 12px rgba(0,0,0,0.7));">
        <path d="M12 2L1 21H23L12 2Z" fill="#facc15" stroke="#000" stroke-width="2"/>
        <path d="M12 9V14" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M12 17V17.01" stroke="#000" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `;
    return L.divIcon({
      className: 'custom-marker alert-high',
      html: alertIcon,
      iconSize: [60, 60],
      iconAnchor: [30, 45],
      popupAnchor: [0, -45],
    });
  }

  let color = '#facc15'; 
  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; 
  if (type === 'Tráfico Pesado') color = '#f97316'; 
  if (['Obras', 'Vehículo en Vía', 'Vehículo en Lateral'].includes(type)) color = '#64748b'; 
  if (type.startsWith('Policía')) color = '#3b82f6'; 

  const svgIcon = `
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${color}" stroke="white" stroke-width="2.5"/>
      <circle cx="12" cy="10" r="3.5" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-marker',
    html: svgIcon,
    iconSize: [46, 46],
    iconAnchor: [23, 46],
    popupAnchor: [0, -46],
  });
};

const MapView: React.FC<MapViewProps> = ({ reports, center, zoom, userLocation, onMapInteraction }) => {
  const [trafficKey, setTrafficKey] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficKey(Date.now());
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
      <TileLayer
        key={trafficKey}
        attribution='&copy; Google Maps'
        url={`https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}&t=${trafficKey}`}
      />
      
      <MapController center={center} zoom={zoom} onInteraction={onMapInteraction} />

      {reports.map((report) => (
        <Marker 
          key={report.id} 
          position={[report.latitud, report.longitud]}
          icon={getIcon(report.tipo, report.votos_sigue)}
          zIndexOffset={report.votos_sigue >= 5 ? 500 : 100}
        >
          <Popup closeButton={false}>
            <div className="p-2 text-center bg-slate-900 text-white rounded-lg border border-slate-700 min-w-[120px]">
              <strong className="block text-yellow-400 uppercase text-[10px] font-black">{report.tipo}</strong>
              <div className="h-px bg-slate-700 my-1" />
              <div className="text-[8px] text-slate-400 font-black uppercase">
                {report.votos_sigue >= 5 ? '⚠️ PELIGRO CONFIRMADO' : 'REPORTE EN TIEMPO REAL'}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {userLocation && (
        <CircleMarker 
          center={userLocation} 
          radius={12}
          zIndexOffset={1000}
          pathOptions={{ 
            fillColor: '#3b82f6', 
            fillOpacity: 1, 
            color: '#fff', 
            weight: 3,
            className: 'gps-marker'
          }}
        />
      )}
    </MapContainer>
  );
};

export default MapView;
