import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

function isLocationSupported() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'geolocation' in navigator &&
    (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
}

const citizenMarkerIcon = L.divIcon({
  html: `<div class="flex flex-col items-center">
    <div class="h-6 w-6 rounded-full border-[3px] border-white bg-sage-700 shadow-md"></div>
    <div class="mt-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-sage-900 shadow-sm border border-sage-200">Your reported location</div>
  </div>`,
  className: 'custom-citizen-marker',
  iconSize: [24, 24],
  iconAnchor: [0, 0],
});

function MapRecenter({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
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
  const [photoPreview, setPhotoPreview] = useState('');
  const [mapZoom, setMapZoom] = useState(13);
  const [ticket, setTicket] = useState(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [liveLocation, setLiveLocation] = useState(false);
  const locationWatchId = useRef(null);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const activeRequest = trackingResult || ticket;
  const activeStep = activeRequest ? STEPS.findIndex(([id]) => id === activeRequest.status) : -1;

  useEffect(() => {
    if (!form.photo) {
      setPhotoPreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(form.photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [form.photo]);

  useEffect(() => () => {
    if (locationWatchId.current !== null) {
      navigator.geolocation.clearWatch(locationWatchId.current);
    }
  }, []);

  function applyLocation(nextLat, nextLng, nextZoom = 13) {
    setForm((current) => ({
      ...current,
      lat: nextLat,
      lng: nextLng,
    }));
    setMapZoom(nextZoom);
  }

  function detectLocation() {
    if (!isLocationSupported()) {
      setError('Current location is unavailable on this page because the app is not running on a secure origin. Use the map or enter your address manually.');
      return;
    }

    if (locationWatchId.current !== null) return;

    setLocating(true);
    setError('');
    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        applyLocation(nextLat, nextLng, 18);
        setError('');
        setLocating(false);
        setLiveLocation(true);
      },
      (geoError) => {
        const message = geoError.code === 1
          ? 'Location access was denied. Please allow the browser to use your current location.'
          : geoError.code === 2
            ? 'Location is temporarily unavailable. Try again or click on the map manually.'
            : 'Unable to fetch current location. Please click on the map or enter your address.';
        setError(message);
        setLocating(false);
        setLiveLocation(false);
        if (locationWatchId.current !== null) {
          navigator.geolocation.clearWatch(locationWatchId.current);
          locationWatchId.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
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
            <button type="button" onClick={detectLocation} disabled={locating || liveLocation} className="mt-2 text-left text-xs font-bold text-sage-700 disabled:cursor-wait disabled:opacity-60">{locating ? 'Finding your current location...' : liveLocation ? `Live location active (${form.lat.toFixed(4)}, ${form.lng.toFixed(4)})` : `Use my current location (${form.lat.toFixed(4)}, ${form.lng.toFixed(4)})`}</button>
            <PhotoPicker photo={form.photo} previewUrl={photoPreview} onChange={(photo) => update('photo', photo)} onRemove={() => update('photo', null)} />
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
                zoom={mapZoom}
                className="absolute inset-0 h-full w-full"
                style={{ height: '390px', width: '100%', zIndex: 1 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter lat={form.lat} lng={form.lng} zoom={mapZoom} />
                <MapEvents onMapClick={(lat, lng) => {
                  setForm((c) => ({ ...c, lat, lng }));
                  setMapZoom(13);
                }} />
                <Marker position={[form.lat, form.lng]} icon={citizenMarkerIcon} />
              </MapContainer>
              <div className="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
                <button type="button" onClick={detectLocation} disabled={locating || liveLocation} aria-label="Use current location" aria-busy={locating} title={liveLocation ? 'Live location active' : 'Your Location'} className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white shadow-md transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-60">
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

function PhotoPicker({ photo, previewUrl, onChange, onRemove }) {
  const cameraInput = useRef(null);
  const uploadInput = useRef(null);

  function handleFileChange(event) {
    onChange(event.target.files?.[0] || null);
    event.target.value = '';
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-sage-400 bg-sage-50/50 p-4">
      <div className="text-center text-xs font-semibold text-sage-800">
        <div className="text-sm font-bold text-sage-900">Add a photo of the issue</div>
        <div className="mt-1">JPG or PNG, optional</div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => cameraInput.current?.click()} className="rounded-lg bg-sage-900 px-3 py-2 text-xs font-bold text-white hover:bg-sage-700">
          Take photo
        </button>
        <button type="button" onClick={() => uploadInput.current?.click()} className="rounded-lg border border-sage-400 bg-white px-3 py-2 text-xs font-bold text-sage-900 hover:bg-sage-100">
          Choose from device
        </button>
      </div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="sr-only" aria-label="Take a photo of the bin" />
      <input ref={uploadInput} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" aria-label="Choose a bin photo from your device" />
      {photo && previewUrl && <div className="mt-4 flex items-center gap-3 rounded-lg border border-sage-200 bg-white/70 p-2"><img src={previewUrl} alt="Selected bin evidence" className="h-20 w-20 rounded-md object-cover" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-sage-900">{photo.name}</div><button type="button" onClick={onRemove} className="mt-1 text-xs font-bold text-alert hover:underline">Remove photo</button></div></div>}
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
