
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Clock } from 'lucide-react';
import { Report } from '../types';

interface MapViewProps {
  reports: Report[];
  center: [number, number];
  zoom: number;
  userLocation: [number, number] | null;
  accuracy?: number;
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

const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-MX';
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
};

// COMPONENTE DE NAVEGACIÓN Y BUSCADOR (INYECCIÓN FORZADA)
const RoutingEngine = ({ userLocation }: { userLocation: [number, number] | null }) => {
  const map = useMap();
  const routingControlRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;
    const Leaflet = (window as any).L || L;
    
    if (!Leaflet.Routing) {
      console.error("Leaflet Routing Machine no detectada");
      return;
    }

    // INYECCIÓN DIRECTA DEL BUSCADOR
    const control = Leaflet.Routing.control({
      waypoints: userLocation ? [Leaflet.latLng(userLocation[0], userLocation[1])] : [null],
      router: Leaflet.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      lineOptions: {
        styles: [{ color: '#3b82f6', weight: 8, opacity: 0.8 }]
      },
      // Geocodificador forzado para que aparezca la barra de búsqueda
      // @ts-ignore
      geocoder: Leaflet.Control.Geocoder.nominatim(),
      addWaypoints: true,
      routeWhileDragging: true,
      fitSelectedRoutes: true,
      showAlternatives: false,
      collapsible: false, // Forzar que no se oculte
      language: 'es',
      placeholder: '¿A dónde vas en Manzanillo?',
      createMarker: (i: number, wp: any) => {
        if (i === 0) return null; // El punto GPS lo manejamos nosotros
        return Leaflet.marker(wp.latLng, {
          icon: Leaflet.divIcon({
            className: 'dest-marker',
            html: `<div style="background:#ef4444; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 0 15px red;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        });
      }
    }).addTo(map);

    routingControlRef.current = control;

    control.on('routesfound', (e: any) => {
      const { totalDistance, totalTime } = e.routes[0].summary;
      const km = (totalDistance / 1000).toFixed(1);
      const min = Math.round(totalTime / 60);
      speak(`Ruta trazada. Distancia: ${km} kilómetros. Tiempo aproximado: ${min} minutos.`);
    });

    return () => {
      if (routingControlRef.current) map.removeControl(routingControlRef.current);
    };
  }, [map]);

  // Actualización automática del punto de inicio (A) con el GPS real
  useEffect(() => {
    if (userLocation && routingControlRef.current) {
      const Leaflet = (window as any).L || L;
      const currentWaypoints = routingControlRef.current.getWaypoints();
      
      // Si ya hay un destino, actualizamos el origen dinámicamente
      if (currentWaypoints.length >= 2 && currentWaypoints[1].latLng) {
         routingControlRef.current.spliceWaypoints(0, 1, Leaflet.latLng(userLocation[0], userLocation[1]));
      } else if (currentWaypoints.length < 2) {
         routingControlRef.current.setWaypoints([Leaflet.latLng(userLocation[0], userLocation[1])]);
      }
    }
  }, [userLocation]);

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
    default: return '<circle cx="12" cy="12" r="10" stroke="white" stroke-width="2.5"/>';
  }
};

const getReportIcon = (type: string, isAdmin: boolean = false) => {
  const baseSize = 30;
  let color = '#f97316'; 
  if (type === 'Camino Libre') color = '#10b981'; 
  if (['Accidente', 'Alto Total'].includes(type)) color = '#ef4444'; 
  if (type.startsWith('Policía')) color = '#2563eb'; 
  if (type === 'Obras') color = '#eab308'; 

  const iconMarkup = `
    <div class="relative" style="width: ${baseSize}px; height: ${baseSize}px;">
      <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
        <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <g transform="translate(6, 5) scale(0.5)">
          ${getCategoryIconPath(type)}
        </g>
      </svg>
      ${isAdmin ? `
        <div style="position: absolute; top: -5px; right: -5px; background: #FFD700; border: 1.5px solid white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 5px gold;">
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
  });
};

const getUserIcon = () => {
  const markup = `
    <div class="relative flex items-center justify-center" style="width: 30px; height: 30px;">
      <div class="absolute w-full h-full bg-blue-500/30 rounded-full animate-ping"></div>
      <div class="gps-marker-inner w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_15px_#3b82f6]"></div>
    </div>
  `;
  return L.divIcon({
    className: 'smooth-marker',
    html: markup,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const MapController = ({ center, zoom, onInteraction }: { center: [number, number], zoom: number, onInteraction?: () => void }) => {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 1.2, easeLinearity: 0.25 });
  }, [center, zoom, map]);

  useMapEvents({ 
    dragstart: () => onInteraction?.(), 
    zoomstart: () => onInteraction?.(),
    movestart: (e) => {
        const interaction = (e as any).originalEvent;
        if (interaction) onInteraction?.();
    }
  });
  
  useEffect(() => { map.invalidateSize(); }, [map]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ reports, center, zoom, userLocation, accuracy, onlineUsers, onMapInteraction, adminSelectionMode, onAdminCoordsSelect, selectedAdminCoords }) => {
  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://mt1.google.com/vt/lyrs=m@221097234,traffic&x={x}&y={y}&z={z}" />
      <MapController center={center} zoom={zoom} onInteraction={onMapInteraction} />
      <RoutingEngine userLocation={userLocation} />
      
      {reports.map((r) => (
        <Marker key={r.id} position={[r.latitud, r.longitud]} icon={getReportIcon(r.tipo, r.es_admin)}>
          <Popup closeButton={false}>
            <div className="p-1 text-center bg-slate-900 text-white rounded-lg border border-white/10 shadow-xl min-w-[100px]">
              <div className="flex items-center justify-center gap-1 text-[8px] font-black text-slate-400 mb-1 uppercase">
                <Clock size={8} className="text-yellow-400" /> {formatTimeAgo(r.created_at)}
              </div>
              <strong className="block uppercase text-[9px] font-black italic">{r.tipo}</strong>
            </div>
          </Popup>
        </Marker>
      ))}

      {Object.entries(onlineUsers).map(([id, pos]: any) => (
        <CircleMarker key={id} center={[pos.lat, pos.lng]} radius={5} pathOptions={{ fillColor: '#FFCC00', fillOpacity: 1, color: '#fff', weight: 2 }} />
      ))}

      {userLocation && (
        <>
          <Circle 
            center={userLocation} 
            radius={accuracy || 20} 
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }} 
          />
          <Marker 
            position={userLocation} 
            icon={getUserIcon()} 
            zIndexOffset={1000}
          />
        </>
      )}
    </MapContainer>
  );
};

export default MapView;
