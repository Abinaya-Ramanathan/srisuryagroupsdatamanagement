const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getDb();

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];
const VALID_SALARY_PAYMENT_STATUS = ['provided', 'not_provided'];

const toDateString = (date) => {
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60000);
  return localDate.toISOString().split('T')[0];
};

// Get all employees for a sector
router.get('/sector/:sectorId', authenticate, (req, res) => {
  const { sectorId } = req.params;
  const { month, date: selectedDateParam } = req.query;

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM' });
  }

  if (selectedDateParam && Number.isNaN(Date.parse(selectedDateParam))) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
  }

  let referenceDate = new Date();
  if (selectedDateParam) {
    referenceDate = new Date(selectedDateParam);
  }

  const weeklyEndDate = new Date(referenceDate);
  const weeklyStartDate = new Date(referenceDate);
  weeklyStartDate.setDate(weeklyStartDate.getDate() - 6);

  let monthlyStartDate;
  let monthlyEndDate;

  if (month) {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return res.status(400).json({ error: 'Invalid month value' });
    }

    monthlyStartDate = new Date(year, monthIndex, 1);
    monthlyEndDate = new Date(year, monthIndex + 1, 0);
  } else {
    monthlyStartDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    monthlyEndDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  }

  const weeklyStartStr = toDateString(weeklyStartDate);
  const weeklyEndStr = toDateString(weeklyEndDate);
  const monthlyStartStr = toDateString(monthlyStartDate);
  const monthlyEndStr = toDateString(monthlyEndDate);

  db.all(
    `SELECT e.*, 
     (SELECT COALESCE(SUM(CASE WHEN status = 'present' THEN 1 WHEN status = 'half' THEN 0.5 ELSE 0 END), 0)
        FROM attendance WHERE employee_id = e.id AND date BETWEEN ? AND ?) as weekly_present,
     (SELECT COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 WHEN status = 'half' THEN 0.5 ELSE 0 END), 0)
        FROM attendance WHERE employee_id = e.id AND date BETWEEN ? AND ?) as weekly_absent,
     (SELECT COALESCE(SUM(CASE WHEN status = 'present' THEN 1 WHEN status = 'half' THEN 0.5 ELSE 0 END), 0)
        FROM attendance WHERE employee_id = e.id AND date BETWEEN ? AND ?) as monthly_present,
     (SELECT COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 WHEN status = 'half' THEN 0.5 ELSE 0 END), 0)
        FROM attendance WHERE employee_id = e.id AND date BETWEEN ? AND ?) as monthly_absent,
     (SELECT COALESCE(SUM(amount), 0) FROM advances WHERE employee_id = e.id AND type = 'taken') as total_advance_taken,
     (SELECT COALESCE(SUM(amount), 0) FROM advances WHERE employee_id = e.id AND type = 'paid') as total_advance_paid,
     (SELECT COALESCE(SUM(CASE WHEN type = 'taken' THEN amount WHEN type = 'paid' THEN -amount END), 0) FROM advances WHERE employee_id = e.id) as total_advance_due,
     (SELECT COALESCE(SUM(amount), 0) FROM advances WHERE employee_id = e.id AND type = 'taken' AND date BETWEEN ? AND ?) as monthly_advance_taken,
     (SELECT COALESCE(SUM(amount), 0) FROM advances WHERE employee_id = e.id AND type = 'paid' AND date BETWEEN ? AND ?) as monthly_advance_paid,
     (SELECT COALESCE(SUM(CASE WHEN type = 'taken' THEN amount WHEN type = 'paid' THEN -amount END), 0) FROM advances WHERE employee_id = e.id AND date BETWEEN ? AND ?) as monthly_advance_due
     FROM employees e WHERE e.sector_id = ? AND (e.employee_type = 'worker' OR e.employee_type IS NULL) ORDER BY e.name`,
    [
      weeklyStartStr, weeklyEndStr,
      weeklyStartStr, weeklyEndStr,
      monthlyStartStr, monthlyEndStr,
      monthlyStartStr, monthlyEndStr,
      monthlyStartStr, monthlyEndStr,
      monthlyStartStr, monthlyEndStr,
      monthlyStartStr, monthlyEndStr,
      sectorId
    ],
    (err, employees) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(employees);
    }
  );
});

