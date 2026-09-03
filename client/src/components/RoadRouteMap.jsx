import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../lib/api';

function FitRouteBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(L.latLngBounds(positions), { padding: [36, 36] });
  }, [map, positions]);
  return null;
}

function stopIcon(index, selected) {
  return L.divIcon({
    html: `<div class="flex h-8 w-8 items-center justify-center rounded-full border-2 ${selected ? 'border-white bg-sage-900 text-white ring-4 ring-sage-400/45' : 'border-sage-900 bg-white text-sage-900'} text-xs font-bold shadow">${index + 1}</div>`,
    className: 'custom-route-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function RoadRouteMap({ stops, selectedStopId, onSelect, height = '330px' }) {
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState('');
  const positions = stops.map((stop) => [Number(stop.lat), Number(stop.lng)]);
  const center = positions[0] || [19.076, 72.877];

  useEffect(() => {
    if (positions.length < 2) {
      setRoute(null);
      return undefined;
    }
    setRouteError('');
    api.roadRoute(stops).then(setRoute).catch((error) => {
      setRouteError(error.message);
    });
  }, [stops]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-sage-300" style={{ height }}>
      <MapContainer center={center} zoom={13} className="absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {route?.geometry?.length > 1 && <><FitRouteBounds positions={route.geometry} /><Polyline positions={route.geometry} pathOptions={{ color: '#145c43', weight: 5, opacity: 0.9 }} /></>}
        {stops.map((stop, index) => <Marker key={stop.id || `${stop.lat}-${stop.lng}`} position={[stop.lat, stop.lng]} icon={stopIcon(index, selectedStopId === stop.id)} eventHandlers={{ click: () => onSelect?.(stop.id) }} />)}
      </MapContainer>
      {routeError && <div className="absolute left-3 right-3 top-3 z-[1000] rounded-md bg-alert-muted px-3 py-2 text-xs font-bold text-alert">{routeError}</div>}
      {!route && !routeError && positions.length > 1 && <div className="absolute left-3 top-3 z-[1000] rounded-md bg-white/85 px-3 py-2 text-xs font-bold text-sage-900 shadow">Calculating road route...</div>}
      {positions.length < 2 && <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/45 text-xs font-bold text-sage-900">Add at least two stops to calculate a route.</div>}
    </div>
  );
}