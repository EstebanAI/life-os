const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../db');

router.use(auth);

const DIMENSIONS = ['cuerpo', 'mente', 'emociones', 'relaciones', 'proposito', 'finanzas', 'descanso'];

// GET / — list all active habits grouped by dimension
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habits WHERE user_id = $1 AND active = true ORDER BY dimension, created_at',
      [req.userId]
    );
    const grouped = {};
    DIMENSIONS.forEach(d => { grouped[d] = []; });
    result.rows.forEach(h => {
      if (grouped[h.dimension]) grouped[h.dimension].push(h);
    });
    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST / — create habit
router.post('/', async (req, res) => {
  try {
    const { dimension, name } = req.body;
    if (!dimension || !name?.trim()) return res.status(400).json({ error: 'Dimensión y nombre requeridos' });
    if (!DIMENSIONS.includes(dimension)) return res.status(400).json({ error: 'Dimensión inválida' });

    const result = await pool.query(
      'INSERT INTO habits (user_id, dimension, name) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, dimension, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /:id — update name
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

    const result = await pool.query(
      'UPDATE habits SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hábito no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /:id — soft delete
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE habits SET active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hábito no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /logs?date=YYYY-MM-DD — habits with completion status for a date
router.get('/logs', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT h.id, h.dimension, h.name,
        COALESCE(hl.completed, false) as completed
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.log_date = $2
       WHERE h.user_id = $1 AND h.active = true
       ORDER BY h.dimension, h.created_at`,
      [req.userId, date]
    );
    const grouped = {};
    DIMENSIONS.forEach(d => { grouped[d] = []; });
    result.rows.forEach(h => {
      if (grouped[h.dimension]) grouped[h.dimension].push(h);
    });
    res.json({ date, habits: grouped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /logs — toggle habit completion for a date
router.post('/logs', async (req, res) => {
  try {
    const { habit_id, date, completed } = req.body;
    if (!habit_id || !date) return res.status(400).json({ error: 'habit_id y date requeridos' });

    // Verify habit belongs to user
    const habitCheck = await pool.query(
      'SELECT id FROM habits WHERE id = $1 AND user_id = $2 AND active = true',
      [habit_id, req.userId]
    );
    if (habitCheck.rows.length === 0) return res.status(404).json({ error: 'Hábito no encontrado' });

    await pool.query(
      `INSERT INTO habit_logs (habit_id, user_id, log_date, completed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (habit_id, log_date)
       DO UPDATE SET completed = $4`,
      [habit_id, req.userId, date, completed ?? true]
    );
    res.json({ ok: true, habit_id, date, completed: completed ?? true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /week-scores?week_start=YYYY-MM-DD — calculated scores per dimension
router.get('/week-scores', async (req, res) => {
  try {
    const weekStart = req.query.week_start || getWeekStart();
    const weekEnd = addDays(weekStart, 6);

    const result = await pool.query(
      `SELECT h.dimension, h.id as habit_id,
        COUNT(hl.id) FILTER (WHERE hl.completed = true) as days_completed
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id
         AND hl.log_date >= $2 AND hl.log_date <= $3
       WHERE h.user_id = $1 AND h.active = true
       GROUP BY h.dimension, h.id
       ORDER BY h.dimension`,
      [req.userId, weekStart, weekEnd]
    );

    // Group by dimension and calculate score
    const byDimension = {};
    result.rows.forEach(row => {
      if (!byDimension[row.dimension]) byDimension[row.dimension] = [];
      byDimension[row.dimension].push({
        habit_id: row.habit_id,
        days_completed: parseInt(row.days_completed),
      });
    });

    const scores = {};
    for (const [dim, habits] of Object.entries(byDimension)) {
      if (habits.length === 0) continue;
      const avgRate = habits.reduce((sum, h) => sum + h.days_completed / 7, 0) / habits.length;
      const score = Math.min(10, Math.max(1, Math.round(avgRate * 10)));
      const totalDaysCompleted = habits.reduce((s, h) => s + h.days_completed, 0);
      const totalPossible = habits.length * 7;
      scores[dim] = { score, habits_count: habits.length, days_completed: totalDaysCompleted, total_possible: totalPossible };
    }

    res.json(scores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

module.exports = router;
