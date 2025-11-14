const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getDb();
const VALID_STATUSES = ['present', 'absent', 'half'];

// Get attendance for an employee
router.get('/employee/:employeeId', authenticate, (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;

  let query = 'SELECT * FROM attendance WHERE employee_id = ?';
  const params = [employeeId];

  if (startDate && endDate) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  query += ' ORDER BY date DESC';

  db.all(query, params, (err, attendance) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(attendance);
  });
});

// Mark attendance (User 2 can mark, User 1 can also mark)
router.post('/', authenticate, (req, res) => {
  const { employee_id, date, status } = req.body;

  if (!employee_id || !date || !status) {
    return res.status(400).json({ error: 'Employee ID, date, and status are required' });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be present, absent, or half' });
  }

  db.run(
    `INSERT OR REPLACE INTO attendance (employee_id, date, status, created_by)
     VALUES (?, ?, ?, ?)`,
    [employee_id, date, status, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Attendance marked successfully' });
    }
  );
});

// Update attendance
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { status, date } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Valid status is required' });
  }

  const updateQuery = date 
    ? 'UPDATE attendance SET status = ?, date = ? WHERE id = ?'
    : 'UPDATE attendance SET status = ? WHERE id = ?';
  
  const params = date ? [status, date, id] : [status, id];

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance updated successfully' });
  });
});

// Delete attendance (User 1 only)
router.delete('/:id', authenticate, requireRole(['user1']), (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM attendance WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance deleted successfully' });
  });
});

// Get attendance sheet data for a sector and month
router.get('/sector/:sectorId', authenticate, (req, res) => {
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

  db.get('SELECT id, name FROM sectors WHERE id = ?', [sectorId], (sectorErr, sector) => {
    if (sectorErr) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!sector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    db.all('SELECT id, name, phone FROM employees WHERE sector_id = ? ORDER BY name', [sectorId], (empErr, employees) => {
      if (empErr) {
        return res.status(500).json({ error: 'Database error' });
      }

      db.all(
        `SELECT a.employee_id, a.date, a.status
         FROM attendance a
         JOIN employees e ON e.id = a.employee_id
         WHERE e.sector_id = ? AND a.date BETWEEN ? AND ?`,
        [sectorId, startDate, endDate],
        (attErr, attendance) => {
          if (attErr) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            sector,
            employees,
            attendance,
            range: { startDate, endDate }
          });
        }
      );
    });
  });
});

// Bulk upsert/delete attendance entries
router.post('/bulk', authenticate, (req, res) => {
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

  db.serialize(() => {
    const tasks = [];

    if (toInsert.length) {
      const insertStmt = db.prepare(`
        INSERT INTO attendance (employee_id, date, status, created_by)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(employee_id, date)
        DO UPDATE SET status = excluded.status, created_by = excluded.created_by, created_at = CURRENT_TIMESTAMP
      `);

      toInsert.forEach(({ employee_id, date, status }) => {
        tasks.push(new Promise((resolve, reject) => {
          insertStmt.run([employee_id, date, status, req.user.id], function(err) {
            if (err) return reject(err);
            resolve();
          });
        }));
      });

      tasks.push(new Promise((resolve, reject) => insertStmt.finalize((err) => err ? reject(err) : resolve())));
    }

    if (toDelete.length) {
      const deleteStmt = db.prepare('DELETE FROM attendance WHERE employee_id = ? AND date = ?');
      toDelete.forEach(({ employee_id, date }) => {
        tasks.push(new Promise((resolve, reject) => {
          deleteStmt.run([employee_id, date], function(err) {
            if (err) return reject(err);
            resolve();
          });
        }));
      });

      tasks.push(new Promise((resolve, reject) => deleteStmt.finalize((err) => err ? reject(err) : resolve())));
    }

    Promise.all(tasks)
      .then(() => res.json({ message: 'Attendance updated successfully' }))
      .catch((error) => {
        console.error('Bulk attendance update failed', error);
        res.status(500).json({ error: 'Failed to update attendance' });
      });
  });
});

module.exports = router;

