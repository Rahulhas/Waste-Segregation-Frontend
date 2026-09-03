import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import RoadRouteMap from '../components/RoadRouteMap';

const ZONES = [
  { id: 'north', name: 'North Market', shortName: 'North', fill: 94, collections: 38, contamination: 7, color: '#b83c2d' },
  { id: 'lake', name: 'Lakeview Ward', shortName: 'Lakeview', fill: 82, collections: 31, contamination: 11, color: '#d38631' },
  { id: 'civic', name: 'Civic Centre', shortName: 'Civic', fill: 68, collections: 27, contamination: 5, color: '#e8c958' },
  { id: 'east', name: 'East Campus', shortName: 'East', fill: 56, collections: 24, contamination: 3, color: '#70a96e' },
  { id: 'river', name: 'Riverside', shortName: 'River', fill: 76, collections: 29, contamination: 9, color: '#d38631' },
  { id: 'south', name: 'South Gate', shortName: 'South', fill: 47, collections: 19, contamination: 2, color: '#70a96e' },
];

const RANGE_DATA = {
  '7 days': { collections: '168', trend: [38, 44, 41, 53, 49, 61, 68], labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], change: '+21.3%' },
  '30 days': { collections: '724', trend: [92, 108, 116, 132, 144, 158, 174], labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'], change: '+16.8%' },
  '90 days': { collections: '2,146', trend: [288, 316, 352, 389, 421, 468, 512], labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], change: '+28.5%' },
};

const COLLECTION_ROUTE_STOPS = [
  { id: 'north', lat: 19.076, lng: 72.877 },
  { id: 'lake', lat: 19.089, lng: 72.865 },
  { id: 'civic', lat: 19.062, lng: 72.881 },
  { id: 'east', lat: 19.071, lng: 72.897 },
];

