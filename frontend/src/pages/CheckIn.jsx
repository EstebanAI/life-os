import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { DIMENSIONS } from '../constants';

const INITIAL_SCORES = DIMENSIONS.map(d => ({
  dimension: d.key,
  score: 5,
  note: '',
  action: '',
}));

export default function CheckIn() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0..6 = dimensions, 7 = summary
  const [scores, setScores] = useState(INITIAL_SCORES);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingWeek, setExistingWeek] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await api.get('/checkins/latest');
        if (res.data) {
          const weekStart = res.data.week_start;
          const monday = getMondayStr(new Date());
          if (weekStart === monday || weekStart === monday.slice(0, 10)) {
            setExistingWeek(true);
            const mapped = DIMENSIONS.map(d => {
              const found = res.data.dimensions.find(x => x.dimension === d.key);
              return { dimension: d.key, score: found?.score ?? 5, note: found?.note ?? '', action: found?.action ?? '' };
            });
            setScores(mapped);
          }
        }
      } catch {}
    }
    checkExisting();
  }, []);

  function getMondayStr(date) {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString().split('T')[0];
  }

  function updateScore(field, value) {
    setScores(prev => prev.map((s, i) => i === step ? { ...s, [field]: value } : s));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/checkins', { scores });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const lowestIdx = scores.reduce((acc, s, i) => s.score < scores[acc].score ? i : acc, 0);
    const lowestDim = DIMENSIONS[lowestIdx];
    return (
      <div className="animate-fade-in max-w-lg mx-auto text-center py-12">
        <div className="text-5xl mb-4">✦</div>
        <h2 className="text-2xl font-semibold text-text-primary mb-2">¡Check-in guardado!</h2>
        <p className="text-text-muted mb-8">Aquí está tu resumen de esta semana.</p>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6 text-left space-y-3">
          {DIMENSIONS.map((dim, i) => (
            <div key={dim.key} className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{dim.label}</span>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-24 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${scores[i].score * 10}%`, background: dim.color }}
                  />
                </div>
                <span className="text-sm font-medium w-4 text-right" style={{ color: dim.color }}>
                  {scores[i].score}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl p-4 mb-8 border text-left"
          style={{ background: lowestDim.color + '15', borderColor: lowestDim.color + '40' }}
        >
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: lowestDim.color }}>
            Necesita más atención esta semana
          </p>
          <p className="text-text-primary font-medium">{lowestDim.label}</p>
          {scores[lowestIdx].action && (
            <p className="text-text-secondary text-sm mt-1">→ {scores[lowestIdx].action}</p>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          className="bg-accent hover:bg-accent-light text-white px-8 py-3 rounded-xl font-medium transition-colors"
        >
          Ver Dashboard
        </button>
      </div>
    );
  }

  if (step === 7) {
    const lowestIdx = scores.reduce((acc, s, i) => s.score < scores[acc].score ? i : acc, 0);
    return (
      <div className="animate-fade-in max-w-lg mx-auto">
        <h2 className="text-xl font-semibold text-text-primary mb-1">Resumen del check-in</h2>
        <p className="text-text-muted text-sm mb-6">Revisa antes de guardar.</p>

        <div className="bg-card border border-border rounded-2xl divide-y divide-border mb-6">
          {DIMENSIONS.map((dim, i) => (
            <div
              key={dim.key}
              className={`px-5 py-4 flex items-center gap-4 ${i === lowestIdx ? 'bg-danger/5' : ''}`}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: dim.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text-primary">{dim.label}</span>
                  <span className="text-xl font-bold" style={{ color: dim.color }}>
                    {scores[i].score}
                  </span>
                </div>
                {scores[i].note && (
                  <p className="text-xs text-text-muted truncate">{scores[i].note}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep(6)}
            className="flex-1 border border-border text-text-secondary hover:text-text-primary py-3 rounded-xl text-sm transition-colors"
          >
            ← Editar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-accent hover:bg-accent-light disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors"
          >
            {submitting ? 'Guardando...' : 'Guardar check-in'}
          </button>
        </div>
      </div>
    );
  }

  const dim = DIMENSIONS[step];
  const current = scores[step];

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex gap-1.5">
          {DIMENSIONS.map((d, i) => (
            <button
              key={d.key}
              onClick={() => setStep(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? '24px' : '8px',
                background: i <= step ? dim.color : '#2A2A2A',
              }}
            />
          ))}
        </div>
        <span className="text-xs text-text-muted ml-auto">{step + 1} de 7</span>
      </div>

      {existingWeek && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mb-4 text-xs text-accent-light">
          Actualizando el check-in de esta semana
        </div>
      )}

      {/* Dimension card */}
      <div
        className="bg-card border rounded-2xl p-6 mb-6"
        style={{ borderColor: dim.color + '40' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-3 rounded-full" style={{ background: dim.color }} />
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{dim.label}</h2>
            <p className="text-text-muted text-sm">{dim.description}</p>
          </div>
        </div>

        {/* Score slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted uppercase tracking-wider">Calificación</span>
            <span className="text-3xl font-bold" style={{ color: dim.color }}>
              {current.score}
              <span className="text-base text-text-muted font-normal">/10</span>
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="1"
              max="10"
              value={current.score}
              onChange={e => updateScore('score', parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: dim.color }}
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>1 · Muy mal</span>
              <span>10 · Excelente</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mb-4">
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            ¿Cómo estás en esta dimensión?
          </label>
          <textarea
            value={current.note}
            onChange={e => updateScore('note', e.target.value)}
            rows={2}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
            placeholder="Nota corta (opcional)..."
          />
        </div>

        {/* Action */}
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Acción concreta esta semana
          </label>
          <textarea
            value={current.action}
            onChange={e => updateScore('action', e.target.value)}
            rows={2}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
            placeholder="¿Qué vas a hacer específicamente? (opcional)..."
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="flex-1 border border-border disabled:opacity-30 text-text-secondary hover:text-text-primary py-3 rounded-xl text-sm transition-colors"
        >
          ← Anterior
        </button>
        {step < 6 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            style={{ background: dim.color }}
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={() => setStep(7)}
            className="flex-1 bg-accent hover:bg-accent-light text-white font-medium py-3 rounded-xl text-sm transition-colors"
          >
            Ver resumen
          </button>
        )}
      </div>
    </div>
  );
}
