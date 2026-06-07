const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../db');

router.use(auth);

router.get('/csv', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.week_start, ci.created_at, ds.dimension, ds.score, ds.note, ds.action
       FROM check_ins ci
       JOIN dimension_scores ds ON ds.check_in_id = ci.id
       WHERE ci.user_id = $1
       ORDER BY ci.week_start DESC, ds.dimension`,
      [req.userId]
    );

    const escape = (val) => {
      if (val == null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = 'week_start,created_at,dimension,score,note,action\n';
    const rows = result.rows.map(r =>
      [
        r.week_start.toISOString().split('T')[0],
        r.created_at.toISOString(),
        r.dimension,
        r.score,
        escape(r.note),
        escape(r.action),
      ].join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="life-os-data.csv"');
    res.send(header + rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
