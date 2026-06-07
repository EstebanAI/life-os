import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../api/client';
import { DIMENSIONS, formatWeekStart } from '../constants';

const PERIODS = [
  { value: '1m', label: '1 mes' },
  { value: '3m', label: '3 meses' },
  { value: 'all', label: 'Todo' },
];

function CalendarView({ dates }) {
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells = Array.from({ length: startOffset }).fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const dateSet = new Set(dates);
  const monthStr = viewDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  function cellDate(day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="text-text-muted hover:text-text-primary px-2 py-1 text-sm transition-colors"
        >
          ←
        </button>
        <span className="text-sm font-medium text-text-primary capitalize">{monthStr}</span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="text-text-muted hover:text-text-primary px-2 py-1 text-sm transition-colors"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['L','M','X','J','V','S','D'].map(d => (
          <div key={d} className="text-xs text-text-muted py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          const isCheckin = day && dateSet.has(cellDate(day));
          const today = new Date();
          const isToday = day && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs transition-colors ${
                !day ? '' :
                isCheckin ? 'bg-accent text-white font-medium' :
                isToday ? 'border border-border text-text-primary' :
                'text-text-muted'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareView({ weeks }) {
  const [week1, setWeek1] = useState('');
  const [week2, setWeek2] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function compare() {
    if (!week1 || !week2) return;
    setLoading(true);
    try {
      const res = await api.get(`/checkins/compare?week1=${week1}&week2=${week2}`);
      setData(res.data);
    } catch {}
    setLoading(false);
  }

  function scoreMap(ci) {
    if (!ci) return {};
    return Object.fromEntries(ci.dimensions.map(d => [d.dimension, d.score]));
  }

  const m1 = scoreMap(data?.week1);
  const m2 = scoreMap(data?.week2);

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <select
          value={week1}
          onChange={e => setWeek1(e.target.value)}
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Semana A</option>
          {weeks.map(w => (
            <option key={w.week_start} value={w.week_start}>{formatWeekStart(w.week_start)}</option>
          ))}
        </select>
        <select
          value={week2}
          onChange={e => setWeek2(e.target.value)}
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Semana B</option>
          {weeks.map(w => (
            <option key={w.week_start} value={w.week_start}>{formatWeekStart(w.week_start)}</option>
          ))}
        </select>
        <button
          onClick={compare}
          disabled={!week1 || !week2 || loading}
          className="bg-accent hover:bg-accent-light disabled:opacity-40 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? '...' : 'Comparar'}
        </button>
      </div>

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-text-muted font-normal py-2 pr-4">Dimensión</th>
                <th className="text-center text-text-secondary font-medium py-2 px-4">
                  {data.week1 ? formatWeekStart(data.week1.week_start) : week1}
                </th>
                <th className="text-center text-text-secondary font-medium py-2 px-4">
                  {data.week2 ? formatWeekStart(data.week2.week_start) : week2}
                </th>
                <th className="text-center text-text-muted font-normal py-2 pl-4">Δ</th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map(dim => {
                const s1 = m1[dim.key];
                const s2 = m2[dim.key];
                const delta = s1 != null && s2 != null ? s2 - s1 : null;
                return (
                  <tr key={dim.key} className="border-b border-border/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: dim.color }} />
                        <span className="text-text-primary">{dim.label}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 font-medium text-text-primary">
                      {s1 != null ? s1 : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="text-center py-3 px-4 font-medium text-text-primary">
                      {s2 != null ? s2 : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="text-center py-3 pl-4">
                      {delta != null ? (
                        <span className={delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-text-muted'}>
                          {delta > 0 ? `+${delta}` : delta === 0 ? '—' : delta}
                        </span>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function History() {
  const [period, setPeriod] = useState('3m');
  const [history, setHistory] = useState([]);
  const [calDates, setCalDates] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [activeDims, setActiveDims] = useState(new Set(DIMENSIONS.map(d => d.key)));

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [histRes, calRes, weeksRes] = await Promise.all([
          api.get(`/checkins/history?period=${period}`),
          api.get('/checkins/calendar'),
          api.get('/checkins/weeks'),
        ]);
        setHistory(histRes.data);
        setCalDates(calRes.data);
        setWeeks(weeksRes.data);
      } catch {}
      setLoading(false);
    }
    load();
  }, [period]);

  const chartData = history.map(ci => {
    const entry = { week: formatWeekStart(ci.week_start) };
    ci.dimensions.forEach(d => { entry[d.dimension] = d.score; });
    return entry;
  });

  function toggleDim(key) {
    setActiveDims(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const TABS = [
    { id: 'chart', label: 'Gráfica' },
    { id: 'calendar', label: 'Calendario' },
    { id: 'compare', label: 'Comparar' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">Historial y métricas</h2>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === t.id ? 'bg-card text-text-primary font-medium' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'chart' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex gap-1">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    period === p.value ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {DIMENSIONS.map(d => (
                <button
                  key={d.key}
                  onClick={() => toggleDim(d.key)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-opacity"
                  style={{ opacity: activeDims.has(d.key) ? 1 : 0.3 }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">Cargando...</div>
          ) : history.length < 2 ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">
              Necesitas al menos 2 check-ins para ver la gráfica.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="week" tick={{ fill: '#606060', fontSize: 10 }} />
                <YAxis domain={[1, 10]} tick={{ fill: '#606060', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 8 }}
                  labelStyle={{ color: '#A0A0A0', fontSize: 11 }}
                  itemStyle={{ fontSize: 12 }}
                />
                {DIMENSIONS.map(d => activeDims.has(d.key) && (
                  <Line
                    key={d.key}
                    type="monotone"
                    dataKey={d.key}
                    name={d.label}
                    stroke={d.color}
                    strokeWidth={2}
                    dot={{ fill: d.color, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-card border border-border rounded-2xl p-6 max-w-sm">
          <CalendarView dates={calDates} />
          <div className="flex items-center gap-2 mt-4 text-xs text-text-muted">
            <div className="w-3 h-3 rounded-sm bg-accent" />
            <span>Día con check-in</span>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-5">
            Comparar dos semanas
          </h3>
          <CompareView weeks={weeks} />
        </div>
      )}
    </div>
  );
}
