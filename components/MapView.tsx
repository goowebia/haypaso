
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
  if (!dateString) return 'N/A';
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diff < 1) return 'Ahora';
  if (diff < 60) return `${diff}m`;
  return `${Math.floor(diff / 60)}h`;
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
    // Usar setView para asegurar que el centrado sea preciso en móviles
    map.setView(center, map.getZoom(), { animate: true, duration: 0.8 });
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
  let baseSize = 34;
  if (zoom >= 16) baseSize = 48;
  else if (zoom <= 12) baseSize = 26;

  let color = '#f97316'; 
  if (type === 'Camino Libre') color = '#10b981'; 
  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; 
  if (type.startsWith('Policía')) color = '#2563eb'; 
  if (type === 'Obras') color = '#eab308'; 
  if (type === 'Bache') color = '#ea580c'; 
  if (type === 'Objeto en el camino') color = '#57534e'; 
  if (type === 'Vehículo en Vía') color = '#64748b'; 

  const iconMarkup = `
    <div class="relative" style="width: ${baseSize}px; height: ${baseSize}px; display: flex; align-items: center; justify-content: center;">
      <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.6));">
        <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <g transform="translate(5, 4.5) scale(0.58)">
          ${getCategoryIconPath(type)}
        </g>
      </svg>
      ${isAdmin ? `
        <div style="position: absolute; top: -6px; right: -6px; background: #FFD700; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4); z-index: 20;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#000"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
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

      {Object.entries(onlineUsers).map(([userId, pos]: [string, { lat: number; lng: number }]) => (
        <CircleMarker 
          key={userId}
          center={[pos.lat, pos.lng]}
          radius={6}
          pathOptions={{ 
            fillColor: '#FFCC00', 
            fillOpacity: 1, 
            color: '#fff', 
            weight: 2,
            className: 'online-user-dot'
          }}
        />
      ))}

      {selectedAdminCoords && (
        <Marker position={selectedAdminCoords} icon={L.divIcon({ html: '<div class="w-8 h-8 border-4 border-red-500 rounded-full animate-ping shadow-[0_0_20px_rgba(239,68,68,0.5)]"></div>', iconSize: [32,32], iconAnchor: [16,16] })} />
      )}

      {userLocation && (
        <CircleMarker 
          center={userLocation} 
          radius={9} 
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
