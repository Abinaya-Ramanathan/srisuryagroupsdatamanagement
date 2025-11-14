const express = require('express');
const { getDb } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const db = getDb();

// Get advances for an employee
router.get('/employee/:employeeId', authenticate, (req, res) => {
  const { employeeId } = req.params;

  db.all(
    'SELECT * FROM advances WHERE employee_id = ? ORDER BY date DESC',
    [employeeId],
    (err, advances) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(advances);
    }
  );
});

// Add advance (User 2 can add, User 1 can also add)
router.post('/', authenticate, (req, res) => {
  const { employee_id, amount, date, type = 'taken' } = req.body;

  if (!employee_id || amount === undefined || amount === null || !date) {
    return res.status(400).json({ error: 'Employee ID, amount, and date are required' });
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  if (!['taken', 'paid'].includes(type)) {
    return res.status(400).json({ error: 'Type must be either taken or paid' });
  }

  db.run(
    'INSERT INTO advances (employee_id, amount, date, type, created_by) VALUES (?, ?, ?, ?, ?)',
    [employee_id, parsedAmount, date, type, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Advance added successfully' });
    }
  );
});

// Update advance
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { amount, date, type } = req.body;

  const updates = [];
  const params = [];

  if (amount !== undefined) {
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    updates.push('amount = ?');
    params.push(parsedAmount);
  }

  if (date) {
    updates.push('date = ?');
    params.push(date);
  }

  if (type) {
    if (!['taken', 'paid'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either taken or paid' });
    }
    updates.push('type = ?');
    params.push(type);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  params.push(id);

  const updateQuery = `UPDATE advances SET ${updates.join(', ')} WHERE id = ?`;

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Advance record not found' });
    }
    res.json({ message: 'Advance updated successfully' });
  });
});

// Delete advance (User 1 only)
router.delete('/:id', authenticate, require('../middleware/auth').requireRole(['user1']), (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM advances WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Advance record not found' });
    }
    res.json({ message: 'Advance deleted successfully' });
  });
});

module.exports = router;

