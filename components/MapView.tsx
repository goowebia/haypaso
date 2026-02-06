
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Report } from '../types';

interface MapViewProps {
  reports: Report[];
  center: [number, number];
  userLocation: [number, number] | null;
}

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 500);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    map.flyTo(center, 13, { duration: 1.5 });
  }, [center, map]);

  return null;
};

const getIcon = (type: string) => {
  let color = '#facc15';
  if (type === 'Accidente Pesado') color = '#ef4444';
  if (type === 'Obras') color = '#f97316';
  if (type === 'Clima') color = '#3b82f6';

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

// Icono para el usuario (Punto azul estilo Waze)
const userIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-blue-500 rounded-full opacity-30 animate-ping"></div>
      <div class="relative w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const MapView: React.FC<MapViewProps> = ({ reports, center, userLocation }) => {
  return (
    <MapContainer 
      center={center} 
      zoom={11} 
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      <MapController center={center} />

      {userLocation && (
        <Marker position={userLocation} icon={userIcon} zIndexOffset={1000} />
      )}

      {reports.map((report) => (
        <Marker 
          key={report.id} 
          position={[report.latitud, report.longitud]}
          icon={getIcon(report.tipo)}
        >
          <Popup closeButton={false} className="dark-popup">
            <div className="p-2 min-w-[150px] text-center bg-slate-900 text-white rounded-lg">
              <h3 className="font-black text-yellow-400 text-xs uppercase">{report.tipo}</h3>
              <p className="text-slate-300 text-[10px] mt-1 font-bold">{report.descripcion}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