export default function AdminPage() {
  const [range, setRange] = useState('7 days');
  const [selectedZoneId, setSelectedZoneId] = useState('north');
  const [tickets, setTickets] = useState([]);
  const rangeData = RANGE_DATA[range];
  useEffect(() => { api.citizenRequests().then(({ requests }) => setTickets(requests)).catch(() => {}); }, []);
  const activeTickets = tickets.filter((ticket) => ticket.status !== 'resolved');
  const selectedZone = ZONES.find((zone) => zone.id === selectedZoneId) || ZONES[0];
  const averageFill = Math.round(ZONES.reduce((total, zone) => total + zone.fill, 0) / ZONES.length);
  const averageContamination = (ZONES.reduce((total, zone) => total + zone.contamination, 0) / ZONES.length).toFixed(1);

  return (
    <div className="mx-auto max-w-[1600px] p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-xl font-semibold text-sage-900">Admin Analytics Dashboard</h1><p className="mt-1 text-sm text-sage-800">Municipality GIS heatmaps and predictive analytics</p></div>
        <div className="flex rounded-lg border border-sage-300 bg-white/65 p-1 backdrop-blur-sm" aria-label="Analytics date range">
          {['7 days', '30 days', '90 days'].map((option) => <button key={option} type="button" onClick={() => setRange(option)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${range === option ? 'bg-sage-900 text-white' : 'text-sage-800 hover:bg-sage-100'}`}>{option}</button>)}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Collections completed" value={rangeData.collections} detail={`${rangeData.change} vs last period`} positive />
        <Metric label="Average fill level" value={`${averageFill}%`} detail="Across 126 monitored bins" />
        <Metric label="Diversion rate" value="64.8%" detail="+4.2 pts this period" positive />
        <Metric label="Contamination rate" value={`${averageContamination}%`} detail="Target below 5%" warning />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="rounded-xl border border-sage-300/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm lg:col-span-12">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-sage-900">Live collection route</h2><p className="mt-0.5 text-xs font-medium text-sage-800">Road-snapped route through active collection zones</p></div><span className="rounded-full bg-mint px-2 py-1 text-xs font-bold text-sage-900">Current queue order</span></div>
          <RoadRouteMap stops={COLLECTION_ROUTE_STOPS} height="360px" />
        </section>
        <section className="rounded-xl border border-sage-300/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-sage-900">Zone fill heatmap</h2><p className="mt-0.5 text-xs font-medium text-sage-800">Live capacity by collection zone</p></div><div className="flex items-center gap-2 text-[11px] font-semibold text-sage-800"><span className="h-3 w-3 rounded-sm bg-[#70a96e]" /> Healthy <span className="h-3 w-3 rounded-sm bg-[#e8c958]" /> Watch <span className="h-3 w-3 rounded-sm bg-[#b83c2d]" /> Critical</div></div>
          <div className="grid min-h-[330px] grid-cols-2 gap-2 rounded-lg border border-sage-300 bg-[#dcebdd]/70 p-3 sm:grid-cols-3">
            {ZONES.map((zone) => <button key={zone.id} type="button" onClick={() => setSelectedZoneId(zone.id)} className={`relative overflow-hidden rounded-lg border-2 p-3 text-left transition-transform hover:-translate-y-0.5 ${selectedZoneId === zone.id ? 'border-sage-900 shadow-lg' : 'border-white/70'}`} style={{ backgroundColor: zone.color }}><div className="absolute inset-0 bg-white/15" /><div className="relative flex h-full min-h-[130px] flex-col justify-between"><div><div className="text-sm font-bold text-sage-900">{zone.name}</div><div className="mt-1 text-xs font-semibold text-sage-900/80">{zone.collections} collections</div></div><div><div className="text-3xl font-bold text-sage-900">{zone.fill}%</div><div className="text-[11px] font-bold uppercase tracking-wide text-sage-900/75">Fill level</div></div></div></button>)}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sage-100/75 p-3"><div><span className="text-sm font-bold text-sage-900">{selectedZone.name}</span><span className="ml-2 text-xs font-medium text-sage-800">Selected zone</span></div><div className="flex gap-4 text-xs font-semibold text-sage-900"><span>{selectedZone.fill}% full</span><span>{selectedZone.contamination}% contamination</span></div></div>
        </section>

        <section className="rounded-xl border border-sage-300/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm lg:col-span-4">
          <div className="mb-4"><h2 className="font-semibold text-sage-900">Predictive analytics</h2><p className="mt-0.5 text-xs font-medium text-sage-800">Forecast for the next 24 hours</p></div>
          <div className="rounded-lg border border-alert/30 bg-[#fff5f2]/80 p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-alert">Attention required</span><span className="text-lg font-bold text-alert">3</span></div><p className="mt-1 text-sm font-semibold text-sage-900">Zones likely to exceed 80% capacity</p><div className="mt-3 space-y-2">{ZONES.filter((zone) => zone.fill >= 80).map((zone) => <button key={zone.id} type="button" onClick={() => setSelectedZoneId(zone.id)} className="flex w-full items-center justify-between text-left text-xs font-bold text-sage-900 hover:text-alert"><span>{zone.name}</span><span>{zone.fill}% by 14:00</span></button>)}</div></div>
          <div className="mt-3 rounded-lg border border-sage-200 bg-white/50 p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-sage-800">Recommended action</span><span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-sage-900">94% confidence</span></div><p className="mt-2 text-sm font-semibold text-sage-900">Add one collection vehicle to the north loop.</p><p className="mt-1 text-xs font-medium text-sage-800">This could prevent approximately 18 overflow events this week.</p></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><ForecastStat label="Expected overflow" value="18" /><ForecastStat label="Route efficiency" value="87%" /></div>
          <div className="mt-3 rounded-lg border border-sage-200 bg-white/55 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-sage-900">Prioritized citizen tickets</span><span className="rounded-full bg-alert px-2 py-0.5 text-[11px] font-bold text-white">{activeTickets.length}</span></div>{activeTickets.length === 0 ? <p className="text-xs font-medium text-sage-800">No active citizen tickets.</p> : activeTickets.slice(0, 4).map((ticket) => <div key={ticket.ticketId} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-sage-200 py-2 text-[11px] font-semibold text-sage-900"><span>{ticket.ticketId}</span><span>{ticket.requestType.replace('_', ' ')}</span><span className="capitalize">{ticket.status}</span></div>)}</div>
        </section>

        <section className="rounded-xl border border-sage-300/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm lg:col-span-7"><div className="mb-4 flex items-start justify-between"><div><h2 className="font-semibold text-sage-900">Collection trend</h2><p className="mt-0.5 text-xs font-medium text-sage-800">Completed collections · {range}</p></div><span className="text-sm font-bold text-sage-900">{rangeData.change}</span></div><div className="h-48 w-full"><svg viewBox="0 0 700 190" className="h-full w-full" role="img" aria-label={`${range} collection trend chart`}><path d="M40 155 H670 M40 110 H670 M40 65 H670 M40 20 H670" stroke="#a8c1a0" strokeDasharray="3 5" /><path d={`${buildAreaPath(rangeData.trend)} L670 155 L40 155 Z`} fill="#52b788" fillOpacity=".18" /><path d={buildChartPath(rangeData.trend)} fill="none" stroke="#145c43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{rangeData.trend.map((value, index) => <circle key={rangeData.labels[index]} cx={40 + index * 105} cy={chartY(value, rangeData.trend)} r="4.5" fill="#f5faf4" stroke="#145c43" strokeWidth="3" />)}{rangeData.labels.map((day, index) => <text key={day} x={40 + index * 105} y="180" textAnchor="middle" fontSize="12" fill="#315848" fontWeight="600">{day}</text>)}</svg></div></section>

        <section className="rounded-xl border border-sage-300/80 bg-white/60 p-4 shadow-sm backdrop-blur-sm lg:col-span-5"><div className="mb-4"><h2 className="font-semibold text-sage-900">Zone performance</h2><p className="mt-0.5 text-xs font-medium text-sage-800">Operational indicators by area</p></div><div className="space-y-3">{ZONES.slice(0, 4).map((zone) => <button key={zone.id} type="button" onClick={() => setSelectedZoneId(zone.id)} className="w-full text-left"><div className="mb-1 flex justify-between text-xs font-bold text-sage-900"><span>{zone.shortName}</span><span>{zone.collections} trips</span></div><div className="h-2 overflow-hidden rounded-full bg-sage-200"><div className="h-full rounded-full bg-sage-700" style={{ width: `${(zone.collections / 40) * 100}%` }} /></div></button>)}</div><div className="mt-5 rounded-lg border border-sage-200 bg-mint/45 p-3 text-xs font-semibold text-sage-900">Data refreshed just now from 126 connected bins.</div></section>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, positive, warning }) {
  return <div className="rounded-xl border border-sage-300/80 bg-white/60 p-3 shadow-sm backdrop-blur-sm"><div className="text-xs font-bold text-sage-800">{label}</div><div className="mt-1 text-2xl font-bold text-sage-900">{value}</div><div className={`mt-1 text-[11px] font-semibold ${warning ? 'text-alert' : positive ? 'text-sage-700' : 'text-sage-800'}`}>{detail}</div></div>;
}

function ForecastStat({ label, value }) {
  return <div className="rounded-lg bg-sage-100/75 p-2.5"><div className="text-[11px] font-semibold text-sage-800">{label}</div><div className="mt-1 text-lg font-bold text-sage-900">{value}</div></div>;
}

function chartY(value, values) {
  return 155 - (value / Math.max(...values)) * 125;
}

function buildChartPath(values) {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'}${40 + index * 105} ${chartY(value, values)}`).join(' ');
}

function buildAreaPath(values) {
  return `${buildChartPath(values)} L670 155`;
}
