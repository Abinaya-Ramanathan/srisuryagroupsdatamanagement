const express = require('express');
const { query } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM sectors ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
