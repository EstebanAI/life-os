import { useState, useEffect } from 'react';
import api from '../api/client';
import { DIMENSIONS, QUARTER_NAMES, getCurrentQuarter } from '../constants';

function StatBar({ score, maxScore = 10, color }) {
  return (
    <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${(score / maxScore) * 100}%`, background: color }}
      />
    </div>
  );
}

export default function Quarterly() {
  const currentQ = getCurrentQuarter();
  const currentYear = new Date().getFullYear();
  const [selectedQ, setSelectedQ] = useState(currentQ);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [goals, setGoals] = useState(['', '', '']);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setSaved(false);
      try {
        const [statsRes, histRes] = await Promise.all([
          api.get(`/quarterly/stats?quarter=${selectedQ}&year=${selectedYear}`),
          api.get('/quarterly'),
        ]);
        setStats(statsRes.data);
        setHistory(histRes.data);

        if (statsRes.data.savedGoals) {
          const g = statsRes.data.savedGoals.goals;
          setGoals([g[0] || '', g[1] || '', g[2] || '']);
          setObservations(statsRes.data.savedGoals.observations || '');
        } else {
          setGoals(['', '', '']);
          setObservations('');
        }
      } catch (err) {
        setError('Error al cargar datos');
      }
      setLoading(false);
    }
    load();
  }, [selectedQ, selectedYear]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const filteredGoals = goals.filter(g => g.trim());
      await api.post('/quarterly', {
        quarter: selectedQ,
        year: selectedYear,
        goals: filteredGoals,
        observations,
      });
      setSaved(true);
      const histRes = await api.get('/quarterly');
      setHistory(histRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    }
    setSaving(false);
  }

  function getDimStats(dimensionStats, key) {
    return dimensionStats?.find(s => s.dimension === key);
  }

  const years = [currentYear - 1, currentYear, currentYear + 1];
  const quarters = [1, 2, 3, 4];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">Cargando revisión trimestral...</div>
      </div>
    );
  }

  const hasCurrData = stats?.current?.stats?.length > 0;
  const hasPrevData = stats?.previous?.stats?.length > 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Revisión Trimestral</h2>
          <p className="text-text-muted text-sm mt-0.5">Reflexiona sobre tu progreso cada 3 meses</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedQ}
            onChange={e => setSelectedQ(parseInt(e.target.value))}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {quarters.map(q => (
              <option key={q} value={q}>{QUARTER_NAMES[q]}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!hasCurrData && !hasPrevData ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-text-muted text-sm">
            No hay check-ins registrados para {QUARTER_NAMES[selectedQ]} {selectedYear}.
          </p>
        </div>
      ) : (
        <>
          {/* Comparison table */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-5">
              Comparación de dimensiones
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-text-muted font-normal py-2 pr-6">Dimensión</th>
                    {hasPrevData && (
                      <th className="text-center text-text-muted font-normal py-2 px-4 min-w-[100px]">
                        {QUARTER_NAMES[stats.previous.quarter]} {stats.previous.year}
                      </th>
                    )}
                    {hasCurrData && (
                      <th className="text-center text-text-secondary font-medium py-2 px-4 min-w-[100px]">
                        {QUARTER_NAMES[selectedQ]} {selectedYear}
                      </th>
                    )}
                    {hasCurrData && hasPrevData && (
                      <th className="text-center text-text-muted font-normal py-2 pl-4">Δ</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {DIMENSIONS.map(dim => {
                    const curr = getDimStats(stats?.current?.stats, dim.key);
                    const prev = getDimStats(stats?.previous?.stats, dim.key);
                    const delta = curr && prev ? (parseFloat(curr.avg_score) - parseFloat(prev.avg_score)).toFixed(1) : null;
                    return (
                      <tr key={dim.key} className="border-b border-border/50">
                        <td className="py-3 pr-6">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dim.color }} />
                            <span className="text-text-primary font-medium">{dim.label}</span>
                          </div>
                          {curr && (
                            <StatBar score={parseFloat(curr.avg_score)} color={dim.color} />
                          )}
                        </td>
                        {hasPrevData && (
                          <td className="text-center py-3 px-4 text-text-muted">
                            {prev ? parseFloat(prev.avg_score).toFixed(1) : '—'}
                          </td>
                        )}
                        {hasCurrData && (
                          <td className="text-center py-3 px-4 font-semibold text-text-primary">
                            {curr ? parseFloat(curr.avg_score).toFixed(1) : '—'}
                          </td>
                        )}
                        {hasCurrData && hasPrevData && (
                          <td className="text-center py-3 pl-4">
                            {delta != null ? (
                              <span className={parseFloat(delta) > 0 ? 'text-success' : parseFloat(delta) < 0 ? 'text-danger' : 'text-text-muted'}>
                                {parseFloat(delta) > 0 ? `+${delta}` : delta === '0.0' ? '—' : delta}
                              </span>
                            ) : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes from the period */}
          {hasCurrData && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
                Notas del período
              </h3>
              <div className="space-y-4">
                {DIMENSIONS.map(dim => {
                  const curr = getDimStats(stats?.current?.stats, dim.key);
                  const notes = curr?.notes?.filter(n => n && n.trim()) || [];
                  if (notes.length === 0) return null;
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: dim.color }} />
                        <span className="text-sm font-medium" style={{ color: dim.color }}>{dim.label}</span>
                      </div>
                      <ul className="space-y-1 ml-4">
                        {notes.map((note, i) => (
                          <li key={i} className="text-xs text-text-secondary before:content-['·'] before:mr-2">
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Goals section */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-1">
          Objetivos para el próximo trimestre
        </h3>
        <p className="text-xs text-text-muted mb-5">Define 1 a 3 objetivos concretos</p>
        <div className="space-y-3 mb-5">
          {goals.map((goal, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-xs text-text-muted shrink-0">
                {i + 1}
              </div>
              <input
                type="text"
                value={goal}
                onChange={e => setGoals(prev => prev.map((g, idx) => idx === i ? e.target.value : g))}
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                placeholder={`Objetivo ${i + 1} (opcional)`}
              />
            </div>
          ))}
        </div>

        <div className="mb-5">
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Reflexión general del trimestre
          </label>
          <textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows={3}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
            placeholder="¿Qué aprendiste? ¿Qué repetirías o cambiarías?..."
          />
        </div>

        {error && (
          <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}
        {saved && (
          <p className="text-success text-sm bg-success/10 border border-success/20 rounded-lg px-3 py-2 mb-4">
            Revisión guardada correctamente.
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent hover:bg-accent-light disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar revisión'}
        </button>
      </div>

      {/* Past quarterly goals */}
      {history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
            Historial de revisiones
          </h3>
          <div className="space-y-4">
            {history.map(h => (
              <div key={h.id} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-text-primary">
                    {QUARTER_NAMES[h.quarter]} {h.year}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(h.created_at).toLocaleDateString('es-MX')}
                  </span>
                </div>
                {Array.isArray(h.goals) && h.goals.length > 0 ? (
                  <ul className="space-y-1">
                    {h.goals.map((g, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-accent-light mt-0.5">◆</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted">Sin objetivos registrados</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
