const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../db');

router.use(auth);

const DIMENSIONS = ['cuerpo', 'mente', 'emociones', 'relaciones', 'proposito', 'finanzas', 'descanso'];

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString().split('T')[0];
}

function getPeriodStart(period) {
  const now = new Date();
  if (period === '1m') return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
  if (period === '3m') return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0];
  return '1970-01-01';
}

// GET /latest
router.get('/latest', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.id, ci.week_start, ci.created_at,
        json_agg(json_build_object('dimension', ds.dimension, 'score', ds.score, 'note', ds.note, 'action', ds.action) ORDER BY ds.dimension) as dimensions
       FROM check_ins ci
       JOIN dimension_scores ds ON ds.check_in_id = ci.id
       WHERE ci.user_id = $1
       GROUP BY ci.id, ci.week_start, ci.created_at
       ORDER BY ci.week_start DESC LIMIT 1`,
      [req.userId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /history?period=1m|3m|all
router.get('/history', async (req, res) => {
  try {
    const startDate = getPeriodStart(req.query.period || 'all');
    const result = await pool.query(
      `SELECT ci.id, ci.week_start, ci.created_at,
        json_agg(json_build_object('dimension', ds.dimension, 'score', ds.score, 'note', ds.note, 'action', ds.action) ORDER BY ds.dimension) as dimensions
       FROM check_ins ci
       JOIN dimension_scores ds ON ds.check_in_id = ci.id
       WHERE ci.user_id = $1 AND ci.week_start >= $2
       GROUP BY ci.id, ci.week_start, ci.created_at
       ORDER BY ci.week_start ASC`,
      [req.userId, startDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /calendar
router.get('/calendar', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT week_start FROM check_ins WHERE user_id = $1 ORDER BY week_start',
      [req.userId]
    );
    res.json(result.rows.map(r => r.week_start.toISOString().split('T')[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /compare?week1=YYYY-MM-DD&week2=YYYY-MM-DD
router.get('/compare', async (req, res) => {
  try {
    const { week1, week2 } = req.query;
    if (!week1 || !week2) return res.status(400).json({ error: 'Se requieren week1 y week2' });

    const fetchWeek = async (weekStart) => {
      const result = await pool.query(
        `SELECT ci.week_start, ci.created_at,
          json_agg(json_build_object('dimension', ds.dimension, 'score', ds.score, 'note', ds.note, 'action', ds.action) ORDER BY ds.dimension) as dimensions
         FROM check_ins ci
         JOIN dimension_scores ds ON ds.check_in_id = ci.id
         WHERE ci.user_id = $1 AND ci.week_start = $2
         GROUP BY ci.week_start, ci.created_at`,
        [req.userId, weekStart]
      );
      return result.rows[0] || null;
    };

    const [w1, w2] = await Promise.all([fetchWeek(week1), fetchWeek(week2)]);
    res.json({ week1: w1, week2: w2 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /weeks — list of available weeks for the compare dropdowns
router.get('/weeks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT week_start, created_at FROM check_ins WHERE user_id = $1 ORDER BY week_start DESC',
      [req.userId]
    );
    res.json(result.rows.map(r => ({
      week_start: r.week_start.toISOString().split('T')[0],
      created_at: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST / — create or update check-in for current week
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { scores } = req.body;
    if (!Array.isArray(scores) || scores.length !== 7) {
      return res.status(400).json({ error: 'Se requieren 7 dimensiones' });
    }
    for (const s of scores) {
      if (!DIMENSIONS.includes(s.dimension) || s.score < 1 || s.score > 10) {
        return res.status(400).json({ error: 'Datos de dimensión inválidos' });
      }
    }

    const weekStart = getWeekStart();
    await client.query('BEGIN');

    const upsert = await client.query(
      `INSERT INTO check_ins (user_id, week_start) VALUES ($1, $2)
       ON CONFLICT (user_id, week_start) DO NOTHING
       RETURNING id`,
      [req.userId, weekStart]
    );

    let checkInId;
    if (upsert.rows.length > 0) {
      checkInId = upsert.rows[0].id;
    } else {
      const existing = await client.query(
        'SELECT id FROM check_ins WHERE user_id = $1 AND week_start = $2',
        [req.userId, weekStart]
      );
      checkInId = existing.rows[0].id;
    }

    await client.query('DELETE FROM dimension_scores WHERE check_in_id = $1', [checkInId]);

    for (const s of scores) {
      await client.query(
        'INSERT INTO dimension_scores (check_in_id, dimension, score, note, action) VALUES ($1, $2, $3, $4, $5)',
        [checkInId, s.dimension, s.score, s.note || '', s.action || '']
      );
    }

    await client.query('COMMIT');

    const result = await pool.query(
      `SELECT ci.id, ci.week_start, ci.created_at,
        json_agg(json_build_object('dimension', ds.dimension, 'score', ds.score, 'note', ds.note, 'action', ds.action) ORDER BY ds.dimension) as dimensions
       FROM check_ins ci
       JOIN dimension_scores ds ON ds.check_in_id = ci.id
       WHERE ci.id = $1
       GROUP BY ci.id`,
      [checkInId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
