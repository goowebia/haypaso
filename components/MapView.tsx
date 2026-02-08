
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Clock, Star } from 'lucide-react';
import { Report, ReportType } from '../types';

interface MapViewProps {
  reports: Report[];
  center: [number, number];
  zoom: number;
  userLocation: [number, number] | null;
  onlineUsers: Record<string, { lat: number, lng: number }>;
  onMapInteraction?: () => void;
  adminSelectionMode?: boolean;
  onAdminCoordsSelect?: (lat: number, lng: number) => void;
  selectedAdminCoords?: [number, number] | null;
}

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return 'Dato N/A';
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diff < 1) return 'Hace un momento';
  if (diff < 60) return `Hace ${diff} min`;
  const hours = Math.floor(diff / 60);
  return `Hace ${hours} h`;
};

const MapController = ({ 
  center, 
  zoom, 
  onInteraction, 
  adminSelectionMode, 
  onAdminCoordsSelect,
  onZoomChange
}: { 
  center: [number, number], 
  zoom: number, 
  onInteraction?: () => void,
  adminSelectionMode?: boolean,
  onAdminCoordsSelect?: (lat: number, lng: number) => void,
  onZoomChange: (z: number) => void
}) => {
  const map = useMap();
  
  useMapEvents({
    dragstart: () => onInteraction?.(),
    zoomstart: () => onInteraction?.(),
    zoomend: () => onZoomChange(map.getZoom()),
    click: (e) => {
      if (adminSelectionMode && onAdminCoordsSelect) {
        onAdminCoordsSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    map.panTo(center, { animate: true, duration: 1.2 });
  }, [center, map]);

  return null;
};

const getCategoryIconPath = (type: string) => {
  switch (type) {
    case 'Camino Libre': return '<path d="M20 6L9 17L4 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Accidente': 
    case 'Alto Total': return '<path d="M12 9V14M12 17V17.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Policía Visible':
    case 'Policía Escondido':
    case 'Policía Contrario': return '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Tráfico Lento':
    case 'Tráfico Pesado': return '<path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14l3-3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Obras': return '<path d="M2 18h20M10 10l5 5M5 15l5 5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Bache': return '<path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Objeto en el camino': return '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    default: return '<circle cx="12" cy="12" r="10" stroke="white" stroke-width="2.5"/>';
  }
};

const getReportIcon = (type: string, isAdmin: boolean = false, zoom: number) => {
  let baseSize = 30;
  if (zoom >= 16) baseSize = 42;
  else if (zoom <= 12) baseSize = 24;

  let color = '#f97316'; // Tráfico Naranja
  if (type === 'Camino Libre') color = '#10b981'; // Verde
  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; // Rojo
  if (type.startsWith('Policía')) color = '#2563eb'; // Azul
  if (type === 'Obras') color = '#eab308'; // Amarillo
  if (type === 'Bache') color = '#ea580c'; // Naranja más oscuro
  if (type === 'Objeto en el camino') color = '#57534e'; // Gris piedra
  if (type === 'Vehículo en Vía') color = '#64748b'; // Slate

  const iconMarkup = `
    <div class="relative" style="width: ${baseSize}px; height: ${baseSize}px; display: flex; align-items: center; justify-content: center;">
      <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.5));">
        <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <g transform="translate(5, 4.5) scale(0.58)">
          ${getCategoryIconPath(type)}
        </g>
      </svg>
      ${isAdmin ? `
        <div style="position: absolute; top: -4px; right: -4px; background: #FFD700; border: 1.5px solid white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 20;">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="#000"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
        </div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'custom-report-marker',
    html: iconMarkup,
    iconSize: [baseSize, baseSize],
    iconAnchor: [baseSize / 2, baseSize],
    popupAnchor: [0, -baseSize],
  });
};

const MapView: React.FC<MapViewProps> = ({ reports, center, zoom, userLocation, onlineUsers, onMapInteraction, adminSelectionMode, onAdminCoordsSelect, selectedAdminCoords }) => {
  const [trafficKey, setTrafficKey] = useState(Date.now());
  const [currentZoom, setCurrentZoom] = useState(zoom);

  useEffect(() => {
    const tInterval = setInterval(() => setTrafficKey(Date.now()), 60000);
    return () => clearInterval(tInterval);
  }, []);

  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} style={{ height: '100%', width: '100%', position: 'absolute' }} className="z-0">
      <TileLayer attribution='&copy; Google' url={`https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}&t=${trafficKey}`} />
      <MapController 
        center={center} 
        zoom={zoom} 
        onInteraction={onMapInteraction} 
        adminSelectionMode={adminSelectionMode}
        onAdminCoordsSelect={onAdminCoordsSelect}
        onZoomChange={setCurrentZoom}
      />
      
      {/* Marcadores de Reportes */}
      {reports.map((report) => (
        <Marker 
          key={report.id} 
          position={[report.latitud, report.longitud]}
          icon={getReportIcon(report.tipo, report.es_admin, currentZoom)}
        >
          <Popup closeButton={false}>
            <div className="p-2 text-center bg-slate-900 text-white rounded-xl border border-white/10 shadow-2xl min-w-[120px]">
              <div className="flex items-center justify-center gap-1.5 text-[8px] font-black text-slate-400 mb-1 uppercase">
                <Clock size={9} className="text-yellow-400" /> {formatTimeAgo(report.created_at)}
              </div>
              <strong className={`block uppercase text-[10px] font-black italic tracking-tighter ${report.tipo === 'Camino Libre' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {report.tipo}
              </strong>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Marcadores de Usuarios Online (Puntos Amarillos) */}
      {/* Fix: Explicitly type the map arguments to avoid 'unknown' type inference on pos */}
      {Object.entries(onlineUsers).map(([userId, pos]: [string, { lat: number; lng: number }]) => (
        <CircleMarker 
          key={userId}
          center={[pos.lat, pos.lng]}
          radius={5}
          pathOptions={{ 
            fillColor: '#FFCC00', 
            fillOpacity: 0.9, 
            color: '#fff', 
            weight: 2,
            className: 'online-user-dot'
          }}
        />
      ))}

      {selectedAdminCoords && (
        <Marker position={selectedAdminCoords} icon={L.divIcon({ html: '<div class="w-6 h-6 border-4 border-red-500 rounded-full animate-ping"></div>', iconSize: [24,24], iconAnchor: [12,12] })} />
      )}

      {/* Marcador del Usuario Actual (Azul) */}
      {userLocation && (
        <CircleMarker 
          center={userLocation} 
          radius={8} 
          pathOptions={{ 
            fillColor: '#3b82f6', 
            fillOpacity: 1, 
            color: '#fff', 
            weight: 2.5,
            className: 'gps-marker'
          }} 
        />
      )}
    </MapContainer>
  );
};

export default MapView;
