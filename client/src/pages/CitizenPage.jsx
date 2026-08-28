import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const FALLBACK_LOCATION = [19.076, 72.877];
const locationIcon = L.divIcon({
  className: 'current-location-marker',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const TYPES = [
  ['overflow', 'Overflowing bin'],
  ['missed_pickup', 'Missed pickup'],
  ['damaged_bin', 'Damaged bin'],
  ['bulk_ewaste', 'Bulk e-waste'],
];
const STEPS = [
  ['submitted', 'Complaint filed'],
  ['verified', 'Verified'],
  ['dispatched', 'Assigned to fleet'],
  ['resolved', 'Resolved'],
];

export default function CitizenPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', contact: user?.phone || '', type: 'overflow', address: '', lat: FALLBACK_LOCATION[0], lng: FALLBACK_LOCATION[1], photo: null });
  const [ticket, setTicket] = useState(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('Locating you...');
  const [submitting, setSubmitting] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const activeRequest = trackingResult || ticket;
  const activeStep = activeRequest ? STEPS.findIndex(([id]) => id === activeRequest.status) : -1;

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Live location is unavailable.');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setForm((current) => ({ ...current, lat: position.coords.latitude, lng: position.coords.longitude }));
        setLocationStatus('Live location');
      },
      () => {
        setLocationStatus('Using fallback location');
        setError('Location permission was unavailable. You can still submit the address.');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  function detectLocation() {
    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser. You can still submit the address.');
      return;
    }
    setLocationStatus('Locating you...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({ ...current, lat: position.coords.latitude, lng: position.coords.longitude }));
        setLocationStatus('Live location');
      },
      () => {
        setLocationStatus('Using fallback location');
        setError('Location permission was unavailable. You can still submit the address.');
      },
    );
  }

  async function submitRequest(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { request } = await api.submitCitizenRequest({ citizenName: form.name, contactNumber: form.contact, requestType: form.type, location: { lat: form.lat, lng: form.lng, address_string: form.address }, photoUrl: await fileToDataUrl(form.photo) });
      setTicket(request);
      setTrackingId(request.ticketId);
    } catch (submitError) { setError(submitError.message); } finally { setSubmitting(false); }
  }

  async function trackRequest(event) {
    event.preventDefault();
    setError('');
    try { setTrackingResult((await api.trackCitizenRequest(trackingId.trim())).request); } catch (trackError) { setError(trackError.message); }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-8">
      <header className="mx-auto mb-8 flex max-w-6xl items-center justify-between"><div><div className="text-lg font-bold text-sage-900">EcoCampus</div><div className="text-[11px] font-semibold uppercase tracking-wide text-sage-700">Citizen services</div></div><a href="/login" className="text-sm font-bold text-sage-800 hover:text-sage-900">Staff sign in</a></header>
      <main className="mx-auto max-w-6xl"><div className="mb-6"><h1 className="text-3xl font-bold text-sage-900">Keep your neighborhood clean.</h1><p className="mt-2 max-w-xl text-sm font-medium text-sage-800">Report a waste service issue and follow every step until it is resolved.</p></div>
        <section className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={submitRequest} className="rounded-xl border border-sage-300/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm"><div className="mb-5"><h2 className="text-lg font-bold text-sage-900">Submit a request</h2><p className="mt-1 text-xs font-medium text-sage-800">It takes less than two minutes.</p></div>
            <div className="mb-4 grid grid-cols-2 gap-2">{TYPES.map(([id, label]) => <button key={id} type="button" onClick={() => update('type', id)} className={`rounded-lg border p-2.5 text-left text-xs font-bold ${form.type === id ? 'border-sage-900 bg-mint text-sage-900' : 'border-sage-300 bg-white/50 text-sage-800 hover:bg-sage-100'}`}>{label}</button>)}</div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-sage-900">Your name<input required value={form.name} onChange={(event) => update('name', event.target.value)} className="mt-1 w-full rounded-lg border border-sage-300 bg-white/70 px-3 py-2.5 text-sm text-sage-900" /></label><label className="text-xs font-bold text-sage-900">Contact number<input required value={form.contact} onChange={(event) => update('contact', event.target.value)} className="mt-1 w-full rounded-lg border border-sage-300 bg-white/70 px-3 py-2.5 text-sm text-sage-900" /></label></div>
            <label className="mt-3 block text-xs font-bold text-sage-900">Issue address<input required value={form.address} onChange={(event) => update('address', event.target.value)} list="addresses" placeholder="Start typing a street or landmark" className="mt-1 w-full rounded-lg border border-sage-300 bg-white/70 px-3 py-2.5 text-sm text-sage-900" /><datalist id="addresses"><option value="North Market, Main Road" /><option value="Lakeview Ward, Garden Street" /><option value="Civic Centre, Municipal Road" /></datalist></label>
            <button type="button" onClick={detectLocation} className="mt-2 text-left text-xs font-bold text-sage-700">Use my current location ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})</button>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-sage-400 bg-sage-50/50 p-5 text-center text-xs font-semibold text-sage-800"><span className="text-sm font-bold text-sage-900">Add a photo of the issue</span><span className="mt-1">JPG or PNG, optional</span><input type="file" accept="image/*" onChange={(event) => update('photo', event.target.files?.[0] || null)} className="mt-3 w-full text-xs" /></label>
            {error && <div className="mt-3 rounded-lg bg-alert-muted p-3 text-xs font-bold text-alert">{error}</div>}<button disabled={submitting} className="mt-5 w-full rounded-lg bg-sage-900 px-4 py-3 text-sm font-bold text-white hover:bg-sage-700 disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit complaint'}</button>
          </form>
          <div className="rounded-xl border border-sage-300/80 bg-white/55 p-5 shadow-sm backdrop-blur-sm"><div className="mb-4"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-sage-900">Your location</h2><span className="text-xs font-bold text-sage-700">{locationStatus}</span></div><p className="mt-1 text-xs font-medium text-sage-800">The map follows your current position.</p></div><div className="relative min-h-[390px] overflow-hidden rounded-lg border border-sage-300"><MapContainer center={[form.lat, form.lng]} zoom={15} scrollWheelZoom className="h-[390px] w-full"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapCenter position={[form.lat, form.lng]} /><Marker position={[form.lat, form.lng]} icon={locationIcon}><Popup>Your current location</Popup></Marker></MapContainer><div className="absolute bottom-3 left-3 z-[1000] rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-sage-900 shadow">{form.lat.toFixed(4)}, {form.lng.toFixed(4)}</div></div><button type="button" onClick={detectLocation} className="mt-3 text-xs font-bold text-sage-700 hover:text-sage-900">Refresh current location</button></div>
        </section>
        <section className="mt-4 rounded-xl border border-sage-300/80 bg-white/65 p-5 shadow-sm backdrop-blur-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-sage-900">Track a request</h2><p className="mt-1 text-xs font-medium text-sage-800">Enter a ticket ID to see the latest service update.</p></div><form onSubmit={trackRequest} className="flex w-full gap-2 sm:w-auto"><input required value={trackingId} onChange={(event) => setTrackingId(event.target.value)} placeholder="ECO-2026-XXXXXX" className="min-w-0 flex-1 rounded-lg border border-sage-300 bg-white/70 px-3 py-2 text-sm font-bold text-sage-900 sm:w-52" /><button className="rounded-lg bg-sage-900 px-3 py-2 text-xs font-bold text-white">Track</button></form></div>{activeRequest && <Timeline activeStep={activeStep} />}</section>
      </main>
    </div>
  );
}

function MapCenter({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);

  return null;
}

function Timeline({ activeStep }) { return <div className="mt-6 grid grid-cols-4 gap-1">{STEPS.map(([id, label], index) => <div key={id} className={`border-t-4 p-3 ${index <= activeStep ? 'border-sage-700 bg-mint/60' : 'border-amber-300 bg-warning-muted/55'}`}><div className="text-xs font-bold text-sage-900">{index + 1}. {label}</div><div className="mt-1 text-[11px] font-semibold text-sage-800">{index < activeStep ? 'Complete' : index === activeStep ? 'Current status' : 'Pending'}</div></div>)}</div>; }

function fileToDataUrl(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
