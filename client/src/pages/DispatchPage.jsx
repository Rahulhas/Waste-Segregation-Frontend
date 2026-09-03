import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import RoadRouteMap from '../components/RoadRouteMap';

const INITIAL_BINS = [
  { id: 'BIN-204', zone: 'North Market', fill: 96, type: 'Mixed waste', eta: '08:20', status: 'Urgent', lat: 19.095, lng: 72.865 },
  { id: 'BIN-118', zone: 'Lakeview Ward', fill: 91, type: 'Organic', eta: '08:35', status: 'Priority', lat: 19.085, lng: 72.888 },
  { id: 'BIN-067', zone: 'Civic Centre', fill: 86, type: 'Recyclables', eta: '08:50', status: 'Priority', lat: 19.076, lng: 72.877 },
  { id: 'BIN-311', zone: 'East Campus', fill: 83, type: 'Paper', eta: '09:10', status: 'Queued', lat: 19.062, lng: 72.890 },
];

const AUDIT_ITEMS = [
  'Organic waste is separated',
  'Recyclables are free of food residue',
  'Bin area is clear and accessible',
];

export default function DispatchPage() {
          const [bins, setBins] = useState(INITIAL_BINS);
          const [selectedBinId, setSelectedBinId] = useState(INITIAL_BINS[0].id);
          const [auditBinId, setAuditBinId] = useState(null);
          const [auditChecks, setAuditChecks] = useState([]);
          const [auditSaved, setAuditSaved] = useState(false);
          const [auditedBinIds, setAuditedBinIds] = useState([]);
          const [citizenTickets, setCitizenTickets] = useState([]);
          const [selectedTicketId, setSelectedTicketId] = useState(null);
          const [proofPhoto, setProofPhoto] = useState(null);

          useEffect(() => {
            api.citizenRequests('status=verified').then(({ requests }) => setCitizenTickets(requests)).catch(() => {});
          }, []);

          const selectedBin = bins.find((bin) => bin.id === selectedBinId) || bins[0];
          const auditBin = bins.find((bin) => bin.id === auditBinId);
          const selectedTicket = citizenTickets.find((ticket) => ticket.ticketId === selectedTicketId);

          function dispatchBin(binId) {
            setBins((currentBins) => currentBins.filter((bin) => bin.id !== binId));
            if (selectedBinId === binId) {
              const nextBin = bins.find((bin) => bin.id !== binId);
              setSelectedBinId(nextBin?.id || null);
            }
          }

          function openAudit(binId) {
            setAuditBinId(binId);
            setAuditChecks([]);
            setAuditSaved(false);
          }

          function toggleAuditItem(item) {
            setAuditChecks((current) =>
              current.includes(item) ? current.filter((checked) => checked !== item) : [...current, item],
            );
            setAuditSaved(false);
          }

          async function resolveTicket() {
            if (!selectedTicket) return;
            try {
              await api.updateCitizenRequestStatus(selectedTicket.ticketId, { status: 'resolved', driverProofPhotoUrl: await fileToDataUrl(proofPhoto) });
              setCitizenTickets((current) => current.filter((ticket) => ticket.ticketId !== selectedTicket.ticketId));
              setSelectedTicketId(null);
              setProofPhoto(null);
            } catch (error) {
              setAuditSaved(false);
            }
          }

          return (
            <div className="mx-auto max-w-[1600px] p-6">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold text-sage-900">Driver & Collector Dispatch</h1>
                  <p className="mt-1 text-sm text-sage-800">Prioritized bin queue, GPS routing, and segregation audit</p>
                </div>
                <div className="rounded-full border border-sage-300 bg-white/65 px-3 py-1.5 text-xs font-semibold text-sage-900 backdrop-blur-sm">
                  {bins.length} stops remaining
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-12">
                <section className="rounded-xl border border-sage-300/80 bg-white/55 p-4 shadow-sm backdrop-blur-sm lg:col-span-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-sage-900">Priority queue</h2>
                      <p className="mt-0.5 text-xs text-sage-800">Bins above 80% capacity</p>
                    </div>
                    <span className="rounded-full bg-sage-900 px-2 py-1 text-xs font-semibold text-white">{bins.length}</span>
                  </div>
                  <div className="space-y-2">
                    {bins.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-sage-300 bg-white/45 p-6 text-center text-sm font-medium text-sage-800">All priority stops dispatched.</div>
                    ) : bins.map((bin) => (
                      <button key={bin.id} type="button" onClick={() => setSelectedBinId(bin.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedBinId === bin.id ? 'border-sage-600 bg-sage-100/80' : 'border-sage-200 bg-white/45 hover:bg-sage-50/80'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-sage-900">{bin.id}</div>
                            <div className="text-xs font-medium text-sage-800">{bin.zone} · {bin.type}</div>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${bin.status === 'Urgent' ? 'bg-alert text-white' : 'bg-mint text-sage-900'}`}>{bin.status}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage-200"><div className={`h-full rounded-full ${bin.fill >= 90 ? 'bg-alert' : 'bg-sage-600'}`} style={{ width: `${bin.fill}%` }} /></div>
                          <span className="text-xs font-bold text-sage-900">{bin.fill}%</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-sage-800"><span>Collection ETA {bin.eta}</span><span>Tap to route</span></div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-sage-300/80 bg-white/55 p-4 shadow-sm backdrop-blur-sm lg:col-span-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div><h2 className="font-semibold text-sage-900">Live collection route</h2><p className="mt-0.5 text-xs font-medium text-sage-800">Driver 04 · North district loop</p></div>
                    <span className="rounded-full bg-mint px-2 py-1 text-xs font-bold text-sage-900">On schedule</span>
                  </div>
                  <RoadRouteMap stops={bins} selectedStopId={selectedBinId} onSelect={setSelectedBinId} />
                  <div className="mt-2 text-xs font-semibold text-sage-800">Road-snapped route · Stops follow the current queue order</div>
                  {selectedBin ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sage-200 bg-white/55 p-3">
                      <div><div className="text-sm font-bold text-sage-900">Next stop: {selectedBin.id}</div><div className="text-xs font-medium text-sage-800">{selectedBin.zone} · {selectedBin.fill}% full</div></div>
                      <button type="button" onClick={() => dispatchBin(selectedBin.id)} className="rounded-lg bg-sage-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-sage-700">Mark collected</button>
                    </div>
                  ) : <div className="mt-4 rounded-lg bg-mint/70 p-3 text-sm font-semibold text-sage-900">Route complete for this shift.</div>}
                </section>

                <section className="rounded-xl border border-sage-300/80 bg-white/55 p-4 shadow-sm backdrop-blur-sm lg:col-span-3">
                  <div className="mb-4"><h2 className="font-semibold text-sage-900">Segregation audit</h2><p className="mt-0.5 text-xs font-medium text-sage-800">Verify each collection before closeout</p></div>
                  <div className="space-y-2">
                    {bins.slice(0, 3).map((bin) => <div key={bin.id} className="flex items-center justify-between gap-2 border-b border-sage-200 pb-3 pt-1 last:border-0"><div><div className="text-sm font-bold text-sage-900">{bin.id}</div><div className="text-xs font-medium text-sage-800">{bin.zone}</div></div><button type="button" onClick={() => openAudit(bin.id)} className="rounded-lg border border-sage-600 px-2.5 py-1.5 text-xs font-bold text-sage-900 hover:bg-sage-100">Audit</button></div>)}
                  </div>
                  <div className="mt-4 rounded-lg bg-sage-100/80 p-3"><div className="text-xs font-bold uppercase tracking-wide text-sage-900">Shift summary</div><div className="mt-2 flex justify-between text-sm font-semibold text-sage-900"><span>Audits complete</span><span>{auditedBinIds.length} / {INITIAL_BINS.length}</span></div><div className="mt-2 h-1.5 rounded-full bg-sage-200"><div className="h-full rounded-full bg-sage-700" style={{ width: `${(auditedBinIds.length / INITIAL_BINS.length) * 100}%` }} /></div></div>
                </section>
              </div>

              {auditBin && <div className="fixed inset-0 z-20 flex justify-end bg-sage-900/25" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAuditBinId(null)}>
                <aside className="h-full w-full max-w-md border-l border-sage-300 bg-[#f5faf4]/95 p-6 shadow-2xl backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="audit-title">
                  <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-wide text-sage-700">Collection audit</div><h2 id="audit-title" className="mt-1 text-xl font-bold text-sage-900">{auditBin.id} · {auditBin.zone}</h2></div><button type="button" onClick={() => setAuditBinId(null)} className="rounded-lg px-2 py-1 text-xl font-bold text-sage-800 hover:bg-sage-100" aria-label="Close audit">×</button></div>
                  <p className="mt-2 text-sm font-medium text-sage-800">Record the segregation condition at pickup.</p>
                  <div className="mt-6 space-y-3">{AUDIT_ITEMS.map((item) => <label key={item} className="flex cursor-pointer items-start gap-3 rounded-lg border border-sage-200 bg-white/70 p-3 text-sm font-semibold text-sage-900"><input type="checkbox" checked={auditChecks.includes(item)} onChange={() => toggleAuditItem(item)} className="mt-0.5 h-4 w-4 accent-[#145c43]" /><span>{item}</span></label>)}</div>
                  <button type="button" disabled={auditChecks.length !== AUDIT_ITEMS.length} onClick={() => { setAuditedBinIds((current) => current.includes(auditBin.id) ? current : [...current, auditBin.id]); setAuditSaved(true); }} className="mt-6 w-full rounded-lg bg-sage-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-sage-700">Save audit</button>
                  {auditSaved && <div className="mt-3 rounded-lg bg-mint p-3 text-sm font-bold text-sage-900">Audit saved for {auditBin.id}.</div>}
                </aside>
              </div>}
            {citizenTickets.length > 0 && <div className="mt-3 rounded-lg border border-amber-300 bg-warning-muted/70 p-3"><div className="mb-2 text-xs font-bold uppercase tracking-wide text-sage-900">Citizen ticket waypoints</div><div className="flex flex-wrap gap-2">{citizenTickets.map((ticket) => <button key={ticket.ticketId} type="button" onClick={() => setSelectedTicketId(ticket.ticketId)} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${selectedTicketId === ticket.ticketId ? 'border-sage-900 bg-sage-900 text-white' : 'border-sage-600 bg-white text-sage-900'}`}>Pin {ticket.ticketId}</button>)}</div></div>}
            {selectedTicket && <div className="mt-3 rounded-lg border border-amber-300 bg-white/70 p-3"><div className="flex items-start justify-between gap-2"><div><div className="text-sm font-bold text-sage-900">Citizen ticket waypoint</div><div className="text-xs font-semibold text-sage-800">{selectedTicket.ticketId} · {selectedTicket.location.address_string}</div></div><span className="rounded-full bg-warning-muted px-2 py-1 text-[11px] font-bold capitalize text-amber-900">{selectedTicket.requestType.replace('_', ' ')}</span></div>{selectedTicket.photoUrl && <img src={selectedTicket.photoUrl} alt="Citizen reported issue" className="mt-2 h-24 w-full rounded object-cover" />}<label className="mt-3 block text-xs font-bold text-sage-900">Driver proof photo<input type="file" accept="image/*" onChange={(event) => setProofPhoto(event.target.files?.[0] || null)} className="mt-1 w-full text-xs" /></label><button type="button" onClick={resolveTicket} className="mt-3 rounded-lg bg-sage-900 px-3 py-2 text-xs font-bold text-white hover:bg-sage-700">Mark as resolved</button></div>}
            </div>
          );
        }

function fileToDataUrl(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
