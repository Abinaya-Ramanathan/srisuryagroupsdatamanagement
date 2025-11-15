const express = require('express');
const { query } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get advances for an employee
router.get('/employee/:employeeId', authenticate, async (req, res) => {
  const { employeeId } = req.params;

  try {
    const result = await query(
      'SELECT * FROM advances WHERE employee_id = $1 ORDER BY date DESC',
      [employeeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching advances:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add advance (User 2 can add, User 1 can also add)
router.post('/', authenticate, async (req, res) => {
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

  try {
    const result = await query(
      'INSERT INTO advances (employee_id, amount, date, type, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [employee_id, parsedAmount, date, type, req.user.id]
    );
    res.json({ id: result.rows[0].id, message: 'Advance added successfully' });
  } catch (error) {
    console.error('Error adding advance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update advance
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { amount, date, type } = req.body;

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (amount !== undefined) {
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    updates.push(`amount = $${paramIndex++}`);
    params.push(parsedAmount);
  }

  if (date) {
    updates.push(`date = $${paramIndex++}`);
    params.push(date);
  }

  if (type) {
    if (!['taken', 'paid'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either taken or paid' });
    }
    updates.push(`type = $${paramIndex++}`);
    params.push(type);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  params.push(id);
  const updateQuery = `UPDATE advances SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

  try {
    const result = await query(updateQuery, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Advance record not found' });
    }
    res.json({ message: 'Advance updated successfully' });
  } catch (error) {
    console.error('Error updating advance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete advance (User 1 only)
router.delete('/:id', authenticate, requireRole(['user1']), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM advances WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Advance record not found' });
    }
    res.json({ message: 'Advance deleted successfully' });
  } catch (error) {
    console.error('Error deleting advance:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
