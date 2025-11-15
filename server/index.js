const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const advanceRoutes = require('./routes/advance');
const sectorRoutes = require('./routes/sectors');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/advance', advanceRoutes);
app.use('/api/sectors', sectorRoutes);
app.use('/api/admin', adminRoutes);

// Initialize database
const db = require('./database/db');
db.init().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

