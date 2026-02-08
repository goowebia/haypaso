
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
  if (!dateString) return 'Desconocido';
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
  if (diff < 1) return 'Justo ahora';
  if (diff < 60) return `Hace ${diff} min`;
  const hours = Math.floor(diff / 60);
  if (hours === 1) return 'Hace 1 hora';
  return `Hace ${hours} horas`;
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
    touchmove: () => onInteraction?.(),
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
    map.panTo(center, {
      animate: true,
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, map]);

  return null;
};

const markerStyles = `
  @keyframes marker-drop {
    0% { transform: translateY(-30px) scale(0); opacity: 0; }
    60% { transform: translateY(5px) scale(1.1); opacity: 1; }
    80% { transform: translateY(-2px) scale(0.95); }
    100% { transform: translateY(0) scale(1); }
  }
  
  @keyframes marker-pulse {
    0% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.4); opacity: 0; border-width: 6px; }
    100% { transform: scale(1.6); opacity: 0; border-width: 1px; }
  }

  .marker-entrance {
    animation: marker-drop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }

  .pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid #FFCC00;
    animation: marker-pulse 2s infinite ease-out;
    pointer-events: none;
    top: 0;
    left: 0;
  }

  .pulse-ring-emerald {
    border-color: #10b981;
  }
`;

const getCategoryIconPath = (type: string) => {
  switch (type) {
    // Fixed: 'Libre' removed as it's not a valid ReportType
    case 'Camino Libre': return '<path d="M20 6L9 17L4 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Accidente': 
    case 'Alto Total': return '<path d="M12 9V14M12 17V17.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Policía Visible':
    case 'Policía Escondido':
    case 'Policía Contrario': return '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Obras': return '<path d="M2 18h20M10 10l5 5M5 15l5 5M12 3l8 8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    case 'Tráfico Lento':
    case 'Tráfico Pesado': return '<path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14l3-3M3.34 19l1.59-1.59M19.07 4.93L17.48 6.52" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    default: return '<circle cx="12" cy="12" r="10" stroke="white" stroke-width="2.5"/>';
  }
};

const getReportIcon = (type: string, votosSigue: number = 0, isNew: boolean = false, isAdmin: boolean = false, zoom: number) => {
  let baseSize = 30;
  if (zoom >= 17) baseSize = 40;
  else if (zoom >= 16) baseSize = 35;
  else if (zoom <= 12) baseSize = 22;
  else if (zoom <= 10) baseSize = 16;

  let color = '#facc15';
  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; 
  if (type === 'Tráfico Pesado') color = '#f97316'; 
  // Fixed: Removed 'Libre' reference
  if (type === 'Camino Libre') color = '#10b981';
  if (['Obras', 'Vehículo en Vía', 'Vehículo en Lateral'].includes(type)) color = '#64748b'; 
  if (type.startsWith('Policía')) color = '#3b82f6'; 

  // Fixed: Removed 'Libre' reference
  const isClear = type === 'Camino Libre';
  const isAlert = votosSigue >= 5;

  const badgeSize = Math.max(12, baseSize * 0.4);
  const adminBadge = isAdmin ? `
    <div style="position: absolute; top: -${badgeSize/3}px; right: -${badgeSize/3}px; background: #FFD700; border: 1.5px solid white; border-radius: 50%; width: ${badgeSize}px; height: ${badgeSize}px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.4); z-index: 20;">
      <svg width="${badgeSize*0.6}" height="${badgeSize*0.6}" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    </div>
  ` : '';

  const iconMarkup = `
    <style>${markerStyles}</style>
    <div class="relative ${isNew ? 'marker-entrance' : ''}" style="width: ${baseSize}px; height: ${baseSize}px; display: flex; align-items: center; justify-content: center; opacity: 0.88;">
      ${isNew ? `<div class="pulse-ring ${isClear ? 'pulse-ring-emerald' : ''}"></div>` : ''}
      <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.4));">
        <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${isAlert ? '#FFCC00' : color}" stroke="white" stroke-width="1.2"/>
        <g transform="translate(5, 4.5) scale(0.58)">
          ${getCategoryIconPath(type)}
        </g>
      </svg>
      ${adminBadge}
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
  const [now, setNow] = useState(Date.now());
  const [currentZoom, setCurrentZoom] = useState(zoom);

  useEffect(() => {
    const tInterval = setInterval(() => setTrafficKey(Date.now()), 60000);
    const nInterval = setInterval(() => setNow(Date.now()), 30000); 
    return () => { clearInterval(tInterval); clearInterval(nInterval); };
  }, []);

  const adminTargetIcon = L.divIcon({
    className: 'admin-target-marker',
    html: `
      <div style="width: 30px; height: 30px; border: 3px dashed #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.1); animation: spin 4s linear infinite;">
        <div style="width: 6px; height: 6px; background: #ef4444; border-radius: 50%;"></div>
      </div>
      <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} style={{ height: '100%', width: '100%', position: 'absolute' }} className="z-0">
      <TileLayer key={trafficKey} attribution='&copy; Google Maps' url={`https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}&t=${trafficKey}`} />
      <MapController 
        center={center} 
        zoom={zoom} 
        onInteraction={onMapInteraction} 
        adminSelectionMode={adminSelectionMode}
        onAdminCoordsSelect={onAdminCoordsSelect}
        onZoomChange={setCurrentZoom}
      />
      
      {reports.filter(r => r.latitud && r.longitud).map((report) => {
        const reportTime = new Date(report.created_at).getTime();
        const isNew = (now - reportTime) < 60000;

        return (
          <Marker 
            key={report.id} 
            position={[report.latitud, report.longitud]}
            icon={getReportIcon(report.tipo, report.votos_sigue, isNew, report.es_admin, currentZoom)}
            zIndexOffset={report.es_admin ? 1000 : report.votos_sigue >= 5 ? 500 : 100}
          >
            <Popup closeButton={false}>
              <div className="p-2 text-center bg-slate-900 text-white rounded-xl border border-white/10 shadow-2xl min-w-[130px]">
                <div className="flex items-center justify-center gap-1.5 text-[8px] font-black text-slate-400 mb-1 uppercase tracking-tighter">
                  <Clock size={9} className="text-yellow-400" />
                  {formatTimeAgo(report.created_at)}
                </div>
                <div className="h-px bg-white/5 w-full mb-1" />
                {report.es_admin && (
                  <div className="flex items-center justify-center gap-1 text-[7px] font-black text-yellow-400 mb-1">
                    <Star size={7} fill="currentColor" /> REPORTE OFICIAL
                  </div>
                )}
                {/* Fixed: Removed 'Libre' reference */}
                <strong className={`block uppercase text-[10px] font-black italic tracking-tighter ${report.tipo === 'Camino Libre' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {report.tipo}
                </strong>
                {report.fuente && <div className="text-[7px] text-slate-500 font-bold uppercase mt-0.5 truncate">Fuente: {report.fuente}</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {selectedAdminCoords && (
        <Marker position={selectedAdminCoords} icon={adminTargetIcon} />
      )}

      {userLocation && (
        <CircleMarker center={userLocation} radius={10} zIndexOffset={2000} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: '#fff', weight: 2.5, className: 'gps-marker' }} />
      )}
    </MapContainer>
  );
};

export default MapView;
