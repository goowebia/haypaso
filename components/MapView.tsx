
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Report, ReportType } from '../types';
import { getCategoryConfig } from './ReportCard';

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

const getReportIcon = (type: ReportType, votosSigue: number = 0) => {
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

  const config = getCategoryConfig(type);
  const color = config.hex;

  // Mapa de iconos a paths SVG aproximados
  let iconPath = '';
  if (config.icon.name === 'Shield') {
    iconPath = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" />';
  } else if (config.icon.name === 'HardHat') {
    iconPath = '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2zM10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" stroke="white" stroke-width="2"/><path d="M4 15a8 8 0 0 1 16 0" stroke="white" stroke-width="2"/>';
  } else if (config.icon.name === 'Car') {
    iconPath = '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" stroke="white" stroke-width="2"/><circle cx="7" cy="17" r="2" fill="white"/><circle cx="17" cy="17" r="2" fill="white"/>';
  } else if (config.icon.name === 'AlertTriangle' || config.icon.name === 'AlertOctagon') {
    iconPath = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="white" /><path d="M12 9v4" stroke="black" stroke-width="2" /><path d="M12 17h.01" stroke="black" stroke-width="2" />';
  } else {
    iconPath = '<circle cx="12" cy="10" r="3.5" fill="white"/>';
  }

  const svgIcon = `
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5));">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${color}" stroke="white" stroke-width="2.5"/>
      <g transform="translate(6, 4) scale(0.5)">
        ${iconPath}
      </g>
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

  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficKey(Date.now());
    }, 60000);
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

      {(Object.entries(onlineUsers) as [string, { lat: number, lng: number }][]).map(([id, pos]) => (
        <Marker 
          key={id} 
          position={[pos.lat, pos.lng]} 
          icon={getLiveUserIcon()}
          zIndexOffset={50}
        />
      ))}

      {reports.map((report) => (
        <Marker 
          key={report.id} 
          position={[report.latitud, report.longitud]}
          icon={getReportIcon(report.tipo, report.votos_sigue)}
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
