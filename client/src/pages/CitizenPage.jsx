import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const citizenMarkerIcon = L.divIcon({
  html: `<div class="flex flex-col items-center">
    <div class="h-6 w-6 rounded-full border-[3px] border-white bg-sage-700 shadow-md"></div>
    <div class="mt-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-sage-900 shadow-sm border border-sage-200">Your reported location</div>
  </div>`,
  className: 'custom-citizen-marker',
  iconSize: [24, 24],
  iconAnchor: [0, 0],
});

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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
  const [form, setForm] = useState({ name: '', contact: '', type: 'overflow', address: '', lat: 19.076, lng: 72.877, photo: null });
  const [ticket, setTicket] = useState(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const activeRequest = trackingResult || ticket;
  const activeStep = activeRequest ? STEPS.findIndex(([id]) => id === activeRequest.status) : -1;

  function detectLocation() {
    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser. You can still submit the address.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        setForm((current) => ({
          ...current,
          lat: nextLat,
          lng: nextLng,
        }));
        setError('');
      },
      () => {
        setError('Location permission was unavailable. Please allow access to use your current location.');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
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
          <div className="rounded-xl border border-sage-300/80 bg-white/55 p-5 shadow-sm backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-sage-900">Your location</h2>
              <p className="mt-1 text-xs font-medium text-sage-800">Click on the map or drag the marker to adjust, or use GPS location.</p>
            </div>
            <div className="relative min-h-[390px] overflow-hidden rounded-lg border border-sage-300">
              <MapContainer
                center={[form.lat, form.lng]}
                zoom={13}
                className="absolute inset-0 h-full w-full"
                style={{ height: '390px', width: '100%', zIndex: 1 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter lat={form.lat} lng={form.lng} />
                <MapEvents onMapClick={(lat, lng) => setForm((c) => ({ ...c, lat, lng }))} />
                <Marker position={[form.lat, form.lng]} icon={citizenMarkerIcon} />
              </MapContainer>
              <div className="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
                <button type="button" onClick={detectLocation} aria-label="Use current location" title="Your Location" className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white shadow-md transition hover:scale-[1.02]">
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="absolute h-5 w-5 rounded-full border-[2px] border-sky-500 animate-ping opacity-75" />
                    <span className="absolute h-5 w-5 rounded-full border-[2px] border-sky-500" />
                    <span className="absolute h-1.5 w-1.5 rounded-full bg-sky-500" />
                  </span>
                  <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 translate-x-1">Your Location</span>
                </button>
              </div>
              <div className="absolute bottom-3 left-3 z-[1000] rounded-md bg-white/85 border border-sage-300 px-2.5 py-1.5 text-xs font-bold text-sage-900 shadow">
                {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
              </div>
            </div>
          </div>
        </section>
        <section className="mt-4 rounded-xl border border-sage-300/80 bg-white/65 p-5 shadow-sm backdrop-blur-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-sage-900">Track a request</h2><p className="mt-1 text-xs font-medium text-sage-800">Enter a ticket ID to see the latest service update.</p></div><form onSubmit={trackRequest} className="flex w-full gap-2 sm:w-auto"><input required value={trackingId} onChange={(event) => setTrackingId(event.target.value)} placeholder="ECO-2026-XXXXXX" className="min-w-0 flex-1 rounded-lg border border-sage-300 bg-white/70 px-3 py-2 text-sm font-bold text-sage-900 sm:w-52" /><button className="rounded-lg bg-sage-900 px-3 py-2 text-xs font-bold text-white">Track</button></form></div>{activeRequest && <Timeline activeStep={activeStep} />}</section>
      </main>
    </div>
  );
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
