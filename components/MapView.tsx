
import React, { useEffect } from 'react';
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
    map.setView(center, zoom, {
      animate: true,
      duration: 1.0
    });
  }, [center, zoom, map]);
  return null;
};

const getIcon = (type: string) => {
  let color = '#facc15'; // Yellow default

  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; // Red
  if (type === 'Tráfico Pesado') color = '#f97316'; // Orange
  if (['Obras', 'Vehículo en Vía', 'Vehículo en Lateral'].includes(type)) color = '#64748b'; // Slate
  if (type.startsWith('Policía')) color = '#3b82f6'; // Blue
  if (type === 'Clima') color = '#0ea5e9'; // Light Blue

  const svgIcon = `
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-marker',
    html: svgIcon,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -42],
  });
};

const MapView: React.FC<MapViewProps> = ({ reports, center, zoom, userLocation }) => {
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      <MapController center={center} zoom={zoom} />

      {userLocation && (
        <CircleMarker 
          center={userLocation} 
          radius={10}
          pathOptions={{ 
            fillColor: '#3b82f6', 
            fillOpacity: 0.8, 
            color: '#fff', 
            weight: 3,
            className: 'gps-marker shadow-2xl'
          }}
        />
      )}

      {reports.map((report) => (
        <Marker 
          key={report.id} 
          position={[report.latitud, report.longitud]}
          icon={getIcon(report.tipo)}
        >
          <Popup closeButton={false}>
            <div className="p-2 text-center bg-slate-900 text-white rounded-lg border border-slate-700 min-w-[120px]">
              <strong className="block text-yellow-400 uppercase text-xs font-black">{report.tipo}</strong>
              <div className="h-px bg-slate-700 my-1" />
              <p className="text-slate-400 text-[10px] font-bold">ACTIVO</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;