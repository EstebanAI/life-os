export const DIMENSIONS = [
  { key: 'cuerpo',     label: 'Cuerpo',     color: '#EF4444', description: 'Entrenamiento, sueño y nutrición' },
  { key: 'mente',      label: 'Mente',       color: '#3B82F6', description: 'Aprendizaje y enfoque' },
  { key: 'emociones',  label: 'Emociones',   color: '#F59E0B', description: 'Estrés y autoconocimiento' },
  { key: 'relaciones', label: 'Relaciones',  color: '#EC4899', description: 'Conexiones y vínculos' },
  { key: 'proposito',  label: 'Propósito',   color: '#8B5CF6', description: 'Carrera y misión' },
  { key: 'finanzas',   label: 'Finanzas',    color: '#10B981', description: 'Dinero y abundancia' },
  { key: 'descanso',   label: 'Descanso',    color: '#14B8A6', description: 'Juego y regeneración' },
];

export const QUARTER_NAMES = { 1: 'Q1 (Ene–Mar)', 2: 'Q2 (Abr–Jun)', 3: 'Q3 (Jul–Sep)', 4: 'Q4 (Oct–Dic)' };

export function getCurrentQuarter() {
  const month = new Date().getMonth();
  return Math.floor(month / 3) + 1;
}

export function formatWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getDimByKey(key) {
  return DIMENSIONS.find(d => d.key === key);
}
