
// Add React import to resolve the namespace error
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Report } from '../types';

interface MapViewProps {
  reports: Report[];
  center: [number, number];
}

// COMPONENTE PARA ARREGLAR EL TAMAÑO Y RE-CENTRAR
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    // Forzamos el recalculo del tamaño después de un breve delay
    // Esto arregla el problema de los cuadros grises en producción
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 500);

    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    map.flyTo(center, 13, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, map]);

  return null;
};

const getIcon = (type: string) => {
  let color = '#facc15'; // Default Tráfico (Amarillo)
  if (type === 'Accidente Pesado') color = '#ef4444'; // Rojo
  if (type === 'Obras') color = '#f97316'; // Naranja
  if (type === 'Clima') color = '#3b82f6'; // Azul

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

const MapView: React.FC<MapViewProps> = ({ reports, center }) => {
  return (
    <MapContainer 
      center={center} 
      zoom={11} 
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      <MapController center={center} />

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
