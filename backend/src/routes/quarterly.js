const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../db');

router.use(auth);

function getQuarterRange(quarter, year) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1).toISOString().split('T')[0];
  const end = new Date(year, startMonth + 3, 0).toISOString().split('T')[0];
  return { start, end };
}

function getPreviousQuarter(quarter, year) {
  if (quarter === 1) return { quarter: 4, year: year - 1 };
  return { quarter: quarter - 1, year };
}

// GET /stats?quarter=N&year=YYYY
router.get('/stats', async (req, res) => {
  try {
    const quarter = parseInt(req.query.quarter) || Math.ceil((new Date().getMonth() + 1) / 3);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const currRange = getQuarterRange(quarter, year);
    const prev = getPreviousQuarter(quarter, year);
    const prevRange = getQuarterRange(prev.quarter, prev.year);

    const getStats = async (range) => {
      const result = await pool.query(
        `SELECT ds.dimension,
          AVG(ds.score)::NUMERIC(10,2) as avg_score,
          COUNT(ds.id) as count,
          array_agg(ds.note) FILTER (WHERE ds.note != '') as notes,
          array_agg(ds.action) FILTER (WHERE ds.action != '') as actions
         FROM check_ins ci
         JOIN dimension_scores ds ON ds.check_in_id = ci.id
         WHERE ci.user_id = $1 AND ci.week_start >= $2 AND ci.week_start <= $3
         GROUP BY ds.dimension ORDER BY ds.dimension`,
        [req.userId, range.start, range.end]
      );
      return result.rows;
    };

    const [currentStats, prevStats] = await Promise.all([
      getStats(currRange),
      getStats(prevRange),
    ]);

    const goal = await pool.query(
      'SELECT * FROM quarterly_goals WHERE user_id = $1 AND quarter = $2 AND year = $3',
      [req.userId, quarter, year]
    );

    res.json({
      quarter, year,
      current: { range: currRange, stats: currentStats },
      previous: { quarter: prev.quarter, year: prev.year, range: prevRange, stats: prevStats },
      savedGoals: goal.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET / — historial de revisiones
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quarterly_goals WHERE user_id = $1 ORDER BY year DESC, quarter DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST / — guardar revisión
router.post('/', async (req, res) => {
  try {
    const { quarter, year, goals, observations } = req.body;
    if (!quarter || !year || !Array.isArray(goals)) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    if (goals.length > 3) return res.status(400).json({ error: 'Máximo 3 objetivos' });

    const result = await pool.query(
      `INSERT INTO quarterly_goals (user_id, quarter, year, goals, observations)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, quarter, year)
       DO UPDATE SET goals = $4, observations = $5
       RETURNING *`,
      [req.userId, quarter, year, JSON.stringify(goals), observations || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
