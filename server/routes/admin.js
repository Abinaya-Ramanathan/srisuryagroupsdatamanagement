const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getDb();

// Get all tables
router.get('/tables', authenticate, requireRole(['user1']), (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch tables', details: err.message });
    }
    res.json({ tables: tables.map(t => t.name) });
  });
});

// Get table data
router.get('/tables/:tableName', authenticate, requireRole(['user1']), (req, res) => {
  const { tableName } = req.params;
  
  // Security: Only allow valid table names (prevent SQL injection)
  const validTables = ['users', 'sectors', 'employees', 'attendance', 'advances', 'daily_employee_counts'];
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  db.all(`SELECT * FROM ${tableName} ORDER BY id DESC`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch table data', details: err.message });
    }
    res.json({ table: tableName, data: rows, count: rows.length });
  });
});

// Delete entry from table
router.delete('/tables/:tableName/:id', authenticate, requireRole(['user1']), (req, res) => {
  const { tableName, id } = req.params;
  
  // Security: Only allow valid table names
  const validTables = ['users', 'sectors', 'employees', 'attendance', 'advances', 'daily_employee_counts'];
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  // Prevent deletion of default admin user
  if (tableName === 'users') {
    db.get('SELECT user_id FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to check user', details: err.message });
      }
      if (user && user.user_id === 'admin') {
        return res.status(403).json({ error: 'Cannot delete default admin user' });
      }
      performDelete();
    });
  } else {
    performDelete();
  }

  function performDelete() {
    db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete entry', details: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      res.json({ success: true, message: `Deleted entry ${id} from ${tableName}`, changes: this.changes });
    });
  }
});

// Clear all data from a table
router.delete('/tables/:tableName/clear', authenticate, requireRole(['user1']), (req, res) => {
  const { tableName } = req.params;
  
  // Security: Only allow valid table names
  const validTables = ['attendance', 'advances', 'daily_employee_counts'];
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ error: 'Cannot clear this table. Allowed tables: attendance, advances, daily_employee_counts' });
  }

  db.run(`DELETE FROM ${tableName}`, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to clear table', details: err.message });
    }
    res.json({ success: true, message: `Cleared all data from ${tableName}`, changes: this.changes });
  });
});

// Get database stats
router.get('/stats', authenticate, requireRole(['user1']), (req, res) => {
  const stats = {};
  const tables = ['users', 'sectors', 'employees', 'attendance', 'advances', 'daily_employee_counts'];
  let completed = 0;

  tables.forEach(tableName => {
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
      if (!err && row) {
        stats[tableName] = row.count;
      }
      completed++;
      if (completed === tables.length) {
        res.json({ stats });
      }
    });
  });
});

module.exports = router;

