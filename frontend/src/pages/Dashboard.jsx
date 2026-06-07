import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import api from '../api/client';
import { DIMENSIONS, daysSince, formatWeekStart, getCurrentQuarter } from '../constants';

function ScoreRing({ score, color, size = 40 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 10) * circumference;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#2A2A2A" strokeWidth={3} />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

function TrendArrow({ delta }) {
  if (delta > 0) return <span className="text-success text-xs font-medium">▲ +{delta}</span>;
  if (delta < 0) return <span className="text-danger text-xs font-medium">▼ {delta}</span>;
  return <span className="text-text-muted text-xs">— igual</span>;
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
        <p className="text-text-primary font-medium">{d.label}</p>
        <p className="text-accent-light">{d.score}/10</p>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [latest, setLatest] = useState(null);
  const [prevCheckin, setPrevCheckin] = useState(null);
  const [history, setHistory] = useState([]);
  const [quarterlyAlert, setQuarterlyAlert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [latestRes, histRes] = await Promise.all([
          api.get('/checkins/latest'),
          api.get('/checkins/history?period=3m'),
        ]);
        setLatest(latestRes.data);
        const hist = histRes.data;
        setHistory(hist);
        if (hist.length >= 2) setPrevCheckin(hist[hist.length - 2]);

        // quarterly alert: if prev quarter has data but no review
        const q = getCurrentQuarter();
        const prevQ = q === 1 ? 4 : q - 1;
        const prevYear = q === 1 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        const qRes = await api.get(`/quarterly/stats?quarter=${prevQ}&year=${prevYear}`);
        if (qRes.data.previous.stats.length > 0 && !qRes.data.savedGoals) {
          setQuarterlyAlert(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">Cargando...</div>
      </div>
    );
  }

  const scoreMap = {};
  if (latest?.dimensions) {
    latest.dimensions.forEach(d => { scoreMap[d.dimension] = d.score; });
  }

  const prevScoreMap = {};
  if (prevCheckin?.dimensions) {
    prevCheckin.dimensions.forEach(d => { prevScoreMap[d.dimension] = d.score; });
  }

  const radarData = DIMENSIONS.map(d => ({
    label: d.label,
    score: scoreMap[d.key] || 0,
    fullMark: 10,
  }));

  const lowestDim = latest
    ? DIMENSIONS.reduce((acc, d) => {
        const s = scoreMap[d.key] || 0;
        return s < (scoreMap[acc?.key] || 11) ? d : acc;
      }, DIMENSIONS[0])
    : null;

  const daysSinceCheckin = latest ? daysSince(latest.created_at) : null;
  const showCheckinAlert = !latest || daysSinceCheckin > 7;

  if (!latest) {
    return (
      <div className="animate-fade-in">
        <div className="text-center py-20">
          <div className="text-6xl mb-6">◈</div>
          <h2 className="text-2xl font-semibold text-text-primary mb-3">Bienvenido a Life OS</h2>
          <p className="text-text-secondary mb-8 max-w-sm mx-auto">
            Empieza registrando cómo estás en las 7 dimensiones de tu vida.
          </p>
          <button
            onClick={() => navigate('/checkin')}
            className="bg-accent hover:bg-accent-light text-white px-8 py-3 rounded-xl font-medium transition-colors"
          >
            Hacer mi primer check-in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Alerts */}
      {showCheckinAlert && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-warning text-lg">⚠</span>
            <p className="text-sm text-text-primary">
              {!latest ? 'Aún no tienes check-ins.' : `Han pasado ${daysSinceCheckin} días sin check-in.`}
              {' '}Es momento de registrar cómo estás.
            </p>
          </div>
          <button
            onClick={() => navigate('/checkin')}
            className="text-warning text-sm font-medium hover:underline shrink-0 ml-4"
          >
            Hacer check-in →
          </button>
        </div>
      )}

      {quarterlyAlert && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-accent-light text-lg">◉</span>
            <p className="text-sm text-text-primary">
              Es momento de tu <strong className="text-accent-light">Revisión Trimestral</strong>. Reflexiona sobre el trimestre anterior.
            </p>
          </div>
          <Link to="/quarterly" className="text-accent-light text-sm font-medium hover:underline shrink-0 ml-4">
            Revisar →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Dashboard</h2>
          <p className="text-text-muted text-sm mt-0.5">
            Último check-in: {formatWeekStart(latest.week_start)}
          </p>
        </div>
        <button
          onClick={() => navigate('/checkin')}
          className="bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {daysSinceCheckin === 0 ? 'Actualizar check-in' : 'Nuevo check-in'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 glow-card">
          <h3 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">Estado actual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
              <PolarGrid stroke="#2A2A2A" />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fill: '#A0A0A0', fontSize: 11, fontFamily: 'sans-serif' }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#606060', fontSize: 9 }} tickCount={6} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#7C3AED"
                fill="#7C3AED"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Lowest dimension alert */}
        <div className="space-y-4">
          {lowestDim && (
            <div
              className="bg-card border rounded-2xl p-5 pulse-border"
              style={{ borderColor: lowestDim.color + '55' }}
            >
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Necesita más atención</p>
              <div className="flex items-center gap-4">
                <ScoreRing score={scoreMap[lowestDim.key] || 0} color={lowestDim.color} size={56} />
                <div>
                  <h3 className="text-xl font-semibold" style={{ color: lowestDim.color }}>
                    {lowestDim.label}
                  </h3>
                  <p className="text-text-muted text-sm">{lowestDim.description}</p>
                  <p className="text-3xl font-bold text-text-primary mt-1">
                    {scoreMap[lowestDim.key] || 0}
                    <span className="text-base text-text-muted font-normal">/10</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent check-ins */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">Últimos check-ins</h3>
            <div className="space-y-2">
              {history.slice(-4).reverse().map((ci, i) => {
                const avg = ci.dimensions.reduce((s, d) => s + d.score, 0) / ci.dimensions.length;
                return (
                  <div key={ci.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-text-secondary">{formatWeekStart(ci.week_start)}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${avg * 10}%`, background: 'var(--accent)' }}
                        />
                      </div>
                      <span className="text-sm font-medium text-text-primary w-6 text-right">
                        {avg.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dimension cards */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Dimensiones</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {DIMENSIONS.map(dim => {
            const score = scoreMap[dim.key] || 0;
            const prevScore = prevScoreMap[dim.key];
            const delta = prevScore != null ? score - prevScore : null;
            return (
              <div
                key={dim.key}
                className="bg-card border border-border rounded-xl p-4 hover:border-text-muted transition-colors"
                style={{ borderLeftColor: dim.color, borderLeftWidth: 3 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-text-muted uppercase tracking-wider">{dim.label}</p>
                  {delta !== null && <TrendArrow delta={delta} />}
                </div>
                <div className="flex items-end gap-2">
                  <ScoreRing score={score} color={dim.color} size={36} />
                  <span className="text-3xl font-bold text-text-primary">{score}</span>
                  <span className="text-text-muted text-sm mb-0.5">/10</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
