import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { DIMENSIONS } from '../constants';

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Today() {
  const [date] = useState(today());
  const [habitData, setHabitData] = useState({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/habits/logs?date=${date}`);
      setHabitData(res.data.habits);
    } catch {}
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function toggle(habit) {
    if (toggling.has(habit.id)) return;
    setToggling(prev => new Set([...prev, habit.id]));

    // Optimistic update
    setHabitData(prev => {
      const next = { ...prev };
      for (const dim of Object.keys(next)) {
        next[dim] = next[dim].map(h =>
          h.id === habit.id ? { ...h, completed: !h.completed } : h
        );
      }
      return next;
    });

    try {
      await api.post('/habits/logs', { habit_id: habit.id, date, completed: !habit.completed });
    } catch {
      // Revert on error
      setHabitData(prev => {
        const next = { ...prev };
        for (const dim of Object.keys(next)) {
          next[dim] = next[dim].map(h =>
            h.id === habit.id ? { ...h, completed: habit.completed } : h
          );
        }
        return next;
      });
    } finally {
      setToggling(prev => { const next = new Set(prev); next.delete(habit.id); return next; });
    }
  }

  const totalHabits = Object.values(habitData).flat().length;
  const completedHabits = Object.values(habitData).flat().filter(h => h.completed).length;
  const overallPct = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">Cargando...</div>
      </div>
    );
  }

  if (totalHabits === 0) {
    return (
      <div className="animate-fade-in text-center py-20 max-w-sm mx-auto">
        <div className="text-5xl mb-5">≡</div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Aún no tienes hábitos</h2>
        <p className="text-text-muted text-sm mb-6">
          Define tus hábitos por dimensión para empezar a trackear tu progreso diario.
        </p>
        <Link
          to="/habits-config"
          className="bg-accent hover:bg-accent-light text-white px-6 py-3 rounded-xl font-medium transition-colors inline-block"
        >
          Configurar hábitos
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary capitalize">{formatDate(date)}</h2>
          <p className="text-text-muted text-sm mt-0.5">Marca los hábitos que completaste hoy</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-text-primary">{completedHabits}<span className="text-text-muted text-base font-normal">/{totalHabits}</span></p>
          <p className="text-xs text-text-muted">{overallPct}% completado</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${overallPct}%`, background: overallPct === 100 ? '#10B981' : '#7C3AED' }}
        />
      </div>

      {/* Dimension sections */}
      <div className="space-y-4">
        {DIMENSIONS.map(dim => {
          const dimHabits = habitData[dim.key] || [];
          if (dimHabits.length === 0) return null;
          const done = dimHabits.filter(h => h.completed).length;
          const pct = Math.round((done / dimHabits.length) * 100);

          return (
            <div key={dim.key} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: dim.color }} />
                  <span className="font-medium text-text-primary">{dim.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-20 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, background: dim.color }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-10 text-right">{done}/{dimHabits.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                {dimHabits.map(habit => (
                  <button
                    key={habit.id}
                    onClick={() => toggle(habit)}
                    disabled={toggling.has(habit.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      habit.completed
                        ? 'bg-surface/80'
                        : 'bg-surface hover:bg-card-hover'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        habit.completed ? 'border-transparent' : 'border-border'
                      }`}
                      style={habit.completed ? { background: dim.color } : {}}
                    >
                      {habit.completed && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm transition-colors ${
                        habit.completed ? 'text-text-muted line-through' : 'text-text-primary'
                      }`}
                    >
                      {habit.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {overallPct === 100 && (
        <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-center">
          <p className="text-success font-medium text-sm">¡Día completado! Todos los hábitos cumplidos.</p>
        </div>
      )}
    </div>
  );
}