// Get all non-workers for a sector
router.get('/sector/:sectorId/non-workers', authenticate, (req, res) => {
  const { sectorId } = req.params;
  
  db.all(
    `SELECT e.*, 
     (SELECT COALESCE(SUM(amount), 0) FROM advances WHERE employee_id = e.id AND type = 'taken') as total_advance_taken,
     (SELECT COALESCE(SUM(amount), 0) FROM advances WHERE employee_id = e.id AND type = 'paid') as total_advance_paid,
     (SELECT COALESCE(SUM(CASE WHEN type = 'taken' THEN amount WHEN type = 'paid' THEN -amount END), 0) FROM advances WHERE employee_id = e.id) as total_advance_due
     FROM employees e WHERE e.sector_id = ? AND e.employee_type = 'non_worker' ORDER BY e.name`,
    [sectorId],
    (err, employees) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(employees);
    }
  );
});

// Get single employee
router.get('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM employees WHERE id = ?', [id], (err, employee) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  });
});

// Create employee (User 1 only)
router.post('/', authenticate, requireRole(['user1']), (req, res) => {
  const {
    sector_id, name, phone, address, bank_account, bank_ifsc, bank_name,
    monthly_wage, weekly_wage, salary, salary_frequency, employee_type, employee_count, designation
  } = req.body;

  if (!sector_id || !name) {
    return res.status(400).json({ error: 'Sector ID and name are required' });
  }

  if (salary_frequency && !VALID_FREQUENCIES.includes(salary_frequency)) {
    return res.status(400).json({ error: 'Salaried status must be daily, weekly, or monthly' });
  }

  const parseAmount = (value, label) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`${label} must be a number`);
    }
    return parsed;
  };

  let parsedMonthly;
  let parsedWeekly;
  let parsedSalary;

  try {
    parsedMonthly = parseAmount(monthly_wage, 'Monthly salary amount');
    parsedWeekly = parseAmount(weekly_wage, 'Weekly salary amount');
    parsedSalary = parseAmount(salary, 'Daily salary amount');
  } catch (parseError) {
    return res.status(400).json({ error: parseError.message });
  }

  const salaryFrequency = salary_frequency || null;
  const empType = employee_type || 'worker';
  const empCount = employee_count ? Number(employee_count) : 1;
  const empDesignation = designation || null;

  if (empType !== 'worker' && empType !== 'non_worker') {
    return res.status(400).json({ error: 'Employee type must be worker or non_worker' });
  }

  // Only validate designation if it's provided
  if (empDesignation && !['employee', 'contract_employee', 'product'].includes(empDesignation)) {
    return res.status(400).json({ error: 'Designation must be employee, contract_employee, or product' });
  }

  // Only validate salary_frequency if it's provided
  if (salaryFrequency && !VALID_FREQUENCIES.includes(salaryFrequency)) {
    return res.status(400).json({ error: 'Salaried status must be daily, weekly, or monthly' });
  }

  if (Number.isNaN(empCount) || empCount < 1) {
    return res.status(400).json({ error: 'Employee count must be a positive number' });
  }

  db.run(
    `INSERT INTO employees (sector_id, name, phone, address, bank_account, bank_ifsc, bank_name, monthly_wage, weekly_wage, salary, salary_frequency, salary_payment_status, salary_payment_amount, employee_type, employee_count, designation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sector_id,
      name,
      phone || null,
      address || null,
      bank_account || null,
      bank_ifsc || null,
      bank_name || null,
      parsedMonthly,
      parsedWeekly,
      parsedSalary,
      salaryFrequency,
      'not_provided',
      null,
      empType,
      empCount,
      empDesignation
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, message: 'Employee created successfully' });
    }
  );
});

// Update employee (User 1 only)
router.put('/:id', authenticate, requireRole(['user1']), (req, res) => {
  const { id } = req.params;
  const allowedNumericFields = new Set(['monthly_wage', 'weekly_wage', 'salary', 'salary_payment_amount']);
  const updates = [];
  const params = [];

  try {
    Object.entries(req.body).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      if (key === 'salary_frequency') {
        if (!VALID_FREQUENCIES.includes(value)) {
          throw new Error('Salaried status must be daily, weekly, or monthly');
        }
        updates.push('salary_frequency = ?');
        params.push(value);
        return;
      }

      if (key === 'salary_payment_status') {
        if (!VALID_SALARY_PAYMENT_STATUS.includes(value)) {
          throw new Error('Salary status must be provided or not_provided');
        }
        updates.push('salary_payment_status = ?');
        params.push(value);
        return;
      }

      if (key === 'salary_payment_date') {
        if (value === null || value === '') {
          updates.push('salary_payment_date = NULL');
        } else {
          updates.push('salary_payment_date = ?');
          params.push(value);
        }
        return;
      }

      if (key === 'employee_type') {
        if (!['worker', 'non_worker'].includes(value)) {
          throw new Error('Employee type must be worker or non_worker');
        }
        updates.push('employee_type = ?');
        params.push(value);
        return;
      }

      if (key === 'designation') {
        // Allow null or empty string, or validate if provided
        if (value !== null && value !== '' && !['employee', 'contract_employee', 'product'].includes(value)) {
          throw new Error('Designation must be employee, contract_employee, or product');
        }
        updates.push('designation = ?');
        params.push(value || null);
        return;
      }

      if (key === 'employee_count') {
        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed < 1) {
          throw new Error('Employee count must be a positive number');
        }
        updates.push('employee_count = ?');
        params.push(parsed);
        return;
      }

      if (key === 'reason') {
        updates.push('reason = ?');
        params.push(value || null);
        return;
      }

      if (allowedNumericFields.has(key)) {
        if (value === null || value === '') {
          updates.push(`${key} = NULL`);
        } else {
          const parsed = Number(value);
          if (Number.isNaN(parsed)) {
            throw new Error(`${key.replace(/_/g, ' ')} must be a number`);
          }
          updates.push(`${key} = ?`);
          params.push(parsed);
        }
        return;
      }

      switch (key) {
        case 'name':
        case 'phone':
        case 'address':
        case 'bank_account':
        case 'bank_ifsc':
        case 'bank_name':
          updates.push(`${key} = ?`);
          params.push(value || null);
          break;
        default:
          break;
      }
    });
  } catch (validationError) {
    return res.status(400).json({ error: validationError.message });
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  params.push(id);

  db.run(
    `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json({ message: 'Employee updated successfully' });
    }
  );
});

