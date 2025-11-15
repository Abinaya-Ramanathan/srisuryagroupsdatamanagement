const express = require('express');
const { query } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const VALID_STATUSES = ['present', 'absent', 'half'];

// Get attendance for an employee
router.get('/employee/:employeeId', authenticate, async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    let queryText = 'SELECT * FROM attendance WHERE employee_id = $1';
    const params = [employeeId];

    if (startDate && endDate) {
      queryText += ' AND date BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    queryText += ' ORDER BY date DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark attendance (User 2 can mark, User 1 can also mark)
router.post('/', authenticate, async (req, res) => {
  const { employee_id, date, status } = req.body;

  if (!employee_id || !date || !status) {
    return res.status(400).json({ error: 'Employee ID, date, and status are required' });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be present, absent, or half' });
  }

  try {
    const result = await query(
      `INSERT INTO attendance (employee_id, date, status, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (employee_id, date)
       DO UPDATE SET status = EXCLUDED.status, created_by = EXCLUDED.created_by, created_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [employee_id, date, status, req.user.id]
    );
    res.json({ id: result.rows[0].id, message: 'Attendance marked successfully' });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update attendance
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status, date } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Valid status is required' });
  }

  try {
    let updateQuery;
    let params;

    if (date) {
      updateQuery = 'UPDATE attendance SET status = $1, date = $2 WHERE id = $3';
      params = [status, date, id];
    } else {
      updateQuery = 'UPDATE attendance SET status = $1 WHERE id = $2';
      params = [status, id];
    }

    const result = await query(updateQuery, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete attendance (User 1 only)
router.delete('/:id', authenticate, requireRole(['user1']), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM attendance WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get attendance sheet data for a sector and month
router.get('/sector/:sectorId', authenticate, async (req, res) => {
  const { sectorId } = req.params;
  const { month } = req.query; // format YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required' });
  }

  const [year, monthStr] = month.split('-');
  const monthIndex = Number(monthStr);
  if (!monthIndex || monthIndex < 1 || monthIndex > 12) {
    return res.status(400).json({ error: 'Invalid month value' });
  }

  const daysInMonth = new Date(Number(year), monthIndex, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  try {
    const sectorResult = await query('SELECT id, name FROM sectors WHERE id = $1', [sectorId]);
    const sector = sectorResult.rows[0];

    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    const employeesResult = await query(
      'SELECT id, name, phone FROM employees WHERE sector_id = $1 ORDER BY name',
      [sectorId]
    );

    const attendanceResult = await query(
      `SELECT a.employee_id, a.date, a.status
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       WHERE e.sector_id = $1 AND a.date BETWEEN $2 AND $3`,
      [sectorId, startDate, endDate]
    );

    res.json({
      sector,
      employees: employeesResult.rows,
      attendance: attendanceResult.rows,
      range: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching attendance sheet:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Bulk upsert/delete attendance entries
router.post('/bulk', authenticate, async (req, res) => {
  const { entries } = req.body;

  if (!Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ error: 'Entries array is required' });
  }

  const toInsert = [];
  const toDelete = [];

  for (const entry of entries) {
    const { employee_id, date, status } = entry;

    if (!employee_id || !date) {
      return res.status(400).json({ error: 'Each entry must include employee_id and date' });
    }

    if (status === null || status === undefined || status === '') {
      toDelete.push({ employee_id, date });
      continue;
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status value: ${status}` });
    }

    toInsert.push({ employee_id, date, status });
  }

  if (!toInsert.length && !toDelete.length) {
    return res.json({ message: 'No attendance changes detected' });
  }

  try {
    // Use a transaction for bulk operations
    await query('BEGIN');

    try {
      // Insert/update entries
      if (toInsert.length) {
        for (const { employee_id, date, status } of toInsert) {
          await query(
            `INSERT INTO attendance (employee_id, date, status, created_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (employee_id, date)
             DO UPDATE SET status = EXCLUDED.status, created_by = EXCLUDED.created_by, created_at = CURRENT_TIMESTAMP`,
            [employee_id, date, status, req.user.id]
          );
        }
      }

      // Delete entries
      if (toDelete.length) {
        for (const { employee_id, date } of toDelete) {
          await query('DELETE FROM attendance WHERE employee_id = $1 AND date = $2', [employee_id, date]);
        }
      }

      await query('COMMIT');
      res.json({ message: 'Attendance updated successfully' });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Bulk attendance update failed:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

module.exports = router;
