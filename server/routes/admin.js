const express = require('express');
const { query } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all tables
router.get('/tables', authenticate, requireRole(['user1']), async (req, res) => {
  try {
    const result = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    res.json({ tables: result.rows.map(t => t.table_name) });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables', details: error.message });
  }
});

// Get table data
router.get('/tables/:tableName', authenticate, requireRole(['user1']), async (req, res) => {
  const { tableName } = req.params;
  
  // Security: Only allow valid table names (prevent SQL injection)
  const validTables = ['users', 'sectors', 'employees', 'attendance', 'advances', 'daily_employee_counts'];
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  try {
    const result = await query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
    res.json({ table: tableName, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ error: 'Failed to fetch table data', details: error.message });
  }
});

// Delete entry from table
router.delete('/tables/:tableName/:id', authenticate, requireRole(['user1']), async (req, res) => {
  const { tableName, id } = req.params;
  
  // Security: Only allow valid table names
  const validTables = ['users', 'sectors', 'employees', 'attendance', 'advances', 'daily_employee_counts'];
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  try {
    // Prevent deletion of default admin user
    if (tableName === 'users') {
      const userResult = await query('SELECT user_id FROM users WHERE id = $1', [id]);
      const user = userResult.rows[0];
      if (user && user.user_id === 'admin') {
        return res.status(403).json({ error: 'Cannot delete default admin user' });
      }
    }

    const result = await query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ success: true, message: `Deleted entry ${id} from ${tableName}`, changes: result.rowCount });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry', details: error.message });
  }
});

// Clear all data from a table
router.delete('/tables/:tableName/clear', authenticate, requireRole(['user1']), async (req, res) => {
  const { tableName } = req.params;
  
  // Security: Only allow valid table names
  const validTables = ['attendance', 'advances', 'daily_employee_counts'];
  if (!validTables.includes(tableName)) {
    return res.status(400).json({ error: 'Cannot clear this table. Allowed tables: attendance, advances, daily_employee_counts' });
  }

  try {
    const result = await query(`DELETE FROM ${tableName}`);
    res.json({ success: true, message: `Cleared all data from ${tableName}`, changes: result.rowCount });
  } catch (error) {
    console.error('Error clearing table:', error);
    res.status(500).json({ error: 'Failed to clear table', details: error.message });
  }
});

// Get database stats
router.get('/stats', authenticate, requireRole(['user1']), async (req, res) => {
  try {
    const tables = ['users', 'sectors', 'employees', 'attendance', 'advances', 'daily_employee_counts'];
    const stats = {};

    for (const tableName of tables) {
      const result = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
      stats[tableName] = parseInt(result.rows[0].count);
    }

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

module.exports = router;