// Update daily employee_count for non-workers (User 2 allowed)
router.put('/:id/daily-count', authenticate, (req, res) => {
  const { id } = req.params;
  const { employee_count, date } = req.body;

  if (employee_count === undefined || employee_count === null) {
    return res.status(400).json({ error: 'Employee count is required' });
  }

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  const parsed = Number(employee_count);
  if (Number.isNaN(parsed) || parsed < 1) {
    return res.status(400).json({ error: 'Employee count must be a positive number' });
  }

  // Verify the employee is a non-worker
  db.get('SELECT employee_type FROM employees WHERE id = ?', [id], (err, employee) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    if (employee.employee_type !== 'non_worker') {
      return res.status(400).json({ error: 'Employee count can only be updated for non-workers' });
    }

    db.run(
      `INSERT INTO daily_employee_counts (employee_id, date, count, created_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(employee_id, date) DO UPDATE SET count = excluded.count`,
      [id, date, parsed, req.user.id],
      function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Daily employee count updated successfully' });
      }
    );
  });
});

// Get daily employee counts for a date range
router.get('/sector/:sectorId/daily-counts', authenticate, (req, res) => {
  const { sectorId } = req.params;
  const { date, startDate, endDate } = req.query;

  let query = `
    SELECT dec.employee_id, dec.date, dec.count
    FROM daily_employee_counts dec
    INNER JOIN employees e ON dec.employee_id = e.id
    WHERE e.sector_id = ? AND e.employee_type = 'non_worker'
  `;
  const params = [sectorId];

  if (date) {
    query += ' AND dec.date = ?';
    params.push(date);
  } else if (startDate && endDate) {
    query += ' AND dec.date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  db.all(query, params, (err, counts) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(counts);
  });
});

// Delete employee (User 1 only)
router.delete('/:id', authenticate, requireRole(['user1']), (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM employees WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  });
});

module.exports = router;

