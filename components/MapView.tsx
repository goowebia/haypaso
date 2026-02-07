
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Report } from '../types';

interface MapViewProps {
  reports: Report[];
  center: [number, number];
  zoom: number;
  userLocation: [number, number] | null;
  onlineUsers: Record<string, { lat: number, lng: number }>;
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

const getReportIcon = (type: string, votosSigue: number = 0, isNew: boolean = false) => {
  let color = '#facc15'; 
  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; 
  if (type === 'Tráfico Pesado') color = '#f97316'; 
  if (type === 'Libre') color = '#10b981';
  if (['Obras', 'Vehículo en Vía', 'Vehículo en Lateral'].includes(type)) color = '#64748b'; 
  if (type.startsWith('Policía')) color = '#3b82f6'; 

  const isClear = type === 'Libre';

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
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 45],
    popupAnchor: [0, -45],
  });
};

const getLiveUserIcon = () => {
  const carSvg = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#facc15" fill-opacity="0.8" stroke="white" stroke-width="1.5"/>
      <path d="M17 11.5V14.5M7 11.5V14.5M10 17H14" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M6 11L7.5 7.5H16.5L18 11H6Z" fill="#0f172a" stroke="#0f172a" stroke-width="1"/>
    </svg>
  `;
  return L.divIcon({
    className: 'live-user-marker',
    html: carSvg,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const MapView: React.FC<MapViewProps> = ({ reports, center, zoom, userLocation, onlineUsers, onMapInteraction }) => {
  const [trafficKey, setTrafficKey] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tInterval = setInterval(() => setTrafficKey(Date.now()), 60000);
    const nInterval = setInterval(() => setNow(Date.now()), 30000); 
    return () => { clearInterval(tInterval); clearInterval(nInterval); };
  }, []);

  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} style={{ height: '100%', width: '100%', position: 'absolute' }} className="z-0">
      <TileLayer key={trafficKey} attribution='&copy; Google Maps' url={`https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}&t=${trafficKey}`} />
      <MapController center={center} zoom={zoom} onInteraction={onMapInteraction} />
      
      {reports.map((report) => {
        const reportTime = new Date(report.created_at).getTime();
        const isNew = (now - reportTime) < 120000; 

        return (
          <Marker 
            key={report.id} 
            position={[report.latitud, report.longitud]}
            icon={getReportIcon(report.tipo, report.votos_sigue, isNew)}
            zIndexOffset={report.votos_sigue >= 5 ? 500 : 100}
          >
            <Popup closeButton={false}>
              <div className="p-2 text-center bg-slate-900 text-white rounded-lg border border-slate-700 min-w-[120px]">
                <strong className={`block uppercase text-[10px] font-black ${report.tipo === 'Libre' ? 'text-emerald-400' : 'text-yellow-400'}`}>{report.tipo}</strong>
                <div className="h-px bg-slate-700 my-1" />
                <div className="text-[8px] text-slate-400 font-black uppercase">
                  {isNew ? '✨ RECIÉN REPORTADO' : report.votos_sigue >= 5 ? '⚠️ PELIGRO CONFIRMADO' : 'REPORTE VIAL'}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {userLocation && (
        <CircleMarker center={userLocation} radius={12} zIndexOffset={1000} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: '#fff', weight: 3, className: 'gps-marker' }} />
      )}
    </MapContainer>
  );
};

export default MapView;