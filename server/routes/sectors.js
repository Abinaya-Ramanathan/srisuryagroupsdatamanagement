const express = require('express');
const { getDb } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const db = getDb();

router.get('/', authenticate, (req, res) => {
  db.all('SELECT * FROM sectors ORDER BY name', (err, sectors) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(sectors);
  });
});

module.exports = router;

