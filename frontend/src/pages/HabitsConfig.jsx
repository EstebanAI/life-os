import { useState, useEffect } from 'react';
import api from '../api/client';
import { DIMENSIONS } from '../constants';

function HabitItem({ habit, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(habit.name);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim() || name === habit.name) { setEditing(false); return; }
    setLoading(true);
    try {
      await onUpdate(habit.id, name.trim());
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0 group">
      <div className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          className="flex-1 bg-surface border border-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none"
        />
      ) : (
        <span className="flex-1 text-sm text-text-primary">{habit.name}</span>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <>
            <button onClick={save} disabled={loading} className="text-xs text-success px-2 py-1 hover:bg-success/10 rounded">
              {loading ? '...' : 'Guardar'}
            </button>
            <button onClick={() => { setEditing(false); setName(habit.name); }} className="text-xs text-text-muted px-2 py-1 hover:bg-surface rounded">
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="text-xs text-text-muted px-2 py-1 hover:bg-surface rounded hover:text-text-primary transition-colors">
              Editar
            </button>
            <button onClick={() => onDelete(habit.id)} className="text-xs text-danger px-2 py-1 hover:bg-danger/10 rounded transition-colors">
              Eliminar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DimensionSection({ dim, habits, onAdd, onDelete, onUpdate }) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAdd(dim.key, newName.trim());
      setNewName('');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dim.color }} />
        <h3 className="font-medium text-text-primary">{dim.label}</h3>
        <span className="text-xs text-text-muted ml-1">{dim.description}</span>
        <span className="ml-auto text-xs text-text-muted">{habits.length} hábito{habits.length !== 1 ? 's' : ''}</span>
      </div>

      {habits.length > 0 && (
        <div className="mb-4">
          {habits.map(h => (
            <HabitItem key={h.id} habit={h} onDelete={onDelete} onUpdate={onUpdate} />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder={`Agregar hábito en ${dim.label}...`}
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-colors"
          style={{ background: dim.color }}
        >
          {adding ? '...' : '+'}
        </button>
      </div>
    </div>
  );
}

export default function HabitsConfig() {
  const [habits, setHabits] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/habits');
      setHabits(res.data);
    } catch {}
    setLoading(false);
  }

  async function handleAdd(dimension, name) {
    const res = await api.post('/habits', { dimension, name });
    setHabits(prev => ({
      ...prev,
      [dimension]: [...(prev[dimension] || []), res.data],
    }));
  }

  async function handleDelete(id) {
    await api.delete(`/habits/${id}`);
    setHabits(prev => {
      const next = { ...prev };
      for (const dim of Object.keys(next)) {
        next[dim] = next[dim].filter(h => h.id !== id);
      }
      return next;
    });
  }

  async function handleUpdate(id, name) {
    const res = await api.put(`/habits/${id}`, { name });
    setHabits(prev => {
      const next = { ...prev };
      for (const dim of Object.keys(next)) {
        next[dim] = next[dim].map(h => h.id === id ? res.data : h);
      }
      return next;
    });
  }

  const totalHabits = Object.values(habits).flat().length;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Mis hábitos</h2>
        <p className="text-text-muted text-sm mt-0.5">
          Define los hábitos de cada dimensión. Su cumplimiento diario calculará tu score semanal.
        </p>
      </div>

      {totalHabits === 0 && !loading && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-sm text-accent-light">
          Agrega al menos 1 hábito por dimensión para que el check-in pueda calcular tu score automáticamente.
        </div>
      )}

      {loading ? (
        <div className="text-text-muted text-sm">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {DIMENSIONS.map(dim => (
            <DimensionSection
              key={dim.key}
              dim={dim}
              habits={habits[dim.key] || []}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
