import { useState } from 'react';

const INITIAL_ALERTS = [
  { id: 1, severity: 'Critical', title: 'North Market bin nearing overflow', message: 'BIN-204 reached 96% capacity and needs collection before the next route cycle.', zone: 'North Market', time: '2 min ago', category: 'Capacity', acknowledged: false },
  { id: 2, severity: 'Warning', title: 'Route delay detected', message: 'Driver 04 is 8 minutes behind schedule near Lakeview Ward.', zone: 'Lakeview Ward', time: '11 min ago', category: 'Operations', acknowledged: false },
  { id: 3, severity: 'Warning', title: 'Segregation quality below target', message: 'Contamination reached 11% across the last three Lakeview collections.', zone: 'Lakeview Ward', time: '24 min ago', category: 'Quality', acknowledged: false },
  { id: 4, severity: 'Info', title: 'Collection route completed', message: 'South Gate route completed with 19 stops and no missed collections.', zone: 'South Gate', time: '41 min ago', category: 'Operations', acknowledged: true },
  { id: 5, severity: 'Info', title: 'Bin connectivity restored', message: 'BIN-087 is reporting fill levels normally after a connectivity gap.', zone: 'Civic Centre', time: '1 hr ago', category: 'System', acknowledged: true },
];

const SEVERITIES = ['All', 'Critical', 'Warning', 'Info'];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [severity, setSeverity] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  const visibleAlerts = alerts.filter((alert) => {
    const matchesSeverity = severity === 'All' || alert.severity === severity;
    const searchText = `${alert.title} ${alert.message} ${alert.zone} ${alert.category}`.toLowerCase();
    return matchesSeverity && searchText.includes(query.toLowerCase());
  });
  const openCount = alerts.filter((alert) => !alert.acknowledged).length;
  const selectedAlert = alerts.find((alert) => alert.id === selectedAlertId);

  function acknowledgeAlert(alertId) {
    setAlerts((current) => current.map((alert) => alert.id === alertId ? { ...alert, acknowledged: true } : alert));
  }

  function acknowledgeAll() {
    setAlerts((current) => current.map((alert) => ({ ...alert, acknowledged: true })));
  }

  return (
    <div className="mx-auto max-w-[1600px] p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-sage-900">Alert Monitoring Center</h1>
          <p className="mt-1 text-sm text-sage-800">Real-time event grid and notification engine</p>
        </div>
        <button type="button" onClick={acknowledgeAll} disabled={openCount === 0} className="rounded-lg bg-sage-900 px-3 py-2 text-xs font-bold text-white hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-40">Acknowledge all</button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Open alerts" value={openCount} tone="alert" />
        <Summary label="Critical" value={alerts.filter((alert) => alert.severity === 'Critical' && !alert.acknowledged).length} tone="critical" />
        <Summary label="Warnings" value={alerts.filter((alert) => alert.severity === 'Warning' && !alert.acknowledged).length} tone="warning" />
        <Summary label="Resolved today" value={alerts.filter((alert) => alert.acknowledged).length} tone="normal" />
      </div>

      <section className="rounded-xl border border-sage-300/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-sage-300 bg-white/55 p-1">
            {SEVERITIES.map((option) => <button key={option} type="button" onClick={() => setSeverity(option)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${severity === option ? 'bg-sage-900 text-white' : 'text-sage-800 hover:bg-sage-100'}`}>{option}</button>)}
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search alerts" className="w-full rounded-lg border border-sage-300 bg-white/70 px-3 py-2 text-sm font-medium text-sage-900 outline-none placeholder:text-sage-700 focus:border-sage-700 sm:w-64" aria-label="Search alerts" />
        </div>

        <div className="space-y-2">
          {visibleAlerts.length === 0 ? <div className="rounded-lg border border-dashed border-sage-300 bg-white/40 p-10 text-center text-sm font-semibold text-sage-800">No alerts match the current filters.</div> : visibleAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} onOpen={() => setSelectedAlertId(alert.id)} onAcknowledge={() => acknowledgeAlert(alert.id)} />)}
        </div>
      </section>

      {selectedAlert && <div className="fixed inset-0 z-20 flex justify-end bg-sage-900/25" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedAlertId(null)}>
        <aside className="h-full w-full max-w-md border-l border-sage-300 bg-[#f5faf4]/95 p-6 shadow-2xl backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="alert-title">
          <div className="flex items-start justify-between gap-4"><div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${severityClass(selectedAlert.severity)}`}>{selectedAlert.severity}</span><h2 id="alert-title" className="mt-3 text-xl font-bold text-sage-900">{selectedAlert.title}</h2></div><button type="button" onClick={() => setSelectedAlertId(null)} className="rounded-lg px-2 py-1 text-xl font-bold text-sage-800 hover:bg-sage-100" aria-label="Close alert">x</button></div>
          <div className="mt-5 space-y-3 text-sm"><Detail label="Location" value={selectedAlert.zone} /><Detail label="Category" value={selectedAlert.category} /><Detail label="Received" value={selectedAlert.time} /></div>
          <p className="mt-6 rounded-lg border border-sage-200 bg-white/70 p-4 font-medium leading-6 text-sage-900">{selectedAlert.message}</p>
          <button type="button" onClick={() => { acknowledgeAlert(selectedAlert.id); setSelectedAlertId(null); }} disabled={selectedAlert.acknowledged} className="mt-6 w-full rounded-lg bg-sage-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{selectedAlert.acknowledged ? 'Acknowledged' : 'Acknowledge alert'}</button>
        </aside>
      </div>}
    </div>
  );
}

function AlertRow({ alert, onOpen, onAcknowledge }) {
  return <div className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${alert.acknowledged ? 'border-sage-200 bg-white/35' : 'border-sage-300 bg-white/65'}`}><div className={`h-2.5 w-2.5 rounded-full ${alert.severity === 'Critical' ? 'bg-alert' : alert.severity === 'Warning' ? 'bg-warning' : 'bg-sage-600'}`} /><button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${severityClass(alert.severity)}`}>{alert.severity}</span><span className="text-sm font-bold text-sage-900">{alert.title}</span></div><div className="mt-1 text-xs font-medium text-sage-800">{alert.zone} · {alert.category} · {alert.time}</div></button><button type="button" onClick={onAcknowledge} disabled={alert.acknowledged} className="rounded-lg border border-sage-600 px-2.5 py-1.5 text-xs font-bold text-sage-900 hover:bg-sage-100 disabled:cursor-not-allowed disabled:opacity-40">{alert.acknowledged ? 'Done' : 'Acknowledge'}</button></div>;
}

function severityClass(severity) {
  return severity === 'Critical' ? 'bg-alert text-white' : severity === 'Warning' ? 'bg-warning-muted text-amber-900' : 'bg-mint text-sage-900';
}

function Summary({ label, value, tone }) {
  return <div className="rounded-xl border border-sage-300/80 bg-white/60 p-3 shadow-sm backdrop-blur-sm"><div className="text-xs font-bold text-sage-800">{label}</div><div className={`mt-1 text-2xl font-bold ${tone === 'critical' ? 'text-alert' : tone === 'warning' ? 'text-amber-800' : 'text-sage-900'}`}>{value}</div></div>;
}

function Detail({ label, value }) {
  return <div className="flex justify-between border-b border-sage-200 pb-2"><span className="font-semibold text-sage-800">{label}</span><span className="font-bold text-sage-900">{value}</span></div>;
}
