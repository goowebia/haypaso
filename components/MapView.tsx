
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Clock, Star } from 'lucide-react';
import { Report } from '../types';

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
  onAdminCoordsSelect 
}: { 
  center: [number, number], 
  zoom: number, 
  onInteraction?: () => void,
  adminSelectionMode?: boolean,
  onAdminCoordsSelect?: (lat: number, lng: number) => void
}) => {
  const map = useMap();
  
  useMapEvents({
    dragstart: () => onInteraction?.(),
    zoomstart: () => onInteraction?.(),
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

const pulsingMarkerStyle = `
  @keyframes marker-pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.4; border-width: 8px; }
    100% { transform: scale(1.5); opacity: 0; border-width: 1px; }
  }
  .marker-pulse-ring {
    border: 4px solid #FFCC00;
    border-radius: 50%;
    animation: marker-pulse 2s infinite ease-out;
    pointer-events: none;
    position: absolute;
    width: 60px;
    height: 60px;
    top: -30px;
    left: -30px;
  }
  .marker-pulse-ring-emerald {
    border: 4px solid #10b981;
    border-radius: 50%;
    animation: marker-pulse 2s infinite ease-out;
    pointer-events: none;
    position: absolute;
    width: 60px;
    height: 60px;
    top: -30px;
    left: -30px;
  }
`;

const getReportIcon = (type: string, votosSigue: number = 0, isNew: boolean = false, isAdmin: boolean = false) => {
  let color = '#facc15'; 
  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; 
  if (type === 'Tráfico Pesado') color = '#f97316'; 
  if (type === 'Libre') color = '#10b981';
  if (['Obras', 'Vehículo en Vía', 'Vehículo en Lateral'].includes(type)) color = '#64748b'; 
  if (type.startsWith('Policía')) color = '#3b82f6'; 

  const isClear = type === 'Libre';

  // Badge de admin (Estrella dorada)
  const adminBadge = isAdmin ? `
    <div style="position: absolute; top: -10px; right: -10px; background: #FFD700; border: 2px solid white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    </div>
  ` : '';

  const alertIcon = votosSigue >= 5 ? `
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 8px 12px rgba(0,0,0,0.7));">
      <path d="M12 2L1 21H23L12 2Z" fill="#facc15" stroke="#000" stroke-width="2"/>
      <path d="M12 9V14" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M12 17V17.01" stroke="#000" stroke-width="3" stroke-linecap="round"/>
    </svg>
  ` : `
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${color}" stroke="white" stroke-width="2.5"/>
      ${isClear ? '<path d="M8 12L11 15L16 9" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : '<circle cx="12" cy="10" r="3.5" fill="white"/>'}
    </svg>
  `;

  const pulseRing = isNew ? `<div class="${isClear ? 'marker-pulse-ring-emerald' : 'marker-pulse-ring'}"></div>` : '';

  return L.divIcon({
    className: `custom-marker ${votosSigue >= 5 ? 'alert-high' : ''}`,
    html: `
      <style>${pulsingMarkerStyle}</style>
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${pulseRing}
        ${alertIcon}
        ${adminBadge}
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 45],
    popupAnchor: [0, -45],
  });
};

const MapView: React.FC<MapViewProps> = ({ reports, center, zoom, userLocation, onlineUsers, onMapInteraction, adminSelectionMode, onAdminCoordsSelect, selectedAdminCoords }) => {
  const [trafficKey, setTrafficKey] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tInterval = setInterval(() => setTrafficKey(Date.now()), 60000);
    const nInterval = setInterval(() => setNow(Date.now()), 30000); 
    return () => { clearInterval(tInterval); clearInterval(nInterval); };
  }, []);

  const adminTargetIcon = L.divIcon({
    className: 'admin-target-marker',
    html: `
      <div style="width: 40px; height: 40px; border: 4px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.2);">
        <div style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
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
      />
      
      {reports.map((report) => {
        const reportTime = new Date(report.created_at).getTime();
        const isNew = (now - reportTime) < 120000; 

        return (
          <Marker 
            key={report.id} 
            position={[report.latitud, report.longitud]}
            icon={getReportIcon(report.tipo, report.votos_sigue, isNew, report.es_admin)}
            zIndexOffset={report.es_admin ? 600 : report.votos_sigue >= 5 ? 500 : 100}
          >
            <Popup closeButton={false}>
              <div className="p-2 text-center bg-slate-900 text-white rounded-xl border border-white/10 shadow-2xl min-w-[140px]">
                <div className="flex items-center justify-center gap-1.5 text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-tighter">
                  <Clock size={10} className="text-yellow-400" />
                  {formatTimeAgo(report.created_at)}
                </div>
                <div className="h-px bg-white/5 w-full mb-1.5" />
                {report.es_admin && (
                  <div className="flex items-center justify-center gap-1 text-[8px] font-black text-yellow-400 mb-1">
                    <Star size={8} fill="currentColor" /> REPORTE OFICIAL
                  </div>
                )}
                <strong className={`block uppercase text-[11px] font-black italic tracking-tighter ${report.tipo === 'Libre' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {report.tipo}
                </strong>
                {report.fuente && <div className="text-[7px] text-slate-500 font-bold uppercase mt-1 truncate">Fuente: {report.fuente}</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {selectedAdminCoords && (
        <Marker position={selectedAdminCoords} icon={adminTargetIcon} />
      )}

      {userLocation && (
        <CircleMarker center={userLocation} radius={12} zIndexOffset={1000} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: '#fff', weight: 3, className: 'gps-marker' }} />
      )}
    </MapContainer>
  );
};

export default MapView;